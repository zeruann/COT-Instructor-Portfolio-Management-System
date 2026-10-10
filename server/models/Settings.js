const mongoose = require('mongoose');

// Key/value system settings. Defaults live in code (config); a row here overrides a default.
// The screen to edit these is a System Admin feature and is still to be confirmed with the client.
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. retentionYears, maxFileSizeMB
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor' },
  },

  { timestamps: true, collection: 'settings' }
  
);

module.exports = mongoose.model('Setting', settingSchema);