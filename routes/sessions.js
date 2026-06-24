const express = require("express");
const router = express.Router();
const db = require("../database");
const dgram = require("dgram");

// Helper to send Wi-SUN UDP packet
function sendWisunCommand(command, ipv6Address = "fd12:3456::1") {
    const client = dgram.createSocket("udp6");
    const message = Buffer.from(command);
    client.send(message, 5001, ipv6Address, (err) => {
        client.close();
        if (err) {
            console.error("Wi-SUN UDP Error:", err);
        } else {
            console.log(`[Wi-SUN] Sent '${command}' to ${ipv6Address} on port 5001`);
        }
    });
}



// START CHARGING API


router.post("/start", (req, res) => {

    const { user_id, charger_id } = req.body;

    const userQuery = "SELECT * FROM users WHERE user_id=$1";

    db.query(userQuery, [user_id], (error, userResult) => {

        if (error) {
            return res.status(500).send(error);
        }

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const chargerQuery = "SELECT * FROM chargers WHERE charger_id=$1";

        db.query(chargerQuery, [charger_id], (error, chargerResult) => {

            if (error) {
                return res.status(500).send(error);
            }

            if (chargerResult.rows.length === 0) {
                return res.status(404).json({ message: "Charger not found" });
            }

            if (chargerResult.rows[0].status !== "AVAILABLE") {
                return res.status(400).json({ message: "Charger is already in use" });
            }

            const sessionQuery =
                "INSERT INTO charging_sessions(user_id, charger_id, status) VALUES($1, $2, $3) RETURNING session_id";

            db.query(sessionQuery, [user_id, charger_id, "Charging"], (error, result) => {

                if (error) {
                    return res.status(500).send(error);
                }

                const updateQuery = "UPDATE chargers SET status=$1 WHERE charger_id=$2";

                db.query(updateQuery, ["CHARGING", charger_id], (error) => {

                    if (error) {
                        return res.status(500).send(error);
                    }

                    sendWisunCommand("START", chargerResult.rows[0].wisun_id); // Trigger Wi-SUN relay hardware

                    res.json({
                        message: "Charging Started",
                        session_id: result.rows[0].session_id
                    });

                });

            });

        });

    });

});



// STOP CHARGING API


router.post("/stop", (req, res) => {

    const { session_id, charger_id } = req.body;

    const sessionQuery = "SELECT * FROM charging_sessions WHERE session_id=$1";

    db.query(sessionQuery, [session_id], (error, sessionResult) => {

        if (error) {
            return res.status(500).send(error);
        }

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ message: "Session not found" });
        }

        const updateSession =
            "UPDATE charging_sessions SET status=$1, end_time=NOW() WHERE session_id=$2";

        db.query(updateSession, ["Completed", session_id], (error) => {

            if (error) {
                return res.status(500).send(error);
            }

            const updateCharger = "UPDATE chargers SET status=$1 WHERE charger_id=$2";

            db.query(updateCharger, ["AVAILABLE", charger_id], (error) => {

                if (error) {
                    return res.status(500).send(error);
                }

                // Trigger Wi-SUN relay hardware by fetching the IP
                db.query("SELECT wisun_id FROM chargers WHERE charger_id=$1", [charger_id], (err, resWisun) => {
                    if (!err && resWisun.rows.length > 0) {
                        sendWisunCommand("STOP", resWisun.rows[0].wisun_id);
                    }
                });

                res.json({ message: "Charging Stopped" });

            });

        });

    });

});



// GET SESSION STATUS API


router.get("/status", (req, res) => {

    const session_id = req.query.session_id;

    const query = "SELECT * FROM charging_sessions WHERE session_id=$1";

    db.query(query, [session_id], (error, result) => {

        if (error) {
            return res.status(500).send(error);
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Session not found" });
        }

        res.json(result.rows[0]);

    });

});



// GET CHARGING HISTORY API


router.get("/history", (req, res) => {

    const user_id = req.query.user_id;

    const query =
        "SELECT * FROM charging_sessions WHERE user_id=$1 ORDER BY start_time DESC";

    db.query(query, [user_id], (error, result) => {

        if (error) {
            return res.status(500).send(error);
        }

        res.json(result.rows);

    });

});



module.exports = router;