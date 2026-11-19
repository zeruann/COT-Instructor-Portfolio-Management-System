const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // ignore invalid/expired token
    }
  }
  next();
};

const {
  sendInvitation,
  getInvitations,
  getAcceptedInvitations,
  getActiveInstructors,
  getInstructorById,
  getInvitationByToken,
  acceptInvitation,
  rejectInvitation,
  resendInvitation,
  cancelInvitation,
  completeSetup,
} = require('../controllers/invitationController');

router.post('/', optionalAuth, sendInvitation);

router.get('/', getInvitations);

router.get('/accepted', getAcceptedInvitations);

router.get('/active', getActiveInstructors);

router.get('/token/:token', getInvitationByToken);

// Get individual instructor profile
router.get('/:id', getInstructorById);


router.patch('/:token/accept', acceptInvitation);

router.patch('/:token/reject', rejectInvitation);

router.patch('/:id/resend', resendInvitation);

router.patch('/:id/cancel', cancelInvitation);

router.post('/token/:token/setup', completeSetup);

module.exports = router;