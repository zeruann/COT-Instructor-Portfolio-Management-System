const mongoose = require('mongoose');

const resourceLockSchema = new mongoose.Schema(
  {
    resourceKey: { type: String, required: true, unique: true },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', required: true },
    lockedByName: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// MongoDB TTL index cleans up expired locks automatically
resourceLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ResourceLock', resourceLockSchema);

