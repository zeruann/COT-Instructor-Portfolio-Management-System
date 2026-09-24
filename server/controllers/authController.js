const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const Instructor = require("../models/Instructor");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const instructor = await Instructor.findOne({ email });
    if (!instructor || !instructor.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const match = await bcrypt.compare(password, instructor.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: instructor._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, instructor: { id: instructor._id, fullName: instructor.fullName, email: instructor.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let instructor = await Instructor.findOne({ email: payload.email });
    if (!instructor) {
      instructor = await Instructor.create({
        fullName: payload.name,
        email: payload.email,
        googleId: payload.sub,
      });
    }

    const token = jwt.sign({ id: instructor._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, instructor: { id: instructor._id, fullName: instructor.fullName, email: instructor.email } });
  } catch (err) {
    res.status(401).json({ message: "Google authentication failed" });
  }
};

exports.logout = (req, res) => {
  res.json({ message: "Logged out successfully" });
};

const { sendEmail } = require("../utils/sendEmail");

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const instructor = await Instructor.findOne({ email });

    // Always respond the same way whether or not the account exists (avoids leaking which emails are registered)
    if (!instructor) {
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    instructor.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    instructor.resetPasswordExpires = Date.now() + 12 * 60 * 60 * 1000; // 12 hours, matches the email text
    await instructor.save();

    const resetLink = `${process.env.CLIENT_URL}/set-new-password/${resetToken}`;

    await sendEmail({
      to: instructor.email,
      subject: "Set your COT Portfolio password",
      html: `
        <p>Hi ${instructor.fullName},</p>
        <p>We received a request to create or update the password for your account.</p>
        <p>If you initiated this request, click below to set your password:</p>
        <p><a href="${resetLink}" style="background:#f97316;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Set Password</a></p>
        <p>This link is unique to you and will expire in 12 hours.</p>
        <p>If you did not request this, you can safely disregard this email.</p>
      `,
    });

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const instructor = await Instructor.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!instructor) return res.status(400).json({ message: "Token invalid or expired" });

    instructor.password = await bcrypt.hash(newPassword, 10);
    instructor.resetPasswordToken = undefined;
    instructor.resetPasswordExpires = undefined;
    await instructor.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};