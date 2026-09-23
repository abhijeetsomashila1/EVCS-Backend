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
router.get("/history", (req, res) => {
    // Dummy charging sessions for demonstration purposes
    res.json([
        {
            session_id: 1005,
            charger_id: "EV001",
            start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            status: "Completed",
            amount: 2.5
        },
        {
            session_id: 1004,
            charger_id: "EV001",
            start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            status: "Completed",
            amount: 1.2
        },
        {
            session_id: 1003,
            charger_id: "EV002",
            start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
            status: "Completed",
            amount: 5.0
        },
        {
            session_id: 1002,
            charger_id: "EV001",
            start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
            status: "Completed",
            amount: 0.8
        },
        {
            session_id: 1001,
            charger_id: "EV001",
            start_time: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
            status: "Completed",
            amount: 3.4
        }
    ]);
});

module.exports = router;