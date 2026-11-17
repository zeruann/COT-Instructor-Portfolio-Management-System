const { logAudit } = require('../utils/auditLog');
const { ACTION } = require('../constants/auditActions');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const Instructor = require('../models/Instructor');
const Setting = require('../models/Setting');
const { getSettingOrEnv } = require('./settingController');
const { sendEmail } = require('../utils/sendEmail');
const { isPasswordValid } = require('../utils/passwordRules');
const verifyRecaptcha = require('../utils/verifyRecaptcha');

// Note: googleLogin() creates its own OAuth2Client per-request using the DB credential.
// No module-level client needed.

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
  googlePhotoUrl: user.googlePhotoUrl || user.profile?.photoUrl,
  photoUrl: user.profile?.photoUrl || user.googlePhotoUrl,
  profile: user.profile,
});

/* ------------------------------ Login ------------------------------ */

exports.login = async (req, res) => {
  try {

    if (!(await verifyRecaptcha(req.body.captchaToken))) {
      return res.status(400).json({ message: 'reCAPTCHA verification failed. Please try again.' });
    }

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

    await logAudit({
      actor: instructor,
      action: ACTION.LOGIN,
      targetType: 'account',
      targetId: instructor._id,
      targetLabel: instructor.fullName || instructor.email,
      details: 'Logged in via Email',
      req,
    });

    res.json({ token, instructor: publicInstructor(instructor) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const authSetting = await Setting.findOne({ key: 'googleAuthEnabled' });

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Missing Google credential.' });


    }

    const clientId = await getSettingOrEnv('googleClientId', 'GOOGLE_CLIENT_ID');
    const client = new OAuth2Client(clientId);

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
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

    // Administrators remain exempt when Google Sign-In is disabled for general users
    if (authSetting && authSetting.value === false && instructor.accountType !== 'Administrator') {
      return res.status(403).json({
        message: 'Google Sign-In is currently disabled by the administrator.',
      });
    }

    if (!instructor.googleId) {
      instructor.googleId = payload.sub;
    }

    // Save or refresh Google profile information
    if (payload.picture) {
      instructor.googlePhotoUrl = payload.picture;
      if (!instructor.profile) {
        instructor.profile = {};
      }
      if (!instructor.profile.photoUrl || instructor.profile.photoUrl.startsWith('https://lh3.googleusercontent.com')) {
        instructor.profile.photoUrl = payload.picture;
      }
    }

    if (payload.given_name || payload.family_name) {
      if (!instructor.profile) instructor.profile = {};
      if (!instructor.profile.firstName && payload.given_name) {
        instructor.profile.firstName = payload.given_name;
      }
      if (!instructor.profile.lastName && payload.family_name) {
        instructor.profile.lastName = payload.family_name;
      }
    }

    instructor.onlineStatus = 'Online';
    await instructor.save();

    const token = signToken(instructor);

    await logAudit({
      actor: instructor,
      action: ACTION.LOGIN,
      targetType: 'account',
      targetId: instructor._id,
      targetLabel: instructor.fullName || instructor.email,
      details: 'Logged in via Google Sign-In',
      meta: { method: 'google' },
      req,
    });

    res.json({ token, instructor: publicInstructor(instructor) });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ message: 'Google authentication failed' });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.user?.id) {
      const instructor = await Instructor.findById(req.user.id);
      if (instructor) {
        instructor.onlineStatus = 'Offline';
        await instructor.save();

        await logAudit({
          actor: instructor,
          action: ACTION.LOGOUT,
          targetType: 'account',
          targetId: instructor._id,
          targetLabel: instructor.fullName || instructor.email,
          details: 'Logged out of system',
          req,
        });
      }
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.json({ message: 'Logged out successfully' });
  }
};

