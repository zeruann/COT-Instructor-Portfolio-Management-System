// server/routes/classRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const classController = require('../controllers/classController');

router.use(auth);

router.get('/', classController.getClasses);
router.get('/:id', classController.getClassById);
router.post('/', classController.createClass);
router.patch('/:id', classController.updateClass);
router.post('/:id/archive', classController.archiveClass);
router.post('/:id/unarchive', classController.unarchiveClass);
router.delete('/:id', classController.deleteClass);

module.exports = router;

