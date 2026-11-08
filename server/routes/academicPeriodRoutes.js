const express = require('express');
const router = express.Router();
const academicPeriodController = require('../controllers/academicPeriodController');
const auth = require('../middleware/auth');

const requireAdmin = (req, res, next) => {
  if (req.user?.accountType !== 'Administrator') {
    return res.status(403).json({ message: 'Access denied. Administrator / Dean only.' });
  }
  next();
};

// Public/Read-only for all logged in users (Instructors and Admins)
router.get('/current', auth, academicPeriodController.getCurrentAcademicPeriod);
router.get('/', auth, academicPeriodController.getAcademicPeriods);
router.get('/:id/details', auth, academicPeriodController.getAcademicPeriodDetails);

// Admin-only management endpoints
router.post('/', auth, requireAdmin, academicPeriodController.createAcademicPeriod);
router.put('/:id', auth, requireAdmin, academicPeriodController.updateAcademicPeriod);
router.patch('/:id/activate', auth, requireAdmin, academicPeriodController.setActiveAcademicPeriod);
router.patch('/:id/close', auth, requireAdmin, academicPeriodController.closeAcademicPeriod);
router.patch('/:id/archive', auth, requireAdmin, academicPeriodController.archiveAcademicPeriod);
router.delete('/:id', auth, requireAdmin, academicPeriodController.deleteAcademicPeriod);

module.exports = router;