/* ------------------------- Password reset with OTP -------------------------- */

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Please enter your email address." });
    }

    const instructor = await Instructor.findOne({ email: email.trim().toLowerCase() });
    if (!instructor) {
      return res.status(404).json({ message: "No account found with this email address." });
    }

    // Generate 6-digit numeric OTP (fast delivery, same as API settings)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    // Valid for 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    instructor.resetPasswordOtp = hashedOtp;
    instructor.resetPasswordOtpExpires = expiresAt;
    await instructor.save();

    const formattedExpiry = expiresAt.toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Manila",
    });

    // Send email asynchronously for fast UI response
    sendEmail({
      to: instructor.email,
      subject: "Your Password Reset Verification Code - COT Instructor E-Portfolio",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #ff6900; margin: 0; font-size: 20px; font-weight: 700;">COT Instructor E-Portfolio</h2>
            <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0;">Bukidnon State University</p>
          </div>

          <div style="border-top: 1px solid #f3f4f6; padding-top: 20px; margin-bottom: 20px;">
            <h3 style="color: #111827; font-size: 16px; margin: 0 0 8px 0; font-weight: 600;">Password Reset Verification</h3>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
              Hello <strong>${instructor.fullName || 'User'}</strong>,
            </p>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">
              We received a request to reset your password. Use the 6-digit One-Time PIN (OTP) below to verify your request:
            </p>

            <div style="text-align: center; padding: 18px; background: #fff7ed; border: 1px dashed #fdba74; border-radius: 10px; margin-bottom: 20px;">
              <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #ea580c; font-family: monospace;">
                ${otp}
              </div>
              <div style="font-size: 12px; color: #9a3412; margin-top: 6px;">
                Valid for 5 minutes (expires at ${formattedExpiry})
              </div>
            </div>

            <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 0;">
              If you did not request this verification code, you can safely ignore this email. Your account remains secure.
            </p>
          </div>

          <div style="border-top: 1px solid #f3f4f6; padding-top: 14px; text-align: center; color: #9ca3af; font-size: 11px;">
            Bukidnon State University • College of Technologies
          </div>
        </div>
      `,
    }).catch((err) => {
      console.error("forgotPassword background email error:", err);
    });

    res.json({
      success: true,
      message: "Verification code sent to your email.",
      email: instructor.email,
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    res.status(500).json({ message: err.message || "Failed to send verification code." });
  }
};

exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and verification code are required." });
    }

    if (typeof otp !== "string" || otp.trim().length !== 6) {
      return res.status(400).json({ message: "Please enter a valid 6-digit verification code." });
    }

    const instructor = await Instructor.findOne({ email: email.trim().toLowerCase() });
    if (!instructor) {
      return res.status(404).json({ message: "Account not found." });
    }

    if (!instructor.resetPasswordOtp || !instructor.resetPasswordOtpExpires) {
      return res.status(400).json({ message: "No verification code was requested. Please click send code." });
    }

    if (new Date() > new Date(instructor.resetPasswordOtpExpires)) {
      instructor.resetPasswordOtp = undefined;
      instructor.resetPasswordOtpExpires = undefined;
      await instructor.save();
      return res.status(400).json({ message: "Verification code has expired. Please request a new code." });
    }

    const hashedInput = crypto.createHash("sha256").update(otp.trim()).digest("hex");
    if (hashedInput !== instructor.resetPasswordOtp) {
      return res.status(401).json({ message: "Incorrect verification code. Please check your email and try again." });
    }

    // OTP verified! Generate a short-lived reset token (15 mins) for the password creation step
    const resetToken = crypto.randomBytes(32).toString("hex");
    instructor.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    instructor.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    // Clear OTP so it cannot be reused
    instructor.resetPasswordOtp = undefined;
    instructor.resetPasswordOtpExpires = undefined;
    await instructor.save();

    res.json({
      success: true,
      message: "Code verified successfully.",
      resetToken,
    });
  } catch (err) {
    console.error("verifyResetOtp error:", err);
    res.status(500).json({ message: "Failed to verify code. Please try again." });
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
      return res.status(400).json({ message: 'Session invalid or expired. Please request a new verification code.' });
    }

    instructor.password = await bcrypt.hash(newPassword, 10);
    instructor.resetPasswordToken = undefined;
    instructor.resetPasswordExpires = undefined;
    await instructor.save();

    await logAudit({
      actor: instructor,
      action: ACTION.PASSWORD_RESET,
      targetType: 'account',
      targetId: instructor._id,
      targetLabel: instructor.fullName || instructor.email,
      details: 'Reset password via OTP verification',
      req,
    });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};