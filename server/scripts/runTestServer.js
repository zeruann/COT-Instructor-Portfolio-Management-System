const { TEST_DB_NAME, getTestMongoUri } = require('./testDbUri');

// Override MONGO_URI before server/index.js loads dotenv so dotenv will not
// overwrite it back to the production database.
process.env.MONGO_URI = getTestMongoUri();

console.log(`[TEST MODE] Starting Express server pointed exclusively at DB: ${TEST_DB_NAME}`);
require('../index');

