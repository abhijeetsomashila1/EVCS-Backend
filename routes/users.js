const express = require("express");
const router = express.Router();
const db = require("../database");

// LOGIN API
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    const query = "SELECT * FROM users WHERE email=? AND password=?";

    db.get(query, [email, password], (error, row) => {
        if (error) {
            return res.status(500).send(error);
        }

        if (!row) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        res.json({
            message: "Login successful",
            user_id: row.user_id,
            name: row.name,
            email: row.email
        });
    });
});

// REGISTER / LOGIN USER API
router.post("/register-login", (req, res) => {
    const { name, email, phone } = req.body;

    const checkQuery = "SELECT * FROM users WHERE email=?";

    db.get(checkQuery, [email], (error, row) => {
        if (error) {
            return res.status(500).send(error);
        }

        if (row) {
            return res.json({
                message: "User already exists",
                user_id: row.user_id
            });
        }

        const insertQuery = "INSERT INTO users(name, email, phone) VALUES(?, ?, ?)";

        db.run(insertQuery, [name, email, phone], function(error) {
            if (error) {
                return res.status(500).send(error);
            }

            res.json({
                message: "User created",
                user_id: this.lastID
            });
        });
    });
});

// GET USER PROFILE API
router.get("/user", (req, res) => {
    const user_id = req.query.id;

    const query = "SELECT * FROM users WHERE user_id=?";

    db.get(query, [user_id], (error, row) => {
        if (error) {
            return res.status(500).send(error);
        }

        if (!row) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(row);
    });
});

module.exports = router;