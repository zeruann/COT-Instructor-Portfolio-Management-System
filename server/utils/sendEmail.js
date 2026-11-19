// server/utils/sendEmail.js
const nodemailer = require("nodemailer");
const Setting = require("../models/Setting");
const { getSettingOrEnv } = require("../controllers/settingController");

let cachedTransporter = null;
let cachedCredentials = null;

async function createTransporter(user, pass) {
  return nodemailer.createTransport({
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
}

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

  const transporter = await createTransporter(user, pass);

  cachedTransporter = transporter;
  cachedCredentials = { user, pass };

  return { transporter, user };
}

/**
 * Sends an email unless the "googleMailEnabled" setting is false.
 * Critical admin/system emails (e.g., API Settings OTP) can pass bypassToggle: true
 * and fallbackToDefault: true so admins are never locked out.
 * Returns true if sent, false if skipped.
 */
async function sendEmail({ to, subject, html, bypassToggle = false, fallbackToDefault = false }) {
  if (!bypassToggle) {
    const setting = await Setting.findOne({ key: "googleMailEnabled" });
    if (setting && setting.value === false) {
      console.log(
        `[Google Mail DISABLED] Skipped email to: ${to} | Subject: ${subject}`
      );
      return false; // Don't throw, just skip sending
    }
  }

  try {
    const { transporter, user } = await getTransporter();
    await transporter.sendMail({
      from: `"COT Instructor E-Portfolio" <${user}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    if (fallbackToDefault && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.warn("[Google Mail] Primary SMTP failed, falling back to default .env SMTP:", err.message);
      const fallbackTransporter = await createTransporter(process.env.EMAIL_USER, process.env.EMAIL_PASS);
      await fallbackTransporter.sendMail({
        from: `"COT Instructor E-Portfolio" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      });
      return true;
    }
    throw err;
  }
}

const sendInvitationEmail = async (to, fullName, token, accessSummary = '') => {
  const inviteLink = `${process.env.CLIENT_URL}/accept-invitation/${token}`;

  const accessBlock = accessSummary
    ? `<p style="background:#FFF7ED; border:1px solid #FDBA74; padding:10px 12px; border-radius:8px; color:#9A3412; font-size:13px;"><strong>Administrator Access Granted:</strong> ${accessSummary}</p>`
    : '';

  const sent = await sendEmail({
    to,
    subject: accessSummary
      ? "You've been invited to join as an Instructor with Administrator Access"
      : "You've been invited to join as an Instructor",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color: #F97316;">COT Instructor E-Portfolio Management System</h2>
        <p>Hi ${fullName},</p>
        <p>You have been invited to join the system as an instructor.</p>
        ${accessBlock}
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

const sendAdminAccessEmail = async ({
  to,
  fullName,
  grantedByName = 'Administrator',
  accessSummary,
  isRevoked = false,
  isUpdate = false,
}) => {
  const loginLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
  const subject = isRevoked
    ? 'Your Administrator Access Has Been Revoked'
    : isUpdate
      ? 'Your Administrator Access Permissions Have Been Updated'
      : 'You Have Been Granted Administrator Access';

  const bodyCopy = isRevoked
    ? `<p><strong>${grantedByName}</strong> has revoked your delegated Administrator access. You can continue using the system in Instructor mode.</p>`
    : `<p><strong>${grantedByName}</strong> has ${isUpdate ? 'updated your' : 'invited you with'} Administrator access in the COT Instructor E-Portfolio Management System.</p>
       <p style="background:#FFF7ED; border:1px solid #FDBA74; padding:10px 12px; border-radius:8px; color:#9A3412; font-size:13px;"><strong>Access Level:</strong> ${accessSummary}</p>
       <p style="font-size:13px; color:#4B5563;">To enter Administrator mode, sign in and select <strong>Switch to Administrator</strong> from your profile menu.</p>`;

  const sent = await sendEmail({
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto;">
        <h2 style="color: #2E2A72;">COT Instructor E-Portfolio Management System</h2>
        <p>Hi ${fullName},</p>
        ${bodyCopy}
        <a href="${loginLink}" style="display:inline-block; background:#F97316; color:white; padding:10px 20px; border-radius:999px; text-decoration:none; margin-top:10px;">
          Open System
        </a>
      </div>
    `,
  });

  return sent;
};

module.exports = { sendEmail, sendInvitationEmail, sendAdminAccessEmail };
