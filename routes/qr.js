const express = require("express");
const router = express.Router();
const path = require("path");
const db = require("../database");

router.get("/:charger_id", (req, res) => {
    const chargerID = req.params.charger_id;

    const checkQuery = "SELECT * FROM chargers WHERE charger_id=?";

    db.get(checkQuery, [chargerID], (error, row) => {
        if (error) {
            return res.status(500).send(error);
        }

        if (!row) {
            return res.status(404).send({ message: "Charger not found" });
        }

        const filePath = path.join(__dirname, "../qr", `${chargerID}.png`);
        res.sendFile(filePath);
    });
});

module.exports = router;