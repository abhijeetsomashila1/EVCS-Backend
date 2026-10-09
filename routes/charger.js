const express = require("express");
const router = express.Router();

const DUMMY_CHARGERS = [
    {
        charger_id: "EV001",
        wisun_id: "WISUN-1234",
        location: "SCRC Lab",
        latitude: 17.445,
        longitude: 78.348,
        status: "AVAILABLE"
    }
];

// GET SINGLE CHARGER STATUS
// Example:
// GET localhost:3000/api/station/status?id=EV001
router.get("/status", async (req, res) => {
    const chargerID = req.query.id;

    const charger = DUMMY_CHARGERS.find(c => c.charger_id === chargerID);
    
    if (!charger) {
        return res.status(404).send({ message: "Charger not found" });
    }

    res.json(charger);
});

// GET ALL CHARGERS
// Example:
// GET localhost:3000/api/station/all
router.get("/all", async (req, res) => {
    res.json(DUMMY_CHARGERS);
});

module.exports = router;