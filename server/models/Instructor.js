const mongoose = require("mongoose");

const instructorSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  googleId: { type: String },

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

  onlineStatus:  { 
    type: String, 
    enum: ["Online", "Offline"], 
    default: "Offline", 
  },

  password: { type: String, default: null,}, 
  
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: { type: Date, default: Date.now },

});

module.exports = mongoose.model("Instructor", instructorSchema);