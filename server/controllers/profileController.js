const Instructor = require('../models/Instructor');

const EDITABLE = [
  'firstName', 'middleName', 'lastName', 'gender', 'civilStatus', 'birthdate',
  'contactNumber', 'alternateEmail', 'address', 'education', 'position', 'rank',
];

// GET /api/profile/me
exports.getMyProfile = async (req, res) => {
  try {
    const me = await Instructor.findById(req.user.id).select('fullName email department profile');
    if (!me) return res.status(404).json({ message: 'Account not found.' });
    res.json(me);
  } catch (err) {
    console.error('getMyProfile error:', err);
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

    res.status(201).json({
      message: 'Profile created successfully.',
      profile: created.profile,
    });

  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }

    console.error('createMyProfile error:', err);
    res.status(500).json({ message: 'Failed to create profile.' });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const $set = {};

    for (const key of EDITABLE) {
      if (req.body[key] !== undefined) {
        $set[`profile.${key}`] = req.body[key];
      }
    }

    // Sync fullName if first or last name is updated
    const computedFullName = [
      req.body.firstName,
      req.body.middleName,
      req.body.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (computedFullName) {
      $set.fullName = computedFullName;
    }

    const me = await Instructor.findByIdAndUpdate(
      req.user.id,
      { $set },
      { new: true, runValidators: true }
    ).select('fullName email department profile');

    res.json(me);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }

    console.error('updateMyProfile error:', err);
    res.status(500).json({ message: 'Failed to save profile.' });
  }
};