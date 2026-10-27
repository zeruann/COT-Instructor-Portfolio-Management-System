// server/utils/sendEmail.js
const nodemailer = require("nodemailer");
const Setting = require("../models/Setting");
const { getSettingOrEnv } = require("../controllers/settingController");

/**
 * Creates a transporter with current database credentials or .env fallback
 */
async function getTransporter() {
  const user = await getSettingOrEnv("emailUser", "EMAIL_USER");
  const pass = await getSettingOrEnv("emailPass", "EMAIL_PASS");

  if (!user || !pass) {
    throw new Error("Email credentials are not configured in Settings or .env.");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    family: 4,
    connectionTimeout: 10000,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
    auth: { user, pass },
  });

  return { transporter, user };
}

/**
 * Sends an email unless the "googleMailEnabled" setting is false.
 * Returns true if sent, false if skipped.
 */
async function sendEmail({ to, subject, html }) {
  const setting = await Setting.findOne({ key: "googleMailEnabled" });
  if (setting && setting.value === false) {
    console.log(
      `[Google Mail DISABLED] Skipped email to: ${to} | Subject: ${subject}`
    );
    return false; // Don't throw, just skip sending
  }

  const { transporter, user } = await getTransporter();

  await transporter.sendMail({
    from: `"COT Instructor Portfolio" <${user}>`,
    to,
    subject,
    html,
  });

  return true;
}

const sendInvitationEmail = async (to, fullName, token) => {
  const inviteLink = `${process.env.CLIENT_URL}/accept-invitation/${token}`;

  return sendEmail({
    to,
    subject: "You've been invited to join as an Instructor",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color: #F97316;">COT Instructor Portfolio Management System</h2>
        <p>Hi ${fullName},</p>
        <p>You have been invited to join the system as an instructor.</p>
        <a href="${inviteLink}" style="display:inline-block; background:#F97316; color:white; padding:10px 20px; border-radius:999px; text-decoration:none; margin-top:10px;">
          Review Invitation
        </a>
        <p style="color:#888; font-size:12px; margin-top:20px;">This invitation expires in 7 days.</p>
      </div>
    `,
  });
};

module.exports = { sendEmail, sendInvitationEmail };