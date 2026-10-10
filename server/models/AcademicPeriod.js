const mongoose = require('mongoose');

const academicPeriodSchema = new mongoose.Schema(
  {

    schoolYear: {
        type: String,
        required: true,
        match: /^\d{4}-\d{4}$ /// e.g. 2026-2027
    },

    semester: {
        type: String,
        required: true,
        enum: ['1st', '2nd', 'Summer']
    },

    startDate: {type: Date},
    endDate: {type: Date},
    isCurrent: {
        type: Boolean,
        default: false
    },

    setBy:{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Instructor'}
    },
    
    { timestamps: true, versionKey: false}
);

academicPeriodSchema(
    { schoolYear: 1,semester: 1},
    { unique: true }
);

// Only one period can be current
academicPeriodSchema.index(
    { isCurrent: 1},
    {unique: true, partialFilterExpresssion: {isCurrent: true}}
);



module.exports = mongoose.model('AcademicPeriod', academicPeriodSchema);