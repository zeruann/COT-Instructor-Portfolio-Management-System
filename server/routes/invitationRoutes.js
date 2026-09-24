// server/routes/invitationRoutes.js
const express = require('express');
const router = express.Router();
const {
  sendInvitation,
  getInvitations,
  getInvitationByToken,
  acceptInvitation,
  rejectInvitation,
  resendInvitation,
  deleteInvitation,
} = require('../controllers/invitationController');

router.post('/', sendInvitation);
router.get('/', getInvitations);
router.get('/token/:token', getInvitationByToken);
router.patch('/:token/accept', acceptInvitation);
router.patch('/:token/reject', rejectInvitation);
router.patch('/:id/resend', resendInvitation);
router.delete('/:id', deleteInvitation);

module.exports = router;