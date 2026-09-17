const express = require("express");
const router = express.Router();
const pool = require("../database");
const fs = require("fs");
const { exec } = require("child_process");

const TARGET_PATH = "/tmp/evcs_target.txt";

/**
 * Direct, instant GPIO 17 hardware control on the Raspberry Pi.
 * Tries modern pinctrl (Pi OS Bookworm / Pi 5), raspi-gpio (Bullseye), and Python RPi.GPIO.
 * Also updates /tmp/evcs_target.txt so the LCD display updates.
 */
function setRelay(turnOn, targetAmount = 0.1) {
    const level = turnOn ? "dh" : "dl";
    const pyVal = turnOn ? "HIGH" : "LOW";
    
    console.log(`[Relay Control] Switching GPIO 17 -> ${turnOn ? "ON (HIGH)" : "OFF (LOW)"}`);

    // 1. Direct hardware switch
    const cmd = `pinctrl set 17 op ${level} 2>/dev/null || raspi-gpio set 17 op ${level} 2>/dev/null || python3 -c "import RPi.GPIO as G; G.setwarnings(False); G.setmode(G.BCM); G.setup(17, G.OUT); G.output(17, G.${pyVal})" 2>/dev/null`;
    exec(cmd, (err) => {
        if (err) {
            console.error("[Relay Control] Hardware switch error:", err.message);
        } else {
            console.log(`[Relay Control] GPIO 17 hardware successfully set to ${turnOn ? "HIGH (ON)" : "LOW (OFF)"}`);
        }
    });

    // 2. Update target file for LCD display and telemetry
    try {
        const fileVal = turnOn ? (targetAmount || 0.1).toString() : "0.0";
        fs.writeFileSync(TARGET_PATH, fileVal);
        console.log(`[Relay Control] Wrote ${fileVal} to ${TARGET_PATH}`);
    } catch (e) {
        console.error("[Relay Control] Could not write target file:", e.message);
    }
}

// START CHARGING API
router.post("/start", async (req, res) => {
    const { user_id, charger_id, amount } = req.body;
    const chargeAmount = parseFloat(amount) || 0.1;

    console.log(`[Start API] Triggered! user_id=${user_id}, charger_id=${charger_id}, amount=${chargeAmount}`);

    // 1. INSTANTLY turn on the physical relay on GPIO 17
    setRelay(true, chargeAmount);

    let sessionId = Date.now();

    // 2. Best-effort database recording (will not hang or block the relay)
    try {
        const sessionRes = await pool.query(
            "INSERT INTO charging_sessions(user_id, charger_id, status, amount) VALUES($1, $2, $3, $4) RETURNING session_id",
            [user_id || 1, charger_id || "EV001", "Charging", chargeAmount]
        );
        if (sessionRes.rows.length > 0) {
            sessionId = sessionRes.rows[0].session_id;
        }
        await pool.query("UPDATE chargers SET status='CHARGING' WHERE charger_id=$1", [charger_id || "EV001"]);
    } catch (dbErr) {
        console.warn("[Start API] Database logging warning (relay is ON regardless):", dbErr.message);
    }

    // 3. Immediately return response so frontend spinner stops
    return res.json({
        message: "Charging Started",
        session_id: sessionId
    });
});

// STOP CHARGING API
router.post("/stop", async (req, res) => {
    const { session_id } = req.body;
    console.log(`[Stop API] Triggered for session_id=${session_id}`);

    // 1. INSTANTLY turn off the physical relay on GPIO 17
    setRelay(false, 0.0);

    // 2. Best-effort database update
    try {
        if (session_id) {
            await pool.query(
                "UPDATE charging_sessions SET status='Completed', end_time=CURRENT_TIMESTAMP WHERE session_id=$1",
                [session_id]
            );
        } else {
            await pool.query(
                "UPDATE charging_sessions SET status='Completed', end_time=CURRENT_TIMESTAMP WHERE status='Charging'"
            );
        }
        await pool.query("UPDATE chargers SET status='AVAILABLE'");
    } catch (dbErr) {
        console.warn("[Stop API] Database logging warning (relay is OFF regardless):", dbErr.message);
    }

    return res.json({ message: "Charging Stopped" });
});

// AUTO-STOP API
router.post("/stop-active", async (req, res) => {
    console.log("[Auto-Stop API] Triggered");

    // 1. INSTANTLY turn off physical relay
    setRelay(false, 0.0);

    // 2. Best-effort database update
    try {
        await pool.query(
            "UPDATE charging_sessions SET status='Completed', end_time=CURRENT_TIMESTAMP WHERE status='Charging'"
        );
        await pool.query("UPDATE chargers SET status='AVAILABLE'");
    } catch (dbErr) {
        console.warn("[Auto-Stop API] Database logging warning:", dbErr.message);
    }

    return res.json({ message: "Session auto-completed" });
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
        res.status(500).json({ message: error.message || "Database error" });
    }
});

// GET CHARGING HISTORY API
router.get("/history", async (req, res) => {
    const user_id = req.query.user_id || 1;

    try {
        const historyRes = await pool.query(
            "SELECT * FROM charging_sessions WHERE user_id=$1 ORDER BY start_time DESC",
            [user_id]
        );
        res.json(historyRes.rows);
    } catch (error) {
        res.status(500).json({ message: error.message || "Database error" });
    }
});

module.exports = router;