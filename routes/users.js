const express = require("express");
const router = express.Router();
const db = require("../database");



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