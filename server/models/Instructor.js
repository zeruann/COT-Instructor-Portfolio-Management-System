const mongoose = require("mongoose");

const instructorSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, default: null },
  googleId: { type: String },

  // profile fields (add or rename to match your setup form)
  department: { type: String },
  position: { type: String },
  contactNumber: { type: String },

  accountType: {
    type: String,
    enum: ["Administrator", "Instructor"],
    default: "Instructor",
  },
  accountStatus: {
    type: String,
    enum: ["Active", "Inactive", "Pending"],
    default: "Active",
  },
  onlineStatus: {
    type: String,
    enum: ["Online", "Offline"],
    default: "Offline",
  },

  // Invitation fields. No defaults on purpose: admins and Google
  // sign-ups were never invited, so these stay empty for them.
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected", "Expired", "Cancelled"],
  },
  token: { type: String, unique: true, sparse: true },
  invitedBy: String,
  dateSent: Date,
  expiresAt: Date,
  respondedAt: Date,
  resendCount: { type: Number, default: 0 },

  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Instructor", instructorSchema);