const mongoose = require('mongoose');
const { TEST_DB_NAME, getTestMongoUri, clearTestCollections } = require('./testDbUri');

async function dropTestDb() {
  const testUri = getTestMongoUri();
  await mongoose.connect(testUri);

  await clearTestCollections(mongoose);
  console.log(`Cleared all collections in isolated test database "${TEST_DB_NAME}". Real database untouched.`);
  await mongoose.disconnect();
}

dropTestDb().catch(async (err) => {
  console.error('Failed to clear test DB:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
