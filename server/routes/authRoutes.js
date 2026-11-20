const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const {
  login, logout, googleLogin, heartbeat, switchMode, forgotPassword, verifyResetOtp, resetPassword,
} = require("../controllers/authController");
const auth = require("../middleware/auth");
const { loginLimiter, forgotPasswordLimiter, switchModeLimiter } = require("../middleware/rateLimiter");

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || null);
  if (token) {
    try {
      // Allow expired tokens on logout so the user is still marked Offline
      req.user = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    } catch {
      // ignore invalid token on logout
    }
  }
  next();
};

router.post("/login", loginLimiter, login);
router.post("/google", googleLogin);
router.post("/logout", optionalAuth, logout);
router.post("/heartbeat", auth, heartbeat);
router.post("/switch-mode", auth, switchModeLimiter, switchMode);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password/:token", resetPassword);

module.exports = router;