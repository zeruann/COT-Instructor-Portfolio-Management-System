// server/controllers/invitationController.js
const crypto = require('crypto');
const mongoose = require('mongoose');
const Invitation = require('../models/Invitation');
const { sendInvitationEmail } = require("../utils/sendEmail");

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (matches the email text)
const MAX_RESENDS = 1; // an invitation can only be resent once

const newToken = () => crypto.randomBytes(32).toString('hex');
const newExpiry = () => new Date(Date.now() + INVITATION_TTL_MS);

// Never send the token back to the admin UI
const withoutToken = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  delete obj.token;
  delete obj.__v;
  return obj;
};

// Flip any Pending invitation past its expiry date to Expired
const expireStale = () =>
  Invitation.updateMany(
    { status: 'Pending', expiresAt: { $lt: new Date() } },
    { $set: { status: 'Expired' } }
  );

const STATUS_MESSAGES = {
  Accepted: 'This invitation has already been accepted.',
  Rejected: 'This invitation was already declined.',
  Expired: 'This invitation has expired.',
};

/* ---------------------------- Admin side ---------------------------- */
// POST /api/invitations
exports.sendInvitation = async (req, res) => {
  try {
    const { fullName, email, department } = req.body;

    if (!fullName || !email || !department) {
      return res
        .status(400)
        .json({ message: 'Full name, email, and department are required.' });
    }

    await expireStale();

    // One invitation per email, whatever its status (case-insensitive).
    // Rejected/Expired ones are re-invited through Resend, not a new invitation.
    const existing = await Invitation.findOne({ email: email.trim() }).collation({
      locale: 'en',
      strength: 2,
    });

    if (existing) {
      const messages = {
        Pending: 'This email already has a pending invitation.',
        Accepted: 'This instructor has already accepted an invitation.',
        Rejected: 'This email was already invited and declined. Use Resend on the existing invitation instead.',
        Expired: 'This email was already invited and the invitation expired. Use Resend on the existing invitation instead.',
      };
      return res.status(409).json({ message: messages[existing.status] });
    }

    const invitation = await Invitation.create({
      token: newToken(),
      fullName,
      email,
      department,
      invitedBy: req.user?.name || 'Administrator', // adjust if you have auth
      expiresAt: newExpiry(),
    });

    try {
      await sendInvitationEmail(invitation.email, invitation.fullName, invitation.token);
    } catch (emailErr) {
      console.error('Failed to send invitation email:', emailErr);
      // Don't leave an invitation behind that nobody received
      await Invitation.findByIdAndDelete(invitation._id);
      return res
        .status(502)
        .json({ message: 'The invitation email could not be sent. Check the email address and try again.' });
    }

    res.status(201).json(withoutToken(invitation));
  } catch (err) {
    console.error('sendInvitation error:', err);
    res.status(500).json({ message: 'Something went wrong while sending the invitation.' });
  }
};

// GET /api/invitations
exports.getInvitations = async (req, res) => {
  try {
    await expireStale();
    const invitations = await Invitation.find().select('-token -__v').sort({ dateSent: -1 });
    res.json(invitations);
  } catch (err) {
    console.error('getInvitations error:', err);
    res.status(500).json({ message: 'Failed to load invitations.' });
  }
};

// PATCH /api/invitations/:id/resend
// Only Rejected or Expired invitations, and only MAX_RESENDS times.
// Rotates the token so the old link stops working.
exports.resendInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid invitation id.' });
    }

    const token = newToken();

    // Atomic: two quick clicks can't both pass this filter
    const original = await Invitation.findOneAndUpdate(
      {
        _id: id,
        status: { $in: ['Rejected', 'Expired'] },
        resendCount: { $lt: MAX_RESENDS },
      },
      {
        $set: {
          token,
          status: 'Pending',
          dateSent: new Date(),
          expiresAt: newExpiry(),
          respondedAt: null,
        },
        $inc: { resendCount: 1 },
      },
      { new: false } // returns the pre-update document so we can roll back
    );

    if (!original) {
      const current = await Invitation.findById(id);
      if (!current) return res.status(404).json({ message: 'Invitation not found.' });
      if (current.resendCount >= MAX_RESENDS) {
        return res.status(409).json({ message: 'This invitation has already been resent once.' });
      }
      return res
        .status(409)
        .json({ message: 'Only rejected or expired invitations can be resent.' });
    }

    try {
      await sendInvitationEmail(original.email, original.fullName, token);
    } catch (emailErr) {
      console.error('Failed to resend invitation email:', emailErr);
      // Roll back so the admin can try again
      await Invitation.updateOne(
        { _id: id },
        {
          $set: {
            token: original.token,
            status: original.status,
            dateSent: original.dateSent,
            expiresAt: original.expiresAt,
            respondedAt: original.respondedAt ?? null,
            resendCount: original.resendCount,
          },
        }
      );
      return res.status(502).json({ message: 'The invitation email could not be sent. Try again.' });
    }

    const updated = await Invitation.findById(id);
    res.json(withoutToken(updated));
  } catch (err) {
    console.error('resendInvitation error:', err);
    res.status(500).json({ message: 'Something went wrong while resending the invitation.' });
  }
};

// DELETE /api/invitations/:id  (Rejected only, same as the UI)
exports.deleteInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid invitation id.' });
    }

    const deleted = await Invitation.findOneAndDelete({ _id: id, status: 'Rejected' });
    if (!deleted) {
      return res
        .status(404)
        .json({ message: 'Only rejected invitations can be deleted, or it no longer exists.' });
    }

    res.json({ message: 'Invitation deleted.' });
  } catch (err) {
    console.error('deleteInvitation error:', err);
    res.status(500).json({ message: 'Failed to delete the invitation.' });
  }
};

/* -------------------------- Instructor side -------------------------- */

// GET /api/invitations/token/:token
// Only returns data while the invitation is still Pending and not expired.
exports.getInvitationByToken = async (req, res) => {
  try {
    const invitation = await Invitation.findOne({ token: req.params.token });
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found.' });
    }

    if (invitation.status === 'Pending' && invitation.expiresAt < new Date()) {
      invitation.status = 'Expired';
      await invitation.save();
    }

    if (invitation.status !== 'Pending') {
      return res.status(410).json({ message: STATUS_MESSAGES[invitation.status] });
    }

    res.json({
      fullName: invitation.fullName,
      email: invitation.email,
      department: invitation.department,
      invitedBy: invitation.invitedBy,
    });
  } catch (err) {
    console.error('getInvitationByToken error:', err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

// Shared by accept / reject. Atomic, so it can only succeed once.
const respondToInvitation = (newStatus) => async (req, res) => {
  try {
    const invitation = await Invitation.findOneAndUpdate(
      {
        token: req.params.token,
        status: 'Pending',
        expiresAt: { $gt: new Date() },
      },
      { $set: { status: newStatus, respondedAt: new Date() } },
      { new: true }
    );

    if (!invitation) {
      return res.status(410).json({ message: 'This invitation is no longer valid.' });
    }

    if (newStatus === 'Accepted') {
      // TODO: create the instructor account / attach the department here
    }

    res.json({ message: `Invitation ${newStatus.toLowerCase()}.` });
  } catch (err) {
    console.error(`${newStatus} invitation error:`, err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

exports.acceptInvitation = respondToInvitation('Accepted');
exports.rejectInvitation = respondToInvitation('Rejected');