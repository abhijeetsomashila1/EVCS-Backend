const express = require("express");
const router = express.Router();
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const TARGET_PATH = "/tmp/evcs_target.txt";
const EVON_SCRIPT  = "/usr/bin/evoff"; // We use evoff here because it physically turns the relay ON
const EVOFF_SCRIPT = "/usr/bin/evon";  // We use evon here because it physically turns the relay OFF

// START CHARGING — fires relay immediately, no database involved
router.post("/start", (req, res) => {
    const { amount } = req.body;
    const chargeAmount = parseFloat(amount) || 0.1;

    console.log(`[Start] Firing evon.sh — amount=${chargeAmount}`);
    exec(`bash "${EVON_SCRIPT}"`, (err, stdout) => {
        if (err) console.error("[Start] evon.sh error:", err.message);
        else console.log("[Start] evon.sh:", stdout.trim());
    });

    try { fs.writeFileSync(TARGET_PATH, chargeAmount.toString()); } catch (e) {}

    return res.json({ message: "Charging Started", session_id: Date.now() });
});

// STOP CHARGING — fires relay off immediately, no database involved
router.post("/stop", (req, res) => {
    console.log("[Stop] Firing evoff.sh");
    exec(`bash "${EVOFF_SCRIPT}"`, (err, stdout) => {
        if (err) console.error("[Stop] evoff.sh error:", err.message);
        else console.log("[Stop] evoff.sh:", stdout.trim());
    });

    try { fs.writeFileSync(TARGET_PATH, "0.0"); } catch (e) {}

    return res.json({ message: "Charging Stopped" });
});

// AUTO-STOP
router.post("/stop-active", (req, res) => {
    console.log("[Auto-Stop] Firing evoff.sh");
    exec(`bash "${EVOFF_SCRIPT}"`, (err, stdout) => {
        if (err) console.error("[Auto-Stop] evoff.sh error:", err.message);
        else console.log("[Auto-Stop] evoff.sh:", stdout.trim());
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