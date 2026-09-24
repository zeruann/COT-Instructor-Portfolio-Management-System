// server/controllers/invitationController.js
const Invitation = require('../models/Invitation');
const { sendInvitationEmail } = require("../utils/sendEmail");
// POST /api/invitations
exports.sendInvitation = async (req, res) => {
  try {
    const { fullName, email, department } = req.body;

    // Check for an existing pending invitation to this email
    const existing = await Invitation.findOne({ email, status: 'Pending' });
    if (existing) {
      return res.status(409).json({
        message: `An invitation has already been sent to ${email} and is still pending.`,
      });
    }

    const token = Invitation.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const invitation = await Invitation.create({
      fullName,
      email,
      department,
      token,
      expiresAt,
    });

    await sendInvitationEmail(email, fullName, token);

    res.status(201).json(invitation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send invitation' });
  }
};

// GET /api/invitations
exports.getInvitations = async (req, res) => {
  const invitations = await Invitation.find().sort({ dateSent: -1 });
  res.json(invitations);
};

// GET /api/invitations/token/:token  (for AcceptInvitation.jsx to fetch details)
exports.getInvitationByToken = async (req, res) => {
  const invitation = await Invitation.findOne({ token: req.params.token });

  if (!invitation) return res.status(404).json({ message: 'Invitation not found' });
  if (invitation.expiresAt < new Date()) {
    return res.status(410).json({ message: 'This invitation has expired' });
  }

  res.json(invitation);
};

// PATCH /api/invitations/:token/accept
exports.acceptInvitation = async (req, res) => {
  const invitation = await Invitation.findOneAndUpdate(
    { token: req.params.token },
    { status: 'Accepted' },
    { new: true }
  );
  if (!invitation) return res.status(404).json({ message: 'Invitation not found' });

  // TODO: create the actual Instructor account here using invitation.email/fullName/department

  res.json(invitation);
};

// PATCH /api/invitations/:token/reject
exports.rejectInvitation = async (req, res) => {
  const invitation = await Invitation.findOneAndUpdate(
    { token: req.params.token },
    { status: 'Rejected' },
    { new: true }
  );
  if (!invitation) return res.status(404).json({ message: 'Invitation not found' });

  res.json(invitation);
};

// PATCH /api/invitations/:id/resend
exports.resendInvitation = async (req, res) => {
  const invitation = await Invitation.findById(req.params.id);
  if (!invitation) return res.status(404).json({ message: 'Invitation not found' });

  invitation.status = 'Pending';
  invitation.expiresAt = new Date();
  invitation.expiresAt.setDate(invitation.expiresAt.getDate() + 7);
  await invitation.save();

  await sendInvitationEmail(invitation.email, invitation.fullName, invitation.token);

  res.json(invitation);
};

// DELETE /api/invitations/:id
exports.deleteInvitation = async (req, res) => {
  await Invitation.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
};