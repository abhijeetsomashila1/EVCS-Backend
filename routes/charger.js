const express = require("express");
const router = express.Router();
const db = require("../database");

// GET SINGLE CHARGER STATUS
// Example:
// GET localhost:3000/api/station/status?id=EV001
router.get("/status", (req, res) => {
    const chargerID = req.query.id;

    const query = "SELECT * FROM chargers WHERE charger_id = ?";

    db.get(query, [chargerID], (error, row) => {
        if (error) {
            return res.status(500).send(error);
        }

        if (!row) {
            return res.status(404).send({ message: "Charger not found" });
        }

        res.json(row);
    });
});

// GET ALL CHARGERS
// Example:
// GET localhost:3000/api/station/all
router.get("/all", (req, res) => {
    const query = "SELECT * FROM chargers";

    db.all(query, [], (error, rows) => {
        if (error) {
            return res.status(500).send(error);
        }

        res.json(rows);
    });
});

module.exports = router;