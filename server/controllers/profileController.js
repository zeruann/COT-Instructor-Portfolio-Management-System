const Instructor = require('../models/Instructor');
const bcrypt = require('bcryptjs');
const { logAudit } = require('../utils/auditLog');
const { ACTION } = require('../constants/auditActions');
const { isPasswordValid } = require('../utils/passwordRules');
const { markStaleUsersOffline } = require('../utils/onlineStatus');
const { validateProfileFields, formatValidationError } = require('../constants/profilePolicy');

const EDITABLE = [
  'firstName', 'middleName', 'lastName', 'gender', 'civilStatus', 'birthdate',
  'contactNumber', 'alternateEmail', 'address', 'education', 'position', 'rank',
  'photoUrl',
];

const FIELD_LABELS = {
  firstName: 'first name',
  middleName: 'middle name',
  lastName: 'last name',
  gender: 'gender',
  civilStatus: 'civil status',
  birthdate: 'birthdate',
  contactNumber: 'contact number',
  alternateEmail: 'alternate email',
  address: 'address',
  education: 'education',
  position: 'position',
  rank: 'academic rank',
  photoUrl: 'profile photo',
};

// GET /api/profile/me
exports.getMyProfile = async (req, res) => {
  try {
    const me = await Instructor.findById(req.user.id).select('fullName email department profile googlePhotoUrl');
    if (!me) return res.status(404).json({ message: 'Account not found.' });
    res.json(me);
  } catch (err) {
    console.error('getMyProfile error:', err);
    res.status(500).json({ message: 'Failed to load profile.' });
  }
};

// GET /api/profile/:id (Admin view)
exports.getProfileById = async (req, res) => {
  try {
    await markStaleUsersOffline();

    const instructor = await Instructor.findById(req.params.id).select('fullName email department profile accountStatus onlineStatus createdAt googlePhotoUrl');
    if (!instructor) return res.status(404).json({ message: 'Instructor not found.' });
    res.json(instructor);
  } catch (err) {
    console.error('getProfileById error:', err);
    res.status(500).json({ message: 'Failed to load profile.' });
  }
};

// POST /api/profile
// CREATE instructor personal information
exports.createMyProfile = async (req, res) => {
  try {
    const me = await Instructor.findById(req.user.id);

    if (!me) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    // Prevent creating the profile again if information already exists
    const hasExistingProfile = EDITABLE.some((key) => {
      const value = me.profile?.[key];

      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return value !== undefined && value !== null && value !== '';
    });

    if (hasExistingProfile) {
      return res.status(409).json({
        message: 'Profile already exists. Use the update function instead.',
      });
    }

    const fieldError = validateProfileFields(req.body);
    if (fieldError) {
      return res.status(400).json({ message: fieldError });
    }

    const $set = {};

    for (const key of EDITABLE) {
      if (req.body[key] !== undefined) {
        $set[`profile.${key}`] = req.body[key];
      }
    }

    const created = await Instructor.findByIdAndUpdate(
      req.user.id,
      { $set },
      {
        new: true,
        runValidators: true,
      }
    ).select('fullName email department profile');

    await logAudit({
      actor: created,
      action: ACTION.PROFILE_CREATE,
      targetType: 'instructor',
      targetId: created._id,
      targetLabel: created.fullName || created.email,
      details: 'Created initial profile information',
      meta: { profile: created.profile },
      req,
    });

    res.status(201).json({
      message: 'Profile created successfully.',
      profile: created.profile,
    });

  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: formatValidationError(err) });
    }

    console.error('createMyProfile error:', err);
    res.status(500).json({ message: 'Failed to create profile.' });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const meBefore = await Instructor.findById(req.user.id);
    if (!meBefore) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    const changedFields = [];
    const $set = {};

    if (req.body.photoUrl !== undefined && req.body.photoUrl !== null && req.body.photoUrl !== '') {
      const val = String(req.body.photoUrl);
      const isValidImage =
        /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(val) ||
        val.startsWith('https://');
      if (!isValidImage || val.length > 750000) {
        return res.status(400).json({ message: 'Invalid or oversized profile photo.' });
      }
    }

    const fieldError = validateProfileFields(req.body);
    if (fieldError) {
      return res.status(400).json({ message: fieldError });
    }

    for (const key of EDITABLE) {
      if (req.body[key] !== undefined) {
        const value = key === 'photoUrl' && req.body[key] === null ? '' : req.body[key];
        $set[`profile.${key}`] = value;

        const oldVal = JSON.stringify(meBefore.profile?.[key] ?? '');
        const newVal = JSON.stringify(value ?? '');
        if (oldVal !== newVal) {
          changedFields.push(FIELD_LABELS[key] || key);
        }
      }
    }

    // Sync fullName if first or last name is updated
    const computedFullName = [
      req.body.firstName !== undefined ? req.body.firstName : meBefore.profile?.firstName,
      req.body.middleName !== undefined ? req.body.middleName : meBefore.profile?.middleName,
      req.body.lastName !== undefined ? req.body.lastName : meBefore.profile?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (computedFullName && computedFullName !== meBefore.fullName) {
      $set.fullName = computedFullName;
      if (!changedFields.includes('full name')) {
        changedFields.unshift('full name');
      }
    }

    const me = await Instructor.findByIdAndUpdate(
      req.user.id,
      { $set },
      { new: true, runValidators: true }
    ).select('fullName email department profile googlePhotoUrl');

    const details =
      changedFields.length > 0
        ? `Changed: ${changedFields.join(', ')}`
        : 'Updated profile details';

    await logAudit({
      actor: me,
      action: ACTION.PROFILE_UPDATE,
      targetType: 'instructor',
      targetId: me._id,
      targetLabel: me.fullName || me.email,
      details,
      meta: { changedFields },
      req,
    });

    res.json(me);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: formatValidationError(err) });
    }

    console.error('updateMyProfile error:', err);
    res.status(500).json({ message: 'Failed to save profile.' });
  }
};

// PUT /api/profile/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required.',
      });
    }

    const instructor = await Instructor.findById(req.user.id);
    if (!instructor) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    if (!instructor.password) {
      return res.status(400).json({
        message: 'No password is set for this account (Google Sign-In user).',
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, instructor.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password.' });
    }

    if (!isPasswordValid(newPassword)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      });
    }

    instructor.password = await bcrypt.hash(newPassword, 10);
    await instructor.save();

    await logAudit({
      actor: instructor,
      action: ACTION.PASSWORD_CHANGE,
      targetType: 'account',
      targetId: instructor._id,
      targetLabel: instructor.fullName || instructor.email,
      details: 'Changed account password',
      req,
    });

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ message: 'Failed to change password.' });
  }
};