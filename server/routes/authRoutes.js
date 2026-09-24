const express = require("express");
const router = express.Router();
const {
  login, logout, googleLogin, forgotPassword, resetPassword,
} = require("../controllers/authController");

router.post("/login", login);
router.post("/google", googleLogin);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

module.exports = router;