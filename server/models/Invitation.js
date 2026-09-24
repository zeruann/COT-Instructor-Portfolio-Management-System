// server/models/Invitation.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const invitationSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  department: { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected'],
    default: 'Pending',
  },
  token: { type: String, required: true, unique: true },
  invitedBy: { type: String, default: 'System Administrator' },
  dateSent: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

invitationSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = mongoose.model('Invitation', invitationSchema);