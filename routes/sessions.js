const express = require("express");
const router = express.Router();
const pool = require("../database");
const fs = require("fs");
const { exec } = require("child_process");

const TARGET_PATH = "/tmp/evcs_target.txt";

const IS_ACTIVE_LOW = process.env.RELAY_ACTIVE_LOW === "true";

/**
 * Direct, instant GPIO 17 hardware control on Raspberry Pi.
 * Tries pinctrl (Bookworm/Pi 5), raspi-gpio (Bullseye), and Python RPi.GPIO fallback.
 */
function setRelay(turnOn, targetAmount = 0.1) {
    // If active-low, HIGH is OFF and LOW is ON. Otherwise normal active-high.
    const effectiveHigh = IS_ACTIVE_LOW ? !turnOn : turnOn;
    const level = effectiveHigh ? "dh" : "dl";
    const pyVal = effectiveHigh ? "HIGH" : "LOW";
    
    console.log(`[Relay Control] Switching GPIO 17 -> ${turnOn ? "ON" : "OFF"} (pin level: ${level})`);

    // 1. Direct hardware GPIO toggle
    const cmd = `pinctrl set 17 op ${level} 2>/dev/null || raspi-gpio set 17 op ${level} 2>/dev/null || python3 -c "import RPi.GPIO as G; G.setwarnings(False); G.setmode(G.BCM); G.setup(17, G.OUT); G.output(17, G.${pyVal})" 2>/dev/null`;
    exec(cmd, (err) => {
        if (err) {
            console.error("[Relay Control] Hardware switch error:", err.message);
        } else {
            console.log(`[Relay Control] GPIO 17 hardware successfully set to ${turnOn ? "HIGH (ON)" : "LOW (OFF)"}`);
        }
    });

    // 2. Also write target file for Charger_script.py (display & telemetry)
    try {
        const fileVal = turnOn ? (targetAmount || 0.1).toString() : "0.0";
        fs.writeFileSync(TARGET_PATH, fileVal);
        console.log(`[Relay Control] Wrote ${fileVal} to ${TARGET_PATH}`);
    } catch (e) {
        console.error("[Relay Control] Could not write target file:", e.message);
    }
}

// START CHARGING API
router.post("/start", (req, res) => {
    const { user_id, charger_id, amount } = req.body;
    const chargeAmount = parseFloat(amount) || 0.1;

    console.log(`[Start API] Triggered! user_id=${user_id}, charger_id=${charger_id}, amount=${chargeAmount}`);

    // 1. INSTANTLY turn on physical relay on GPIO 17
    setRelay(true, chargeAmount);

    const sessionId = Date.now();

    // 2. Send response IMMEDIATELY back to browser so spinner stops with ZERO delay
    res.json({
        message: "Charging Started",
        session_id: sessionId
    });

    // 3. Log to database in background (non-blocking)
    pool.query(
        "INSERT INTO charging_sessions(user_id, charger_id, status, amount) VALUES($1, $2, $3, $4)",
        [user_id || 1, charger_id || "EV001", "Charging", chargeAmount]
    ).then(() => {
        return pool.query("UPDATE chargers SET status='CHARGING' WHERE charger_id=$1", [charger_id || "EV001"]);
    }).catch((dbErr) => {
        console.warn("[Start API] Background DB logging notice:", dbErr.message);
    });
});

// STOP CHARGING API
router.post("/stop", (req, res) => {
    const { session_id } = req.body;
    console.log(`[Stop API] Triggered for session_id=${session_id}`);

    // 1. INSTANTLY turn off physical relay on GPIO 17
    setRelay(false, 0.0);

    // 2. Respond immediately
    res.json({ message: "Charging Stopped" });

    // 3. Update database in background (non-blocking)
    const updateQuery = session_id
        ? pool.query("UPDATE charging_sessions SET status='Completed', end_time=CURRENT_TIMESTAMP WHERE session_id=$1", [session_id])
        : pool.query("UPDATE charging_sessions SET status='Completed', end_time=CURRENT_TIMESTAMP WHERE status='Charging'");

    updateQuery.then(() => {
        return pool.query("UPDATE chargers SET status='AVAILABLE'");
    }).catch((dbErr) => {
        console.warn("[Stop API] Background DB update notice:", dbErr.message);
    });
});

// AUTO-STOP API
router.post("/stop-active", (req, res) => {
    console.log("[Auto-Stop API] Triggered");

    // 1. INSTANTLY turn off physical relay
    setRelay(false, 0.0);

    // 2. Respond immediately
    res.json({ message: "Session auto-completed" });

    // 3. Update database in background
    pool.query(
        "UPDATE charging_sessions SET status='Completed', end_time=CURRENT_TIMESTAMP WHERE status='Charging'"
    ).then(() => {
        return pool.query("UPDATE chargers SET status='AVAILABLE'");
    }).catch((dbErr) => {
        console.warn("[Auto-Stop API] Background DB notice:", dbErr.message);
    });
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