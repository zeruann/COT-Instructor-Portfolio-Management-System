// server/constants/profilePolicy.js

const NAME_MAX_LENGTH = 15;
const ADDRESS_MAX_LENGTH = 80;
const ALTERNATE_EMAIL_MAX_LENGTH = 254;
const DEGREE_MAX_LENGTH = 100;
const SCHOOL_MAX_LENGTH = 100;
const MIN_AGE = 20;
const MAX_AGE = 120;
const YEAR_GRADUATED_REGEX = /^(19[5-9]\d|20\d{2}|21\d{2})$/;
const NAME_FIELDS = ['firstName', 'middleName', 'lastName'];

const NAME_LABELS = {
  firstName: 'First name',
  middleName: 'Middle name',
  lastName: 'Last name',
};

const isValidPhoneNumber = (value) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return true; // optional field

  const digits = trimmed.replace(/\D/g, '');
  if (!/^09\d{9}$/.test(digits)) return false;

  const subscriber = digits.slice(2);
  if (/^0+$/.test(subscriber)) return false;
  if (/^(\d)\1+$/.test(subscriber)) return false;

  return true;
};

const isValidEmail = (value) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return true; // optional field
  if (trimmed.length > ALTERNATE_EMAIL_MAX_LENGTH) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
};

const calculateAge = (value) => {
  if (!value) return null;

  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }

  return age;
};

/**
 * Returns a user-facing error message, or null when valid.
 */
const validateProfileFields = (body = {}) => {
  for (const field of NAME_FIELDS) {
    if (typeof body[field] === 'string' && body[field].trim().length > NAME_MAX_LENGTH) {
      return `${NAME_LABELS[field]} must be ${NAME_MAX_LENGTH} characters or fewer.`;
    }
  }

  if (body.contactNumber !== undefined && !isValidPhoneNumber(body.contactNumber)) {
    return 'Contact number must be an 11-digit PH mobile number (e.g. 09123456789).';
  }

  if (body.alternateEmail !== undefined && !isValidEmail(body.alternateEmail)) {
    return 'Alternate email must be a valid email address.';
  }

  if (typeof body.address === 'string' && body.address.trim().length > ADDRESS_MAX_LENGTH) {
    return `Address must be ${ADDRESS_MAX_LENGTH} characters or fewer.`;
  }

  if (body.birthdate) {
    const age = calculateAge(body.birthdate);
    if (age === null) {
      return 'Please enter a valid birthdate.';
    }
    if (age < MIN_AGE) {
      return `Instructors must be at least ${MIN_AGE} years old.`;
    }
    if (age > MAX_AGE) {
      return 'Please enter a valid birthdate.';
    }
  }

  if (Array.isArray(body.education)) {
    for (const entry of body.education) {
      const degree = String(entry?.degree ?? '').trim();
      const school = String(entry?.school ?? '').trim();

      if (degree && !/\p{L}/u.test(degree)) {
        return 'Degree / Program must include letters, not numbers only.';
      }
      if (school && !/\p{L}/u.test(school)) {
        return 'School / University must include letters, not numbers only.';
      }

      if (degree.length > DEGREE_MAX_LENGTH) {
        return `Degree / Program must be ${DEGREE_MAX_LENGTH} characters or fewer.`;
      }
      if (school.length > SCHOOL_MAX_LENGTH) {
        return `School / University must be ${SCHOOL_MAX_LENGTH} characters or fewer.`;
      }

      const year = String(entry?.yearGraduated ?? '').trim();
      if (year && !YEAR_GRADUATED_REGEX.test(year)) {
        return 'Year Graduated must be a valid 4-digit year (1950 or later).';
      }
    }
  }

  return null;
};

/**
 * Converts raw Mongoose validation errors into friendly, field-specific messages.
 * Returns null when the error isn't a validation error we can translate.
 */
const formatValidationError = (err) => {
  if (!err || err.name !== 'ValidationError') return null;

  const errors = err.errors || {};
  for (const path of Object.keys(errors)) {
    const detail = errors[path] || {};

    if (path.includes('yearGraduated')) {
      return 'Year Graduated must be a valid 4-digit year (1950 or later).';
    }

    if (path.includes('birthdate')) {
      return 'Please enter a valid birthdate.';
    }

    if (path.includes('education') && detail.kind === 'enum') {
      return 'Please select a valid education level.';
    }

    if (detail.kind === 'required') {
      return 'Please fill in all required fields.';
    }
  }

  return 'Some profile details are invalid. Please review your entries.';
};

module.exports = {
  NAME_MAX_LENGTH,
  ADDRESS_MAX_LENGTH,
  ALTERNATE_EMAIL_MAX_LENGTH,
  DEGREE_MAX_LENGTH,
  SCHOOL_MAX_LENGTH,
  MIN_AGE,
  MAX_AGE,
  YEAR_GRADUATED_REGEX,
  NAME_FIELDS,
  isValidPhoneNumber,
  isValidEmail,
  calculateAge,
  validateProfileFields,
  formatValidationError,
};
