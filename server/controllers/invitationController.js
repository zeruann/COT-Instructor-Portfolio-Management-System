const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Instructor = require('../models/Instructor');
const { sendInvitationEmail } = require('../utils/sendEmail');

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const newToken = () => crypto.randomBytes(32).toString('hex');
const newExpiry = () => new Date(Date.now() + INVITATION_TTL_MS);

const buildFullName = ({ firstName, middleName, lastName }) =>
  [firstName, middleName, lastName].filter(Boolean).join(' ');

const PRIVATE_FIELDS = ['token', '__v', 'password', 'googleId', 'resetPasswordToken', 'resetPasswordExpires'];
const PRIVATE_SELECT = PRIVATE_FIELDS.map((f) => `-${f}`).join(' ');

// Never send tokens or account secrets back to the admin UI
const withoutPrivate = (doc) => {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  PRIVATE_FIELDS.forEach((f) => delete obj[f]);
  return obj;
};

// Only people who were invited belong in the invitations table
const INVITED = { invitedBy: { $exists: true } };

// Flip any Pending invitation past its expiry date to Expired
const expireStale = () =>
  Instructor.updateMany(
    { status: 'Pending', expiresAt: { $lt: new Date() } },
    { $set: { status: 'Expired' } }
  );

const STATUS_MESSAGES = {
  Accepted: 'This invitation has already been accepted.',
  Rejected: 'This invitation was already declined.',
  Expired: 'This invitation has expired.',
  Cancelled: 'This invitation was cancelled by the administrator.',
};

/* ---------------------------- Admin side ---------------------------- */

// POST /api/invitations
exports.sendInvitation = async (req, res) => {
  try {
    const firstName = (req.body.firstName || '').trim();
    const middleName = (req.body.middleName || '').trim();
    const lastName = (req.body.lastName || '').trim();
    const fullName = buildFullName({ firstName, middleName, lastName });
    const email = (req.body.email || '').trim().toLowerCase();
    const { department } = req.body;

    if (!firstName || !lastName || !email || !department) {
      return res
        .status(400)
        .json({ message: 'First name, last name, email, and department are required.' });
    }
    await expireStale();

    // One document per email. Only a Cancelled invitation can be re-invited.
    const existing = await Instructor.findOne({ email });

    if (existing && existing.status !== 'Cancelled') {
      const messages = {
        Pending: 'This email already has a pending invitation.',
        Accepted:
          existing.accountStatus === 'Pending'
            ? 'This instructor accepted the invitation but has not finished setting up their account.'
            : 'This email already belongs to an instructor account.',
        Rejected: 'This email was already invited and declined. Use Resend on the existing invitation instead.',
        Expired: 'This email was already invited and the invitation expired. Use Resend on the existing invitation instead.',
      };
      return res
        .status(409)
        .json({ message: messages[existing.status] || 'This email already belongs to an account.' });
    }

    const inviteFields = {
      token: newToken(),
      fullName,
      department,
      invitedBy: req.user?.name || 'Administrator',
      status: 'Pending',
      accountStatus: 'Pending',
      accountType: 'Instructor',
      dateSent: new Date(),
      expiresAt: newExpiry(),
      respondedAt: null,
      resendCount: 0,
    };

    let invitation;
    if (existing) {
      // Re-inviting a cancelled email: reuse the document.
      // Dotted keys so other profile fields are not wiped.
      invitation = await Instructor.findByIdAndUpdate(
        existing._id,
        {
          $set: {
            ...inviteFields,
            'profile.firstName': firstName,
            'profile.middleName': middleName,
            'profile.lastName': lastName,
          },
        },
        { new: true }
      );
    } else {
      invitation = await Instructor.create({
        ...inviteFields,
        email,
        profile: { firstName, middleName, lastName },
      });
    }

    try {
      await sendInvitationEmail(invitation.email, invitation.fullName, invitation.token);
    } catch (emailErr) {
      console.error('Failed to send invitation email:', emailErr);
      // Don't leave an invitation behind that nobody received
      if (existing) {
        await Instructor.updateOne(
          { _id: existing._id },
          { $set: { status: 'Cancelled', token: newToken() } }
        );
      } else {
        await Instructor.findByIdAndDelete(invitation._id);
      }
      return res
        .status(502)
        .json({ message: 'The invitation email could not be sent. Check the email address and try again.' });
    }

    res.status(201).json(withoutPrivate(invitation));
  } catch (err) {
    console.error('sendInvitation error:', err);
    res.status(500).json({ message: 'Something went wrong while sending the invitation.' });
  }
};

// GET /api/invitations
exports.getInvitations = async (req, res) => {
  try {
    await expireStale();
    const invitations = await Instructor.find(INVITED)
      .select(PRIVATE_SELECT)
      .sort({ dateSent: -1 });
    res.json(invitations);
  } catch (err) {
    console.error('getInvitations error:', err);
    res.status(500).json({ message: 'Failed to load invitations.' });
  }
};

// GET /api/invitations/accepted
exports.getAcceptedInvitations = async (req, res) => {
  try {
    await expireStale();
    const invitations = await Instructor.find({ ...INVITED, status: 'Accepted' })
      .select(PRIVATE_SELECT)
      .sort({ dateSent: -1 });
    res.json(invitations);
  } catch (err) {
    console.error('getAcceptedInvitations error:', err);
    res.status(500).json({ message: 'Failed to load accepted invitations.' });
  }
};

