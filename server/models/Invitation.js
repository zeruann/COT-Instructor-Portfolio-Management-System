// server/models/Invitation.js
const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  department: { type: String, required: true },
  invitedBy: { type: String, default: 'Administrator' },

  // Capitalized to match the frontend (statusStyles, inv.status === 'Pending', etc.)
status: {
  type: String,
  enum: ['Pending', 'Accepted', 'Rejected', 'Expired', 'Cancelled'],
  default: 'Pending',
},

  dateSent: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  respondedAt: Date,

  // How many times an admin has resent this invitation (server-side limit)
  resendCount: { type: Number, default: 0 },
});

module.exports = mongoose.model('Invitation', invitationSchema);