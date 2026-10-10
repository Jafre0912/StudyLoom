const express = require("express");
const router = express.Router();
const { signup, login, logout, refresh, getMe, verifyEmail } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", protect, getMe);
router.get("/verify-email", verifyEmail);

module.exports = router;
