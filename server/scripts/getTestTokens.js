const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { TEST_DB_NAME, getTestMongoUri, signTestToken } = require('./testDbUri');
const Instructor = require('../models/Instructor');

/**
 * Generates fresh 24h Bearer JWT tokens for the existing test accounts in
 * `cotportfolio_test` without wiping or changing any database records.
 */
async function generateTokens() {
  const testUri = getTestMongoUri();
  await mongoose.connect(testUri);

  const connectedDb = mongoose.connection.db.databaseName;
  if (connectedDb !== TEST_DB_NAME) {
    await mongoose.disconnect();
    throw new Error(`Safety abort: connected to "${connectedDb}" instead of "${TEST_DB_NAME}".`);
  }

  const emails = {
    ADMIN_TOKEN: { email: 'admin.test@buksu.edu.ph', role: 'admin' },
    INSTRUCTOR_TOKEN: { email: 'instructor.test@buksu.edu.ph', role: 'instructor' },
    REGULAR_INSTRUCTOR_TOKEN: { email: 'regular.test@buksu.edu.ph', role: 'instructor' },
    EMPTY_PROFILE_TOKEN: { email: 'emptyprofile.test@buksu.edu.ph', role: 'instructor' },
  };

  const lines = [
    '====================================================================',
    `FRESH BEARER TOKENS FOR ISOLATED TEST DB: ${TEST_DB_NAME} (valid 24h)`,
    'Test Password for all accounts: TestPass@123',
    '====================================================================',
    '',
  ];

  for (const [label, cfg] of Object.entries(emails)) {
    const user = await Instructor.findOne({ email: cfg.email });
    if (!user) {
      lines.push(`${label}=<NOT FOUND — run npm run seed:test first>`);
    } else {
      const token = signTestToken(user, cfg.role);
      lines.push(`${label} (${cfg.email}, id: ${user._id}):`);
      lines.push(token);
      lines.push('');
    }
  }

  lines.push('====================================================================');
  const out = lines.join('\n');
  const outPath = path.resolve(__dirname, 'test-session-info.txt');
  fs.writeFileSync(outPath, out + '\n', 'utf8');

  console.log(out);
  console.log(`Saved locally (gitignored) to: ${outPath}`);
  await mongoose.disconnect();
}

generateTokens().catch(async (err) => {
  console.error('Failed to generate test tokens:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});

