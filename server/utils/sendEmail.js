// server/utils/sendEmail.js
const nodemailer = require("nodemailer");
const Setting = require("../models/Setting");
const { getSettingOrEnv } = require("../controllers/settingController");

let cachedTransporter = null;
let cachedCredentials = null;

/**
 * Creates a transporter with connection pooling or reuses cached transporter
 */
async function getTransporter() {
  const user = await getSettingOrEnv("emailUser", "EMAIL_USER");
  const pass = await getSettingOrEnv("emailPass", "EMAIL_PASS");

  if (!user || !pass) {
    throw new Error("Email credentials are not configured in Settings or .env.");
  }

  // Reuse pooled transporter if credentials haven't changed
  if (
    cachedTransporter &&
    cachedCredentials?.user === user &&
    cachedCredentials?.pass === pass
  ) {
    return { transporter: cachedTransporter, user };
  }

  const transporter = nodemailer.createTransport({
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    family: 4,
    connectionTimeout: 8000,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
    auth: { user, pass },
  });

  cachedTransporter = transporter;
  cachedCredentials = { user, pass };

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

  const sent = await sendEmail({
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

  if (!sent) {
    const error = new Error('Google Mail is disabled in administrator settings.');
    error.code = 'GOOGLE_MAIL_DISABLED';
    throw error;
  }

  return true;
};

module.exports = { sendEmail, sendInvitationEmail };
