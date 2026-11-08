const mongoose = require('mongoose');

// Write-only. Never update or delete entries.
// Covers instructors, administrators, a future System Administrator, and the system itself (scheduled jobs).

const auditLogSchema = new mongoose.Schema(
    {
      logId: {
        type: String,
        default: () => {
          const yr = new Date().getFullYear();
          return `LOG${yr}-${String(Math.floor(1 + Math.random() * 9999)).padStart(4, '0')}`;
        },
      },
      actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', default: null }, // null for the system
      actorRole: {
        type: String,
        enum: ['Instructor', 'Administrator', 'System Administrator', 'System'],
      },
      
      actorName: { type: String }, // copy at the time of the action, so the log still reads well if the account changes
      category: { type: String }, // auth, account, invitation, document, period, settings, system

      action: { type: String, required: true }, // use constants/auditActions.js
      outcome: { type: String, enum: ['success', 'failure'], default: 'success' },

      targetType: { type: String }, // 'instructor', 'document', 'academicPeriod', 'setting'
      targetId: { type: mongoose.Schema.Types.ObjectId },
      targetLabel: { type: String }, // e.g. the instructor's name or the requirement label

      // Direct fields for display & fast search
      details: { type: String },
      documentName: { type: String },
      fileName: { type: String },

      meta: { type: mongoose.Schema.Types.Mixed }, // extra details; for changes use { before, after }. Never passwords or tokens.
      ip: { type: String },
      userAgent: { type: String },
      at: { type: Date, default: Date.now },
    },

    { collection: 'auditLogs', versionKey: false }

  );
  
  auditLogSchema.index({ at: -1 });
  auditLogSchema.index({ logId: 1 });
  auditLogSchema.index({ targetType: 1, targetId: 1 });
  auditLogSchema.index({ actorId: 1, at: -1 });
  auditLogSchema.index({ category: 1, at: -1 });
  
  module.exports = mongoose.model('AuditLog', auditLogSchema);