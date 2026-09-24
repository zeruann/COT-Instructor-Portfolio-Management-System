// server/utils/sendEmail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // or use host/port for other providers
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // use an App Password, not your real Gmail password
  },
});

async function sendEmail({ to, subject, html }) {
  await transporter.sendMail({
    from: `"COT Instructor Portfolio" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

const sendInvitationEmail = async (to, fullName, token) => {
  const inviteLink = `${process.env.CLIENT_URL}/accept-invitation/${token}`;

  await transporter.sendMail({
    from: `"COT Instructor Portfolio" <${process.env.EMAIL_USER}>`,
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