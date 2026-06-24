const express = require("express");
const router = express.Router();
const db = require("../database");



// GET SINGLE CHARGER STATUS
// Example:
// GET localhost:3000/api/station/status?id=EV001


router.get("/status", (req, res) => {

    const chargerID = req.query.id;

    const query = "SELECT * FROM chargers WHERE charger_id = $1";

    db.query(query, [chargerID], (error, result) => {

        if (error) {
            return res.status(500).send(error);
        }

        if (result.rows.length === 0) {
            return res.status(404).send({ message: "Charger not found" });
        }

        res.json(result.rows[0]);

    });

});



// GET ALL CHARGERS
// Example:
// GET localhost:3000/api/station/all


router.get("/all", (req, res) => {

    const query = "SELECT * FROM chargers";

    db.query(query, (error, result) => {

        if (error) {
            return res.status(500).send(error);
        }

        res.json(result.rows);

    });

});



module.exports = router;