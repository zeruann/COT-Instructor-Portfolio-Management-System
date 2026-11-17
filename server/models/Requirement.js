const mongoose = require('mongoose');

const metaFieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'date', 'select', 'url', 'longtext'], default: 'text' },
    required: { type: Boolean, default: false },
    options: [String],
  },
  { _id: false }
);

const requirementSchema = new mongoose.Schema(
  {
    // Stable identifier. NOT the Plaky/functional requirement ID (those change when rows move).
    key: { type: String, required: true, unique: true },
    checklistRef: { type: String }, // e.g. "B 1.0"

    card: { type: String, required: true }, // card title on the portfolio page
    cardOrder: { type: Number, required: true },

    label: { type: String, required: true }, // slot label shown to the user
    scope: { type: String, enum: ['faculty', 'class'], required: true },

    multiple: { type: Boolean, default: false }, // list type: many entries per requirement
    required: { type: String, enum: ['required', 'ifApplicable', 'optional'], default: 'required' },
    // If set, the requirement only applies when the instructor has this education level
    appliesWhen: {
      educationLevel: { type: String, enum: ["Bachelor's", "Master's", 'PhD'] },
    },


    // Split into separate slots: ['term'] = Midterm/Finalterm, ['co'] = CO1-CO5, ['source'] = SIAS/Google Classroom
    slotBy: { type: [String], enum: ['term', 'co', 'source'], default: [] },
    periodScope: { type: String, enum: ['none', 'semester', 'year'], default: 'none' },
    acceptedTypes: { type: [String], default: ['pdf', 'jpg', 'png', 'docx'] },

    metaFields: [metaFieldSchema],
    order: { type: Number, required: true },

    inChecklist: { type: Boolean, default: true }, // false = kept, pending client confirmation
    functionalReqId: { type: String }, // traceability note only, not a key
    active: { type: Boolean, default: true },
    
  },

  { timestamps: true, collection: 'requirements' }

);

requirementSchema.index({ scope: 1, cardOrder: 1, order: 1 });

module.exports = mongoose.model('Requirement', requirementSchema);