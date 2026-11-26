const dns = require('dns');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

const TEST_DB_NAME = 'cotportfolio_test';

/**
 * Loads server/.env and rewrites MONGO_URI to target an isolated `_test` database.
 * Throws if the rewritten database name does not match TEST_DB_NAME so the live DB
 * can never be modified by test scripts.
 */
function getTestMongoUri() {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  dotenv.config({ path: path.resolve(__dirname, '../.env') });

  const rawUri = process.env.MONGO_URI;
  if (!rawUri) {
    throw new Error('MONGO_URI is missing in server/.env');
  }

  const parsed = new URL(rawUri);
  parsed.pathname = `/${TEST_DB_NAME}`;

  if (parsed.pathname !== `/${TEST_DB_NAME}`) {
    throw new Error(`Safety check failed: unexpected DB pathname ${parsed.pathname}`);
  }

  return parsed.toString();
}

/**
 * Clears all documents from collections in the currently connected test database
 * (uses deleteMany instead of dropDatabase to respect Atlas readWrite roles).
 */
async function clearTestCollections(mongoose) {
  const connectedDb = mongoose.connection.db.databaseName;
  if (connectedDb !== TEST_DB_NAME) {
    throw new Error(`Safety abort: connected to "${connectedDb}" instead of "${TEST_DB_NAME}".`);
  }

  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    if (!col.name.startsWith('system.')) {
      await mongoose.connection.db.collection(col.name).deleteMany({});
    }
  }
}

/**
 * Signs a 24h Bearer JWT for a test user using the local JWT_SECRET.
 */
function signTestToken(user, activeRole) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing in server/.env');
  }
  return jwt.sign(
    {
      id: user._id,
      accountType: user.accountType,
      activeRole: activeRole || (user.accountType === 'Administrator' ? 'admin' : 'instructor'),
      name: user.fullName,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

module.exports = { TEST_DB_NAME, getTestMongoUri, clearTestCollections, signTestToken };
