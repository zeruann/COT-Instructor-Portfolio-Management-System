const Instructor = require('../models/Instructor');

const ONLINE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes without heartbeat => Offline

/**
 * Marks any instructor whose onlineStatus is 'Online' but who has no recent
 * heartbeat (missing or older than ONLINE_TIMEOUT_MS) as 'Offline'.
 */
async function markStaleUsersOffline() {
  const cutoff = new Date(Date.now() - ONLINE_TIMEOUT_MS);
  await Instructor.updateMany(
    {
      onlineStatus: 'Online',
      $or: [
        { lastSeenAt: { $exists: false } },
        { lastSeenAt: null },
        { lastSeenAt: { $lt: cutoff } },
      ],
    },
    { $set: { onlineStatus: 'Offline' } }
  );
}

module.exports = {
  ONLINE_TIMEOUT_MS,
  markStaleUsersOffline,
};

