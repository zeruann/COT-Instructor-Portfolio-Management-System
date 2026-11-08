const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const auditLogController = require('../controllers/auditLogController');
const auth = require('../middleware/auth');

const requireAdmin = (req, res, next) => {
    if (req.user?.accountType !== 'Administrator') {
        return res.status(403).json({ message: 'Access denied. Administrator only.' });
    }
    next();
};

// Public route for login page
router.get('/public', settingController.getPublicSettings);

// Protected routes for Administrator
router.get('/', auth, requireAdmin, settingController.getSettings);
router.put('/', auth, requireAdmin, settingController.updateSettings);
router.post('/verify-password', auth, requireAdmin, settingController.verifyAdminPassword);
router.get('/audit-logs', auth, auditLogController.getAuditLogs);

module.exports = router;

