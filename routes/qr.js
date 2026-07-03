const express = require("express");
const router = express.Router();
const path = require("path");
const pool = require("../database");

router.get("/:charger_id", async (req, res) => {
    const chargerID = req.params.charger_id;

    try {
        const queryRes = await pool.query("SELECT * FROM chargers WHERE charger_id=$1", [chargerID]);

        if (queryRes.rows.length === 0) {
            return res.status(404).send({ message: "Charger not found" });
        }

        const filePath = path.join(__dirname, "../qr", `${chargerID}.png`);
        res.sendFile(filePath);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

module.exports = router;