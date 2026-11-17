const mongoose = require('mongoose');

// One class = one subject taught to one section, in one semester (Class Portfolio, sprint 4).
// The same subject in two sections is two classes.
const classSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', required: true },
    academicPeriodId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicPeriod', required: true },
    subject: {
      code: { type: String, required: true, trim: true },
      name: { type: String, required: true, trim: true },
    },
    section: {
      code: { type: String, required: true, trim: true },
      name: { type: String, trim: true },
    },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'classes' }
);

classSchema.index(
  { ownerId: 1, academicPeriodId: 1, 'subject.code': 1, 'section.code': 1 },
  { unique: true }
);

module.exports = mongoose.model('Class', classSchema);