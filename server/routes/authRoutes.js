const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const {
  login, logout, googleLogin, forgotPassword, verifyResetOtp, resetPassword,
} = require("../controllers/authController");

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || null);
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // ignore invalid / expired token on logout
    }
  }
  next();
};

router.post("/login", login);
router.post("/google", googleLogin);
router.post("/logout", optionalAuth, logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password/:token", resetPassword);

module.exports = router;