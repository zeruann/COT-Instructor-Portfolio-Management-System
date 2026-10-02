const express = require('express');

const router = express.Router();

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

router.post('/', sendInvitation);

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