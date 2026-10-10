const mongoose = require('mongoose');
const { STATUS } = require('../constants/documentStatus');

const reviewSchema = new mongoose.Schema(
  {
    decision: { type: String, enum: ['approved', 'rejected'], required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', required: true },
    comment: {
      type: String,
      trim: true,
      // a rejection must explain why
      required: function () {
        return this.decision === 'rejected';
      },
    },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const versionSchema = new mongoose.Schema(
  {
    n: { type: Number, required: true },
    driveFileId: { type: String, required: true }, // Drive file ID, never a link
    
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    checksum: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor' },
    review: { type: reviewSchema, default: null },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    requirementKey: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', required: true },


    // Class Portfolio (sprint 4). One document may cover several classes (e.g. an ILR across sections).
    // Empty for faculty documents.

    classIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Class', default: [] },


    // Which part of the requirement this file fills, when the requirement is split.
    slot: {
      term: { type: String, enum: ['Midterm', 'Finalterm'] }, // TOS, test questionnaire
      co: { type: String, enum: ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'] }, // sample checked activities
      source: { type: String, enum: ['SIAS', 'Google Classroom'] }, // official class list
    },
    academicPeriodId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicPeriod', default: null },



    meta: { type: mongoose.Schema.Types.Mixed, default: {} }, // extra fields for list-type items
    // Only set for single-slot requirements; guarantees one record per slot.
    slotKey: { type: String },
    status: { type: String, enum: Object.values(STATUS), default: STATUS.PENDING_REVIEW },
    currentVersion: { type: Number, default: 1 },
    versions: { type: [versionSchema], default: [] },
    submittedAt: { type: Date },

    reviewedAt: { type: Date },
    lateUpload: { type: Boolean, default: false }, // leftover item from a previous period
    archivedAt: { type: Date, default: null }, // archive is a flag; status is kept

  },

  { timestamps: true, collection: 'documents' }
  
);

documentSchema.statics.buildSlotKey = function ({ ownerId, requirementKey, academicPeriodId, classIds = [], slot = {} }) {
  const classPart = [...classIds].map(String).sort().join(',') || '-';
  const slotPart = [slot.term, slot.co, slot.source].filter(Boolean).join('/') || '-';
  return [ownerId, requirementKey, academicPeriodId || '-', classPart, slotPart].join(':');
};

documentSchema.index({ slotKey: 1 }, { unique: true, sparse: true });
documentSchema.index({ ownerId: 1, academicPeriodId: 1 });
documentSchema.index({ status: 1, submittedAt: 1 }); // admin review queue
documentSchema.index({ requirementKey: 1, ownerId: 1 });
documentSchema.index({ classIds: 1 }); // all documents of a class

module.exports = mongoose.model('Document', documentSchema);