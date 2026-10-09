const express = require("express");
const router = express.Router();

// MOCK: Dummy User DB
const DUMMY_USER = {
    user_id: 1,
    name: "Demo User",
    email: "evcharger@scrc.com"
};

// LOGIN API
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    // Mock Login Logic
    res.json({
        message: "Login successful",
        user_id: DUMMY_USER.user_id,
        name: DUMMY_USER.name,
        email: email
    });
});

// REGISTER / LOGIN USER API
router.post("/register-login", async (req, res) => {
    const { name, email } = req.body;

    res.json({
        message: "User logged in (mocked)",
        user_id: DUMMY_USER.user_id
    });
});

// GET USER PROFILE API
router.get("/user", async (req, res) => {
    // Return dummy user for any requested ID
    res.json(DUMMY_USER);
});

module.exports = router;