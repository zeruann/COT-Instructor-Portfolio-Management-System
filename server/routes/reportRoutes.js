// server/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const reportController = require('../controllers/reportController');

// All report endpoints require authentication
router.use(auth);

// Preview data
router.get('/compliance/data', reportController.getComplianceData);

// Download Excel file
router.get('/compliance/excel', reportController.downloadComplianceExcel);

// Export to Google Sheets
router.post('/compliance/sheets', reportController.exportComplianceGoogleSheet);

module.exports = router;

