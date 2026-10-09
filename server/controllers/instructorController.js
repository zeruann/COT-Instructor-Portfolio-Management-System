const Instructor = require('../models/Instructor');

const SAFE_FIELDS = '-password -resetPasswordToken -resetPasswordExpires';

// GET /api/instructors
exports.getInstructors = async (req, res) => {
  try {
    const instructors = await Instructor.find().select(SAFE_FIELDS).sort({ createdAt: -1 });
    res.json(instructors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/instructors/:id
exports.getInstructorById = async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id).select(SAFE_FIELDS);

    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found.' });
    }

    res.json(instructor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/instructors/:id/status   body: { accountStatus: "Active" | "Deactivated" }
exports.updateInstructorStatus = async (req, res) => {
  try {
    const { accountStatus } = req.body;

    if (!['Active', 'Deactivated'].includes(accountStatus)) {
      return res.status(400).json({ message: 'Invalid account status.' });
    }

    const instructor = await Instructor.findByIdAndUpdate(
      req.params.id,
      { accountStatus },
      { new: true }
    ).select(SAFE_FIELDS);

    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found.' });
    }

    res.json(instructor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};