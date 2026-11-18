const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { acquireLock, releaseLock, getLockStatus } = require('../controllers/lockController');

router.use(auth);

router.post('/acquire', acquireLock);
router.post('/release', releaseLock);
router.get('/status', getLockStatus);

module.exports = router;

