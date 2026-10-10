const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', required: true },
    type: {
      type: String,
      required: true,
      enum: ['document_submitted', 'document_approved', 'document_rejected', 'document_missing'],
    },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    requirementKey: { type: String },
    message: { type: String, required: true },
    readAt: { type: Date, default: null },
  },
  
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'notifications' }

);

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);