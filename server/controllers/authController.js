const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const Instructor = require("../models/Instructor");
const { sendEmail } = require("../utils/sendEmail");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find the account in MongoDB using the email
    const instructor = await Instructor.findOne({ email });
    console.log("LOGIN ACCOUNT:", instructor);

    // Account does not exist
    if (!instructor) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 2. Check if the account has a password
    if (!instructor.password) {
      return res.status(401).json({
        message: "This account does not have a password.",
      });
    }

    // 3. Check if the password is correct
    const match = await bcrypt.compare(password, instructor.password);

    if (!match) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 4. Check if the account is active
    if (instructor.accountStatus !== "Active") {
      return res.status(403).json({
        message:
          "Your account is not active. Please contact the administrator.",
      });
    }

    // 5. Check if the account type is valid
    if (
      instructor.accountType !== "Administrator" &&
      instructor.accountType !== "Instructor"
    ) {
      return res.status(403).json({
        message: "Invalid account type.",
      });
    }

    // 6. Create JWT token
    const token = jwt.sign(
      {
        id: instructor._id,
        accountType: instructor.accountType,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    // 7. Set account to Online
    instructor.onlineStatus = "Online";
    await instructor.save();

    // 8. Return account information
    res.json({
      token,
      instructor: {
        id: instructor._id,
        fullName: instructor.fullName,
        email: instructor.email,
        accountType: instructor.accountType,
        accountStatus: instructor.accountStatus,
        onlineStatus: instructor.onlineStatus,
      },
    });
  } catch (err) {
    console.error("Login error:", err);

    res.status(500).json({
      message: err.message,
    });
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

    const token = jwt.sign(
      { id: instructor._id, accountType: instructor.accountType },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      instructor: {
        id: instructor._id,
        fullName: instructor.fullName,
        email: instructor.email,
        accountType: instructor.accountType,
        accountStatus: instructor.accountStatus,
        onlineStatus: instructor.onlineStatus,
      },
    });
  } catch (err) {
    res.status(401).json({ message: "Google authentication failed" });
  }
};

exports.logout = (req, res) => {
  res.json({ message: "Logged out successfully" });
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const instructor = await Instructor.findOne({ email });

    if (!instructor) {
      return res.status(404).json({ message: "Email not registered" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour from now

    instructor.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    instructor.resetPasswordExpires = expiresAt;
    await instructor.save();

    const resetLink = `${process.env.CLIENT_URL}/set-new-password/${resetToken}`;

    const expiryText = new Date(expiresAt).toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Manila",
    });

    await sendEmail({
      to: instructor.email,
      subject: "Set your COT Portfolio password",
      html: `
        <p>Hi ${instructor.fullName},</p>
        <p>We received a request to update the password for your account.</p>
        <p>If you initiated this request, click below to set your password:</p>
        <p><a href="${resetLink}" style="background:#f97316;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Set Password</a></p>
        <p>This link is valid for <strong>1 hour</strong> and will expire at ${expiryText}.</p>
        <p>If you did not request this, you can safely disregard this email.</p>
      `,
    });

    res.json({ message: "Reset link sent to your email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Server-side password rule enforcement
    const passwordRules = [
      { test: (pw) => pw.length >= 8, message: "Password must be at least 8 characters" },
      { test: (pw) => /[A-Z]/.test(pw), message: "Password must contain an uppercase letter" },
      { test: (pw) => /[a-z]/.test(pw), message: "Password must contain a lowercase letter" },
      { test: (pw) => /[0-9]/.test(pw), message: "Password must contain a number" },
      { test: (pw) => /[^A-Za-z0-9]/.test(pw), message: "Password must contain a special character" },
    ];

    for (const rule of passwordRules) {
      if (!rule.test(newPassword)) {
        return res.status(400).json({ message: rule.message });
      }
    }

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