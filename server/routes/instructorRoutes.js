const express = require('express');
const router = express.Router();
const {
  getInstructors,
  updateInstructorStatus,
} = require('../controllers/instructorController');

router.get('/', getInstructors);
router.patch('/:id/status', updateInstructorStatus);

module.exports = router;