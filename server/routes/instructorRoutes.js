const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireAdminAccess } = require('../middleware/adminAccess');
const {
  getInstructors,
  getInstructorById,
  updateInstructorStatus,
  getAdminPermissionsMeta,
  updateInstructorAdminAccess,
} = require('../controllers/instructorController');

router.get('/', getInstructors);
router.get('/permissions/meta', auth, getAdminPermissionsMeta);
router.get('/:id', getInstructorById);
router.patch('/:id/status', auth, requireAdminAccess('instructors'), updateInstructorStatus);
router.patch('/:id/admin-access', auth, requireAdminAccess('instructors'), updateInstructorAdminAccess);

module.exports = router;