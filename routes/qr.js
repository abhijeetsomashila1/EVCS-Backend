const express = require("express");
const router = express.Router();
const path = require("path");

router.get("/:charger_id", async (req, res) => {
    const chargerID = req.params.charger_id;

    try {
        // Without DB, we just serve the QR file for the given ID directly if it exists.
        const filePath = path.join(__dirname, "../qr", `${chargerID}.png`);
        res.sendFile(filePath);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

module.exports = router;