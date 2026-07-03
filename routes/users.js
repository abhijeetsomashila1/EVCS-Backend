const express = require("express");
const router = express.Router();
const pool = require("../database");

// LOGIN API
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const queryRes = await pool.query("SELECT * FROM users WHERE email=$1 AND password=$2", [email, password]);

        if (queryRes.rows.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const row = queryRes.rows[0];
        res.json({
            message: "Login successful",
            user_id: row.user_id,
            name: row.name,
            email: row.email
        });
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

// REGISTER / LOGIN USER API
router.post("/register-login", async (req, res) => {
    const { name, email, phone } = req.body;

    try {
        const checkRes = await pool.query("SELECT * FROM users WHERE email=$1", [email]);

        if (checkRes.rows.length > 0) {
            return res.json({
                message: "User already exists",
                user_id: checkRes.rows[0].user_id
            });
        }

        const insertRes = await pool.query(
            "INSERT INTO users(name, email, phone) VALUES($1, $2, $3) RETURNING user_id",
            [name, email, phone]
        );

        res.json({
            message: "User created",
            user_id: insertRes.rows[0].user_id
        });
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

// GET USER PROFILE API
router.get("/user", async (req, res) => {
    const user_id = req.query.id;

    try {
        const queryRes = await pool.query("SELECT * FROM users WHERE user_id=$1", [user_id]);

        if (queryRes.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(queryRes.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

module.exports = router;