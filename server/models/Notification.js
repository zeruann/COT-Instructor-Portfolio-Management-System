const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'document_submitted',
        'document_approved',
        'document_rejected',
        'document_missing',
        'approved',
        'resubmission',
        'reminder',
        'notice',
        'role_access_updated',
        'mode_switch',
        'mode_switch_failed',
      ],
    },
    title: { type: String },
    message: { type: String, required: true },
    comment: { type: String, default: '' },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    requirementKey: { type: String },
    actionLink: { type: String, default: null },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', default: null },
    category: {
      type: String,
      enum: ['all', 'pending_review', 'system'],
      default: 'all',
    },
    audience: {
      type: String,
      enum: ['admin', 'instructor'],
      default: null,
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'notifications' }
);

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
