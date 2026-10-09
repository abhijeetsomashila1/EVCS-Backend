const express = require("express");
const router = express.Router();
const fs = require("fs");

// In-memory store for latest PZEM reading
let latestEnergyWh = 0.0;

// Internal function called by server.js when a local UDP METRICS packet arrives
async function handleNewEnergy(energy_Wh) {
    if (energy_Wh === undefined) return;

    latestEnergyWh = parseFloat(energy_Wh);
    
    // Auto-stop logic based on energy target was previously handled here via Postgres.
    // This is now purely handled by the frontend timer which calls /api/session/stop.
}

// GET /api/pzem/latest
// Called by the frontend to get the latest energy reading for the progress bar
router.get("/latest", (req, res) => {
    res.json({ energy_Wh: latestEnergyWh });
});

module.exports = { router, handleNewEnergy };
