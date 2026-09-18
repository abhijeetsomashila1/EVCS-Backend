const express = require("express");
const router = express.Router();
const { exec } = require("child_process");

// START CHARGING → run evon
router.post("/start", (req, res) => {
    exec("evon", (err, stdout, stderr) => {
        console.log("[Start] evon:", stdout || stderr || err?.message || "done");
    });
    res.json({ message: "Charging Started", session_id: Date.now() });
});

// STOP CHARGING → run evoff
router.post("/stop", (req, res) => {
    exec("evoff", (err, stdout, stderr) => {
        console.log("[Stop] evoff:", stdout || stderr || err?.message || "done");
    });
    res.json({ message: "Charging Stopped" });
});

// RESET → run evoff (used on page load)
router.post("/reset", (req, res) => {
    exec("evoff", (err, stdout, stderr) => {
        console.log("[Reset] evoff:", stdout || stderr || err?.message || "done");
    });
    res.json({ message: "Reset complete" });
});

router.post("/stop-active", (req, res) => {
    exec("evoff", (err, stdout, stderr) => {
        console.log("[Auto-Stop] evoff:", stdout || stderr || err?.message || "done");
    });
    res.json({ message: "Session auto-completed" });
});

router.get("/status", (req, res) => res.json({ status: "OK" }));
router.get("/history", (req, res) => res.json([]));

module.exports = router;