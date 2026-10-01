const router = require('express').Router();
const auth = require('../middleware/auth');

const {
  getMyProfile,
  createMyProfile,
  updateMyProfile,
} = require('../controllers/profileController');

router.get('/me', auth, getMyProfile);

// CREATE
router.post('/', auth, createMyProfile);

// UPDATE
router.put('/me', auth, updateMyProfile);

module.exports = router;