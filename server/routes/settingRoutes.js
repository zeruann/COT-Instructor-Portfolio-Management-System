const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const auditLogController = require('../controllers/auditLogController');
const auth = require('../middleware/auth');
const { requireAdminAccess } = require('../middleware/adminAccess');

const requireAdmin = requireAdminAccess('api_settings');

// Public route for login page
router.get('/public', settingController.getPublicSettings);

// Protected routes for Administrator
router.get('/', auth, requireAdmin, settingController.getSettings);
router.put('/', auth, requireAdmin, settingController.updateSettings);
router.put('/modes', auth, requireAdmin, settingController.updateApiModes);
router.post('/restore-defaults', auth, requireAdmin, settingController.restoreDefaults);
router.post('/test-connection', auth, requireAdmin, settingController.testConnection);
router.post('/verify-password', auth, requireAdmin, settingController.verifyAdminPassword);
router.post('/send-otp', auth, requireAdmin, settingController.sendSettingsOtp);
router.post('/verify-otp', auth, requireAdmin, settingController.verifySettingsOtp);
router.get('/audit-logs', auth, auditLogController.getAuditLogs);

module.exports = router;

