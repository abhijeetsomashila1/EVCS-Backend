const express = require("express");
const router = express.Router();
const pool = require("../database");

// GET SINGLE CHARGER STATUS
// Example:
// GET localhost:3000/api/station/status?id=EV001
router.get("/status", async (req, res) => {
    const chargerID = req.query.id;

    try {
        const queryRes = await pool.query("SELECT * FROM chargers WHERE charger_id = $1", [chargerID]);

        if (queryRes.rows.length === 0) {
            return res.status(404).send({ message: "Charger not found" });
        }

        res.json(queryRes.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

// GET ALL CHARGERS
// Example:
// GET localhost:3000/api/station/all
router.get("/all", async (req, res) => {
    try {
        const queryRes = await pool.query("SELECT * FROM chargers");
        res.json(queryRes.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

module.exports = router;