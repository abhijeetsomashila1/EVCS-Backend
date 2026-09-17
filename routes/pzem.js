const express = require("express");
const router = express.Router();
const pool = require("../database");
const fs = require("fs");

// In-memory store for latest PZEM reading
let latestEnergyWh = 0.0;

// Internal function called by server.js when a local UDP METRICS packet arrives
async function handleNewEnergy(energy_Wh) {
    if (energy_Wh === undefined) return;

    latestEnergyWh = parseFloat(energy_Wh);

    // Check if there is an active session with a target
    try {
        const sessionRes = await pool.query(
            "SELECT * FROM charging_sessions WHERE status=$1 LIMIT 1",
            ["Charging"]
        );

        if (sessionRes.rows.length > 0) {
            const session = sessionRes.rows[0];
            const targetUnits = parseFloat(session.amount); // target in kWh (Units)
            const currentUnits = latestEnergyWh / 1000.0;   // Wh → kWh

            if (targetUnits > 0 && currentUnits >= targetUnits) {
                console.log(`[Auto-Stop] Target reached: ${currentUnits.toFixed(3)} >= ${targetUnits} units. Stopping session ${session.session_id}...`);

                // 1. Instantly switch off hardware relay & clear target file
                const { exec } = require("child_process");
                exec('pinctrl set 17 op dl 2>/dev/null || raspi-gpio set 17 op dl 2>/dev/null || python3 -c "import RPi.GPIO as G; G.setwarnings(False); G.setmode(G.BCM); G.setup(17, G.OUT); G.output(17, G.LOW)" 2>/dev/null');
                try {
                    fs.writeFileSync("/tmp/evcs_target.txt", "0.0");
                } catch (e) {
                    console.error("[Auto-Stop] Failed to clear /tmp/evcs_target.txt:", e.message);
                }

                // 2. Update database
                await pool.query(
                    "UPDATE charging_sessions SET status=$1, end_time=CURRENT_TIMESTAMP WHERE session_id=$2",
                    ["Completed", session.session_id]
                );
                await pool.query(
                    "UPDATE chargers SET status=$1 WHERE charger_id=$2",
                    ["AVAILABLE", session.charger_id]
                );

                console.log(`[Auto-Stop] Session ${session.session_id} completed.`);
            }
        }
    } catch (err) {
        console.error("[Auto-Stop] DB check error:", err.message);
    }
}

// GET /api/pzem/latest
// Called by the frontend to get the latest energy reading for the progress bar
router.get("/latest", (req, res) => {
    res.json({ energy_Wh: latestEnergyWh });
});

module.exports = { router, handleNewEnergy };
