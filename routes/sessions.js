const express = require("express");
const router = express.Router();
const pool = require("../database");
const { exec } = require("child_process");
const path = require("path");

// Helper to execute local shell scripts in the backend folder
function executeShellScript(scriptName) {
    // The backend root folder (one directory up from routes/)
    const scriptPath = path.join(__dirname, "..", scriptName);
    
    // We execute it using bash. (On Windows you can also use just the scriptPath, but since it's an .sh file bash is safer if running under WSL/Linux)
    exec(`bash "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`[Shell Script] Error executing ${scriptName}:`, error);
            return;
        }
        if (stderr) {
            console.error(`[Shell Script] stderr from ${scriptName}:`, stderr);
        }
        console.log(`[Shell Script] stdout from ${scriptName}:`, stdout);
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

        executeShellScript("evon.sh");

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
            executeShellScript("evoff.sh");
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