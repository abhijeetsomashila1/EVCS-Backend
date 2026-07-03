const express = require("express");
const router = express.Router();
const pool = require("../database");
const dgram = require("dgram");

// Helper to send Wi-SUN UDP packet
function sendWisunCommand(command, ipv6Address = "fd12:3456::1") {
    const client = dgram.createSocket("udp6");
    const message = Buffer.from(command);
    client.send(message, 5001, ipv6Address, (err) => {
        client.close();
        if (err) {
            console.error("Wi-SUN UDP Error:", err);
        } else {
            console.log(`[Wi-SUN] Sent '${command}' to ${ipv6Address} on port 5001`);
        }
    });
}

// START CHARGING API
router.post("/start", async (req, res) => {
    const { user_id, charger_id, amount } = req.body;
    const chargeAmount = amount || 0.1;

    try {
        const userRes = await pool.query("SELECT * FROM users WHERE user_id=$1", [user_id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const chargerRes = await pool.query("SELECT * FROM chargers WHERE charger_id=$1", [charger_id]);
        if (chargerRes.rows.length === 0) {
            return res.status(404).json({ message: "Charger not found" });
        }

        const chargerRow = chargerRes.rows[0];
        if (chargerRow.status !== "AVAILABLE") {
            return res.status(400).json({ message: "Charger is already in use" });
        }

        const sessionRes = await pool.query(
            "INSERT INTO charging_sessions(user_id, charger_id, status) VALUES($1, $2, $3) RETURNING session_id",
            [user_id, charger_id, "Charging"]
        );
        const sessionId = sessionRes.rows[0].session_id;

        await pool.query("UPDATE chargers SET status=$1 WHERE charger_id=$2", ["CHARGING", charger_id]);

        sendWisunCommand(`START:${chargeAmount}`, chargerRow.wisun_id); 

        res.json({
            message: "Charging Started",
            session_id: sessionId
        });
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

// STOP CHARGING API
router.post("/stop", async (req, res) => {
    const { session_id, charger_id } = req.body;

    try {
        const sessionRes = await pool.query("SELECT * FROM charging_sessions WHERE session_id=$1", [session_id]);
        if (sessionRes.rows.length === 0) {
            return res.status(404).json({ message: "Session not found" });
        }

        await pool.query(
            "UPDATE charging_sessions SET status=$1, end_time=CURRENT_TIMESTAMP WHERE session_id=$2",
            ["Completed", session_id]
        );

        await pool.query("UPDATE chargers SET status=$1 WHERE charger_id=$2", ["AVAILABLE", charger_id]);

        const chargerRes = await pool.query("SELECT wisun_id FROM chargers WHERE charger_id=$1", [charger_id]);
        if (chargerRes.rows.length > 0) {
            sendWisunCommand("STOP", chargerRes.rows[0].wisun_id);
        }

        res.json({ message: "Charging Stopped" });
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
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
        console.error(error);
        res.status(500).send(error.message);
    }
});

// GET CHARGING HISTORY API
router.get("/history", async (req, res) => {
    const user_id = req.query.user_id;

    try {
        const historyRes = await pool.query("SELECT * FROM charging_sessions WHERE user_id=$1 ORDER BY start_time DESC", [user_id]);
        res.json(historyRes.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

module.exports = router;