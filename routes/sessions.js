const express = require("express");
const router = express.Router();
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const TARGET_PATH = "/tmp/evcs_target.txt";
const EVON_SCRIPT  = "/usr/bin/evon"; // Physically turns the relay ON
const EVOFF_SCRIPT = "/usr/bin/evoff";  // Physically turns the relay OFF

// START CHARGING — fires relay immediately, no database involved
router.post("/start", (req, res) => {
    const { amount } = req.body;
    const chargeAmount = parseFloat(amount) || 0.1;

    console.log(`[Start] Firing evon — amount=${chargeAmount}`);
    exec(`"${EVON_SCRIPT}"`, (err, stdout) => {
        if (err) console.error("[Start] evon error:", err.message);
        else console.log("[Start] evon:", stdout ? stdout.trim() : "Success");
    });

    try { fs.writeFileSync(TARGET_PATH, chargeAmount.toString()); } catch (e) {}

    return res.json({ message: "Charging Started", session_id: Date.now() });
});

// STOP CHARGING — fires relay off immediately, no database involved
router.post("/stop", (req, res) => {
    console.log("[Stop] Firing evoff");
    exec(`"${EVOFF_SCRIPT}"`, (err, stdout) => {
        if (err) console.error("[Stop] evoff error:", err.message);
        else console.log("[Stop] evoff:", stdout ? stdout.trim() : "Success");
    });

    try { fs.writeFileSync(TARGET_PATH, "0.0"); } catch (e) {}

    return res.json({ message: "Charging Stopped" });
});

// AUTO-STOP
router.post("/stop-active", (req, res) => {
    console.log("[Auto-Stop] Firing evoff");
    exec(`"${EVOFF_SCRIPT}"`, (err, stdout) => {
        if (err) console.error("[Auto-Stop] evoff error:", err.message);
        else console.log("[Auto-Stop] evoff:", stdout ? stdout.trim() : "Success");
    });

    try { fs.writeFileSync(TARGET_PATH, "0.0"); } catch (e) {}

    return res.json({ message: "Session auto-completed" });
});

// STATUS (stub)
router.get("/status", (req, res) => {
    res.json({ status: "OK" });
});

// HISTORY (stub)
router.get("/history", (req, res) => {
    res.json([]);
});

module.exports = router;