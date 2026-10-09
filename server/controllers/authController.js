const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const Instructor = require('../models/Instructor');
const { sendEmail } = require('../utils/sendEmail');
const { isPasswordValid } = require('../utils/passwordRules');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Shared by login, googleLogin and forgotPassword.
// Admins and Google users were never invited, so `status` is empty for them.
const canSignIn = (user) =>
  user.accountStatus === 'Active' && (!user.status || user.status === 'Accepted');

// One place to build the token so login and googleLogin stay identical.
// `name` is what sendInvitation reads as req.user.name for "invited by".
const signToken = (user) =>
  jwt.sign(
    { id: user._id, accountType: user.accountType, name: user.fullName },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

const publicInstructor = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  accountType: user.accountType,
  accountStatus: user.accountStatus,
  onlineStatus: user.onlineStatus,
});

/* ------------------------------ Login ------------------------------ */

exports.login = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const { password } = req.body;

    const instructor = await Instructor.findOne({ email });

    // Same message for unknown email, no password set, or wrong password
    if (!instructor || !instructor.password || !password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, instructor.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Only after the password is correct do we reveal account state
    if (!canSignIn(instructor)) {
      return res.status(403).json({
        message: 'Your account is not active. Please contact the administrator.',
      });
    }

    if (!['Administrator', 'Instructor'].includes(instructor.accountType)) {
      return res.status(403).json({ message: 'Invalid account type.' });
    }

    const token = signToken(instructor);

    instructor.onlineStatus = 'Online';
    await instructor.save();

    res.json({ token, instructor: publicInstructor(instructor) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Missing Google credential.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload.email_verified) {
      return res.status(403).json({ message: 'Your Google email is not verified.' });
    }

    const email = payload.email.toLowerCase();
    const instructor = await Instructor.findOne({ email });

    // No auto-creating accounts: Google sign-in is only for people already set up
    if (!instructor || !canSignIn(instructor)) {
      return res.status(403).json({
        message:
          'This Google account is not registered or has not finished setup. Use your invitation link.',
      });
    }

    if (!instructor.googleId) {
      instructor.googleId = payload.sub;
    }
    instructor.onlineStatus = 'Online';
    await instructor.save();

    const token = signToken(instructor);

    res.json({ token, instructor: publicInstructor(instructor) });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ message: 'Google authentication failed' });
  }
};

// Add the auth middleware to this route so req.user exists:
// router.post('/logout', auth, logout)
exports.logout = async (req, res) => {
  try {
    if (req.user?.id) {
      await Instructor.updateOne({ _id: req.user.id }, { $set: { onlineStatus: 'Offline' } });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.json({ message: 'Logged out successfully' });
  }
};

/* ------------------------- Password reset -------------------------- */

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
        <p>This link will expire on <strong>${expiryText}</strong> (1 hour from this request).</p>
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

    // Server-side password rule enforcement (same rules as the checklist)
    if (!isPasswordValid(newPassword)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const instructor = await Instructor.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!instructor) {
      return res.status(400).json({ message: 'Token invalid or expired' });
    }

    instructor.password = await bcrypt.hash(newPassword, 10);
    instructor.resetPasswordToken = undefined;
    instructor.resetPasswordExpires = undefined;
    await instructor.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};