// Review rules shared by the document review endpoints.
// Rejection reasons are limited so notifications and history stay readable.
const REJECT_COMMENT_MAX_WORDS = 100;

const countWords = (text) =>
  typeof text === 'string' ? (text.trim() ? text.trim().split(/\s+/).length : 0) : 0;

module.exports = { REJECT_COMMENT_MAX_WORDS, countWords };
