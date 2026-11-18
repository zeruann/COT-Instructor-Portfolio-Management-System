// Character limits for class records. Keep these in sync with the client form.
const CLASS_FIELD_LIMITS = Object.freeze({
  subjectCode: 8,
  subjectName: 50,
  sectionCode: 6,
  sectionGroup: 1,
  sectionName: 50,
});

const CLASS_FIELD_LABELS = Object.freeze({
  subjectCode: 'Subject / Course Code',
  subjectName: 'Subject / Course Description',
  sectionCode: 'Section Code',
  sectionGroup: 'Section Group / Suffix',
  sectionName: 'Generated section name',
});

// Returns a user-facing error message, or null when every provided value fits.
const validateClassFields = (fields = {}) => {
  if (typeof fields.sectionGroup === 'string' && fields.sectionGroup.trim()) {
    if (!/^[A-Za-z]$/.test(fields.sectionGroup.trim())) {
      return 'Section Group / Suffix must be a single letter (A-Z).';
    }
  }

  for (const [key, limit] of Object.entries(CLASS_FIELD_LIMITS)) {
    const value = fields[key];
    if (typeof value === 'string' && value.trim().length > limit) {
      return `${CLASS_FIELD_LABELS[key]} must be ${limit} character${limit > 1 ? 's' : ''} or fewer.`;
    }
  }
  return null;
};

module.exports = { CLASS_FIELD_LIMITS, CLASS_FIELD_LABELS, validateClassFields };
