const express = require('express');
const router = express.Router();
const {
  sendInvitation,
  getInvitations,
  getAcceptedInvitations, // <-- Import here
  getActiveInstructors,   // add this
  getInvitationByToken,
  acceptInvitation,
  rejectInvitation,
  resendInvitation,
  cancelInvitation,
  completeSetup,          // this was missing
} = require('../controllers/invitationController');

router.post('/', sendInvitation);
router.get('/', getInvitations);
router.get('/accepted', getAcceptedInvitations); // <-- Add route here
router.get('/active', getActiveInstructors);   // add this, above any '/:id' or '/token/:token' route

router.get('/token/:token', getInvitationByToken);
router.patch('/:token/accept', acceptInvitation);
router.patch('/:token/reject', rejectInvitation);
router.patch('/:id/resend', resendInvitation);
router.patch('/:id/cancel', cancelInvitation); 
router.post('/token/:token/setup', completeSetup);

module.exports = router;