// PATCH /api/invitations/:id/resend
// Rejected or Expired only. No limit on how many times.
// Rotates the token so the old link stops working.
exports.resendInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid invitation id.' });
    }

    const token = newToken();

    // Atomic: two quick clicks can't both pass this filter
    const original = await Instructor.findOneAndUpdate(
      { _id: id, status: { $in: ['Rejected', 'Expired'] } },
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
      const current = await Instructor.findById(id);
      if (!current) return res.status(404).json({ message: 'Invitation not found.' });
      return res
        .status(409)
        .json({ message: 'Only rejected or expired invitations can be resent.' });
    }

    try {
      await sendInvitationEmail(original.email, original.fullName, token);
    } catch (emailErr) {
      console.error('Failed to resend invitation email:', emailErr);
      await Instructor.updateOne(
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

    const updated = await Instructor.findById(id);
    res.json(withoutPrivate(updated));
  } catch (err) {
    console.error('resendInvitation error:', err);
    res.status(500).json({ message: 'Something went wrong while resending the invitation.' });
  }
};

// PATCH /api/invitations/:id/cancel (Pending only)
exports.cancelInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid invitation id.' });
    }

    const cancelled = await Instructor.findOneAndUpdate(
      { _id: id, status: 'Pending' },
      { $set: { status: 'Cancelled', token: newToken() } },
      { new: true }
    );

    if (!cancelled) {
      const current = await Instructor.findById(id);
      if (!current) return res.status(404).json({ message: 'Invitation not found.' });
      return res.status(409).json({
        message: `This invitation is already ${current.status.toLowerCase()} and can't be cancelled.`,
      });
    }

    res.json(withoutPrivate(cancelled));
  } catch (err) {
    console.error('cancelInvitation error:', err);
    res.status(500).json({ message: 'Something went wrong while cancelling the invitation.' });
  }
};

/* -------------------------- Instructor side -------------------------- */

// GET /api/invitations/token/:token
// Works for a Pending invitation, and also for someone who accepted
// but hasn't finished setup yet (needsSetup = true).
exports.getInvitationByToken = async (req, res) => {
  try {
    const invitation = await Instructor.findOne({ token: req.params.token });
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found.' });
    }

    if (invitation.status === 'Pending' && invitation.expiresAt < new Date()) {
      await Instructor.updateOne({ _id: invitation._id }, { $set: { status: 'Expired' } });
      invitation.status = 'Expired';
    }

    const awaitingSetup =
      invitation.status === 'Accepted' && invitation.accountStatus === 'Pending';
    const needsSetup = awaitingSetup && invitation.expiresAt > new Date();

    if (invitation.status !== 'Pending' && !needsSetup) {
      const message = awaitingSetup
        ? 'This setup link has expired. Ask the administrator for a new one.'
        : STATUS_MESSAGES[invitation.status];
      return res.status(410).json({ message });
    }

    res.json({
      fullName: invitation.fullName,
      email: invitation.email,
      department: invitation.department,
      invitedBy: invitation.invitedBy,
      needsSetup,
    });
  } catch (err) {
    console.error('getInvitationByToken error:', err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

// Shared by accept / reject. Atomic, so it can only succeed once.
const respondToInvitation = (newStatus) => async (req, res) => {
  try {
    const update = { status: newStatus, respondedAt: new Date() };
    // Give the instructor a fresh 7 days to finish account setup
    if (newStatus === 'Accepted') update.expiresAt = newExpiry();

    const invitation = await Instructor.findOneAndUpdate(
      { token: req.params.token, status: 'Pending', expiresAt: { $gt: new Date() } },
      { $set: update },
      { new: true }
    );

    if (!invitation) {
      return res.status(410).json({ message: 'This invitation is no longer valid.' });
    }

    res.json({
      message: `Invitation ${newStatus.toLowerCase()}.`,
      needsSetup: newStatus === 'Accepted',
    });
  } catch (err) {
    console.error(`${newStatus} invitation error:`, err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

exports.acceptInvitation = respondToInvitation('Accepted');
exports.rejectInvitation = respondToInvitation('Rejected');



// POST /api/invitations/token/:token/setup
// Final step: password + profile, then the account becomes Active.
exports.completeSetup = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const hashed = await bcrypt.hash(password, 10);

    // Atomic: only an accepted, unfinished, unexpired account can complete setup, once.
    const instructor = await Instructor.findOneAndUpdate(
      {
        token: req.params.token,
        status: 'Accepted',
        accountStatus: 'Pending',
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { password: hashed, accountStatus: 'Active' },
        $unset: { token: 1 }, // burn the link
      },
      { new: true }
    );

    if (!instructor) {
      return res.status(410).json({ message: 'This setup link is no longer valid.' });
    }

    res.json({ message: 'Account created. You can now log in.' });
  } catch (err) {
    console.error('completeSetup error:', err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};


// GET /api/invitations/active
exports.getActiveInstructors = async (req, res) => {
  try {
    const instructors = await Instructor.find({
      accountType: 'Instructor',
      accountStatus: { $in: ['Active', 'Inactive'] },
    })
      .select(PRIVATE_SELECT)
      .sort({ createdAt: -1 });
    res.json(instructors);
  } catch (err) {
    console.error('getActiveInstructors error:', err);
    res.status(500).json({ message: 'Failed to load instructors.' });
  }
};


// GET /api/invitations/:id
exports.getInstructorById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: 'Invalid instructor id.',
      });
    }

    const instructor = await Instructor.findOne({
      _id: id,
      accountType: 'Instructor',
    }).select(PRIVATE_SELECT);

    if (!instructor) {
      return res.status(404).json({
        message: 'Instructor not found.',
      });
    }

    res.json(instructor);
  } catch (err) {
    console.error('getInstructorById error:', err);
    res.status(500).json({
      message: 'Failed to load instructor profile.',
    });
  }
};