const mongoose = require("mongoose");

const RANKS = [
  'Instructor I', 'Instructor II', 'Instructor III',
  'Assistant Professor I', 'Assistant Professor II', 'Assistant Professor III', 'Assistant Professor IV',
  'Associate Professor I', 'Associate Professor II', 'Associate Professor III', 'Associate Professor IV', 'Associate Professor V',
  'Professor I', 'Professor II', 'Professor III', 'Professor IV', 'Professor V', 'Professor VI',
];

const educationSchema = new mongoose.Schema({
  level: { type: String, enum: ["Bachelor's", "Master's", 'Doctorate', ''] },
  degree: { type: String, trim: true },
  school: { type: String, trim: true },
  yearGraduated: { type: Number, min: 1950, max: new Date().getFullYear() + 8 },
});
  
const instructorSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, default: null },
  googleId: { type: String },
  googlePhotoUrl: { type: String },

  // profile fields (add or rename to match your setup form)
  department: { type: String },

  profile: {
    firstName: { type: String, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    gender: { type: String, enum: ['Male', 'Female', 'Prefer not to say', ''] },
    civilStatus: { type: String, enum: ['Single', 'Married', 'Widowed', 'Separated', ''] },
    birthdate: Date,

    contactNumber: { type: String, trim: true },
    alternateEmail: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },

    education: [educationSchema],

    position: { type: String, trim: true },
    rank: { type: String, enum: [...RANKS, ''] },

    photoUrl: String,
  },

  accountType: {
    type: String,
    enum: ["Administrator", "Instructor"],
    default: "Instructor",
  },
  adminAccess: {
    enabled: { type: Boolean, default: false },
    scope: { type: String, enum: ['none', 'full', 'limited'], default: 'none' },
    pages: { type: [String], default: [] },
    documents: {
      faculty: { type: [String], default: [] },
      class: { type: [String], default: [] },
    },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', default: null },
    invitedByName: { type: String, default: '' },
    grantedAt: { type: Date, default: null },
    updatedAt: { type: Date, default: null },
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
  lastSeenAt: {
    type: Date,
    default: null,
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

  // Privacy notice acknowledgement, recorded when the invitee accepts.
  privacyAcknowledgedAt: Date,
  privacyNoticeVersion: String,

  resetPasswordToken: String,
  resetPasswordExpires: Date,
  resetPasswordOtp: String,
  resetPasswordOtpExpires: Date,
  apiSettingsOtp: String,
  apiSettingsOtpExpires: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Instructor", instructorSchema);