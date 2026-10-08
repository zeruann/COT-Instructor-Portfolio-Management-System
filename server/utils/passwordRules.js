// At least 8 characters, one uppercase, one lowercase, one number, one special character.
// Keep this in sync with client/src/utils/passwordRules.js
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const isPasswordValid = (password) =>
  typeof password === 'string' && PASSWORD_REGEX.test(password);

module.exports = { isPasswordValid };