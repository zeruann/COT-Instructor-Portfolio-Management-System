// server/routes/documentRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const documentController = require('../controllers/documentController');

// All document routes require authentication
router.use(auth);

// Summary routes (placed before :id to prevent param collision)
router.get('/summary/faculty', documentController.getFacultyPortfolioSummary);

// Collection routes
router.get('/', documentController.getDocuments);
router.post('/upload', upload.single('file'), documentController.uploadDocument);

// Individual document routes
router.get('/:id', documentController.getDocumentById);
router.get('/:id/file', documentController.streamDocumentFile);
router.patch('/:id/review', documentController.reviewDocument);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
