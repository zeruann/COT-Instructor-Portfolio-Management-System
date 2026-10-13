// server/routes/requirementRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requirementController = require('../controllers/requirementController');

router.use(auth);

router.get('/', requirementController.getRequirements);
router.get('/:key', requirementController.getRequirementByKey);

module.exports = router;
