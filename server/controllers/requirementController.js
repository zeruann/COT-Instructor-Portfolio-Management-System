// server/controllers/requirementController.js
const Requirement = require('../models/Requirement');

exports.getRequirements = async (req, res) => {
  try {
    const { scope = 'faculty', card } = req.query;
    const filter = { active: true };
    if (scope) filter.scope = scope;
    if (card) filter.card = card;

    const requirements = await Requirement.find(filter)
      .sort({ cardOrder: 1, order: 1 })
      .lean();

    return res.json(requirements);
  } catch (err) {
    console.error('Error in getRequirements:', err);
    return res.status(500).json({ message: 'Failed to fetch requirements.' });
  }
};

exports.getRequirementByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const reqDoc = await Requirement.findOne({ key, active: true }).lean();
    if (!reqDoc) {
      return res.status(404).json({ message: 'Requirement not found.' });
    }
    return res.json(reqDoc);
  } catch (err) {
    console.error('Error in getRequirementByKey:', err);
    return res.status(500).json({ message: 'Failed to fetch requirement.' });
  }
};
