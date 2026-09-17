const express = require("express");
const router = express.Router();
const pool = require("../database");
const fs = require("fs");

const TARGET_PATH = "/tmp/evcs_target.txt";

function setTargetAmount(amount) {
    try {
        fs.writeFileSync(TARGET_PATH, amount.toString());
        console.log(`[Target File] Wrote ${amount} to ${TARGET_PATH}`);
    } catch (err) {
        console.error(`[Target File] Error writing to ${TARGET_PATH}:`, err.message);
    }
}

// START CHARGING API
router.post("/start", async (req, res) => {
    const { user_id, charger_id, amount } = req.body;
    const chargeAmount = amount || 0.1;

    console.log(`[Start API] Request received: user_id=${user_id}, charger_id=${charger_id}, amount=${chargeAmount}`);

    try {
        const userRes = await pool.query("SELECT * FROM users WHERE user_id=$1", [user_id]);
        if (userRes.rows.length === 0) {
            console.warn(`[Start API] User ${user_id} not found.`);
            return res.status(404).json({ message: "User not found" });
        }

        const chargerRes = await pool.query("SELECT * FROM chargers WHERE charger_id=$1", [charger_id]);
        if (chargerRes.rows.length === 0) {
            console.warn(`[Start API] Charger ${charger_id} not found.`);
            return res.status(404).json({ message: "Charger not found" });
        }

        const chargerRow = chargerRes.rows[0];
        if (chargerRow.status !== "AVAILABLE") {
            console.warn(`[Start API] Charger ${charger_id} is busy (status: ${chargerRow.status}).`);
            return res.status(400).json({ message: "Charger is already in use" });
        }

        const sessionRes = await pool.query(
            "INSERT INTO charging_sessions(user_id, charger_id, status, amount) VALUES($1, $2, $3, $4) RETURNING session_id",
            [user_id, charger_id, "Charging", chargeAmount]
        );
        const sessionId = sessionRes.rows[0].session_id;

        await pool.query("UPDATE chargers SET status=$1 WHERE charger_id=$2", ["CHARGING", charger_id]);

        // Communicate target amount to Charger_script.py (which turns ON GPIO 17 relay)
        setTargetAmount(chargeAmount);

        console.log(`[Start API] Session ${sessionId} successfully started for charger ${charger_id}.`);

        res.json({
            message: "Charging Started",
            session_id: sessionId
        });
    } catch (error) {
        console.error("[Start API] Error:", error.message || error);
        res.status(500).json({ message: error.message || "Failed to start charging" });
    }
});

// STOP CHARGING API
router.post("/stop", async (req, res) => {
    const { session_id } = req.body;
    console.log(`[Stop API] Request received for session_id=${session_id}`);

    try {
        const sessionRes = await pool.query("SELECT * FROM charging_sessions WHERE session_id=$1", [session_id]);
        if (sessionRes.rows.length === 0) {
            return res.status(404).json({ message: "Session not found" });
        }
        
        const db_charger_id = sessionRes.rows[0].charger_id;

        await pool.query(
            "UPDATE charging_sessions SET status=$1, end_time=CURRENT_TIMESTAMP WHERE session_id=$2",
            ["Completed", session_id]
        );

        await pool.query("UPDATE chargers SET status=$1 WHERE charger_id=$2", ["AVAILABLE", db_charger_id]);

        // Set target to 0.0 so Charger_script.py turns OFF GPIO 17 relay
        setTargetAmount("0.0");

        console.log(`[Stop API] Session ${session_id} stopped.`);
        res.json({ message: "Charging Stopped" });
    } catch (error) {
        console.error("[Stop API] Error:", error.message || error);
        res.status(500).json({ message: error.message || "Failed to stop charging" });
    }
});

// AUTO-STOP: called when energy target is reached
router.post("/stop-active", async (req, res) => {
    try {
        const sessionRes = await pool.query(
            "SELECT * FROM charging_sessions WHERE status=$1 LIMIT 1",
            ["Charging"]
        );
        if (sessionRes.rows.length === 0) {
            return res.status(404).json({ message: "No active session found" });
        }

        const session = sessionRes.rows[0];

        await pool.query(
            "UPDATE charging_sessions SET status=$1, end_time=CURRENT_TIMESTAMP WHERE session_id=$2",
            ["Completed", session.session_id]
        );

        await pool.query("UPDATE chargers SET status=$1 WHERE charger_id=$2", ["AVAILABLE", session.charger_id]);

        // Clear target file so Charger_script.py turns OFF GPIO 17 relay
        setTargetAmount("0.0");

        console.log(`[Auto-Stop] Session ${session.session_id} auto-completed.`);
        res.json({ message: "Session auto-completed", session_id: session.session_id });
    } catch (error) {
        console.error("[Auto-Stop API] Error:", error.message || error);
        res.status(500).json({ message: error.message || "Failed to auto-stop session" });
    }
});

// GET SESSION STATUS API
router.get("/status", async (req, res) => {
    const session_id = req.query.session_id;

    try {
        const sessionRes = await pool.query("SELECT * FROM charging_sessions WHERE session_id=$1", [session_id]);
        if (sessionRes.rows.length === 0) {
            return res.status(404).json({ message: "Session not found" });
        }
        res.json(sessionRes.rows[0]);
    } catch (error) {
        console.error("[Status API] Error:", error.message || error);
        res.status(500).json({ message: error.message || "Failed to get session status" });
    }
});

// GET CHARGING HISTORY API
router.get("/history", async (req, res) => {
    const user_id = req.query.user_id;

    try {
        const historyRes = await pool.query("SELECT * FROM charging_sessions WHERE user_id=$1 ORDER BY start_time DESC", [user_id]);
        res.json(historyRes.rows);
    } catch (error) {
        console.error("[History API] Error:", error.message || error);
        res.status(500).json({ message: error.message || "Failed to get history" });
    }
});

module.exports = router;