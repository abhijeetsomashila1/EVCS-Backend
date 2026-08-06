const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const path = require("path");
const pool = require("../database");
const fs = require("fs");

// In-memory store for latest PZEM reading
let latestEnergyWh = 0.0;

// Helper to execute evoff.sh
function executeEvOff() {
    const scriptPath = path.join(__dirname, "..", "evoff.sh");
    exec(`bash "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error("[Auto-Stop] Error executing evoff.sh:", error);
            return;
        }
        console.log("[Auto-Stop] evoff.sh executed successfully. Relay OFF.");
    });
}

// Internal function called by server.js when a Wi-SUN UDP METRICS packet arrives
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

                // 1. Run evoff.sh to physically turn off the relay
                executeEvOff();

                // 2. Update database
                await pool.query(
                    "UPDATE charging_sessions SET status=$1, end_time=CURRENT_TIMESTAMP WHERE session_id=$2",
                    ["Completed", session.session_id]
                );
                await pool.query(
                    "UPDATE chargers SET status=$1 WHERE charger_id=$2",
                    ["AVAILABLE", session.charger_id]
                );

                // 3. Clear the target file
                try {
                    if (fs.existsSync("/tmp/evcs_target.txt")) {
                        fs.writeFileSync("/tmp/evcs_target.txt", "0.0");
                    }
                } catch (e) {}

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
