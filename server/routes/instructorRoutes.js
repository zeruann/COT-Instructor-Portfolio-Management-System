const express = require('express');
const router = express.Router();
const {
  getInstructors,
  getInstructorById,
  updateInstructorStatus,
} = require('../controllers/instructorController');

router.get('/', getInstructors);
router.get('/:id', getInstructorById);
router.patch('/:id/status', updateInstructorStatus);

module.exports = router;