const router = require('express').Router();
const auth = require('../middleware/auth');

const {
  getMyProfile,
  getProfileById,
  createMyProfile,
  updateMyProfile,
  changePassword,
} = require('../controllers/profileController');

router.get('/me', auth, getMyProfile);
router.get('/:id', auth, getProfileById);

// CREATE
router.post('/', auth, createMyProfile);

// UPDATE
router.put('/me', auth, updateMyProfile);

// CHANGE PASSWORD
router.put('/change-password', auth, changePassword);

module.exports = router;