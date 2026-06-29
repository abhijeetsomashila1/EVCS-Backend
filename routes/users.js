const express = require("express");
const router = express.Router();
const db = require("../database");



// LOGIN API
// POST /api/auth/login
// Body: { email, password }


router.post("/login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    const query = "SELECT * FROM users WHERE email=$1 AND password=$2";

    db.query(query, [email, password], (error, result) => {

        if (error) {
            return res.status(500).send(error);
        }

        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        res.json({
            message: "Login successful",
            user_id: result.rows[0].user_id,
            name: result.rows[0].name,
            email: result.rows[0].email
        });

    });

});



// REGISTER / LOGIN USER API


router.post("/register-login", (req, res) => {

    const { name, email, phone } = req.body;

    const checkQuery = "SELECT * FROM users WHERE email=$1";

    db.query(checkQuery, [email], (error, result) => {

        if (error) {
            return res.status(500).send(error);
        }

        if (result.rows.length > 0) {
            return res.json({
                message: "User already exists",
                user_id: result.rows[0].user_id
            });
        }

        const insertQuery = "INSERT INTO users(name, email, phone) VALUES($1, $2, $3) RETURNING user_id";

        db.query(insertQuery, [name, email, phone], (error, result) => {

            if (error) {
                return res.status(500).send(error);
            }

            res.json({
                message: "User created",
                user_id: result.rows[0].user_id
            });

        });

    });

});



// GET USER PROFILE API


router.get("/user", (req, res) => {

    const user_id = req.query.id;

    const query = "SELECT * FROM users WHERE user_id=$1";

    db.query(query, [user_id], (error, result) => {

        if (error) {
            return res.status(500).send(error);
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(result.rows[0]);

    });

});



module.exports = router;