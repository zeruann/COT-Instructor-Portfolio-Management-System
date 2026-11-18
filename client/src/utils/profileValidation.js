// client/src/utils/profileValidation.js

export const NAME_MAX_LENGTH = 15;
export const ADDRESS_MAX_LENGTH = 80;
export const ALTERNATE_EMAIL_MAX_LENGTH = 254;
export const DEGREE_MAX_LENGTH = 100;
export const SCHOOL_MAX_LENGTH = 100;
export const MIN_AGE = 20;
export const MAX_AGE = 120;
export const YEAR_GRADUATED_REGEX = /^(19[5-9]\d|20\d{2}|21\d{2})$/;

export const PROFILE_NAME_FIELDS = ['firstName', 'middleName', 'lastName'];

const NAME_LABELS = {
  firstName: 'First name',
  middleName: 'Middle name',
  lastName: 'Last name',
};

/**
 * Digits only, capped at 11 characters.
 * A pasted +63 number is converted to its local 09... form.
 */
export function normalizePhoneInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '');

  if (digits.startsWith('63') && digits.length >= 12) {
    return `0${digits.slice(2, 12)}`;
  }

  return digits.slice(0, 11);
}

/**
 * Requires exactly 11 digits starting with 09.
 * Rejects low-quality numbers such as "0", "00000000",
 * "09000000000", and "09111111111".
 */
export function isValidPhoneNumber(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return true; // optional field

  const digits = trimmed.replace(/\D/g, '');
  if (!/^09\d{9}$/.test(digits)) return false;

  const subscriber = digits.slice(2);
  if (/^0+$/.test(subscriber)) return false;
  if (/^(\d)\1+$/.test(subscriber)) return false;

  return true;
}

export function isValidEmail(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return true; // optional field
  if (trimmed.length > ALTERNATE_EMAIL_MAX_LENGTH) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

/**
 * Returns age in whole years, or null when the date is invalid.
 */
export function calculateAge(value) {
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
}

/** Latest allowed birthdate for someone who is at least MIN_AGE today. */
export function getMaxBirthdate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - MIN_AGE);
  return date.toISOString().split('T')[0];
}

/**
 * Returns a user-facing error message, or an empty string when valid.
 */
export function validateProfileForm(form = {}) {
  for (const field of PROFILE_NAME_FIELDS) {
    const value = String(form[field] ?? '').trim();
    if (value.length > NAME_MAX_LENGTH) {
      return `${NAME_LABELS[field]} must be ${NAME_MAX_LENGTH} characters or fewer.`;
    }
  }

  if (!isValidPhoneNumber(form.contactNumber)) {
    return 'Contact number must be an 11-digit PH mobile number (e.g. 09123456789).';
  }

  if (!isValidEmail(form.alternateEmail)) {
    return 'Alternate email must be a valid email address.';
  }

  if (String(form.address ?? '').trim().length > ADDRESS_MAX_LENGTH) {
    return `Address must be ${ADDRESS_MAX_LENGTH} characters or fewer.`;
  }

  if (form.birthdate) {
    const age = calculateAge(form.birthdate);
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

  const education = Array.isArray(form.education) ? form.education : [];
  for (const entry of education) {
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

  return '';
}
