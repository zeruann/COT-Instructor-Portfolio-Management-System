const ResourceLock = require('../models/ResourceLock');

const DEFAULT_LOCK_TTL_MS = 45 * 1000; // 45 seconds

/**
 * Atomically acquires or renews a lock for `resourceKey` on behalf of `user`.
 * Returns { acquired: true, lock } if the user holds the lock, or
 * { acquired: false, lock } if another user currently holds an active lock.
 */
async function acquireResourceLock(resourceKey, user, ttlMs = DEFAULT_LOCK_TTL_MS) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const userId = user.id || user._id;
  const userName = user.name || user.fullName || 'Another administrator';

  try {
    const lock = await ResourceLock.findOneAndUpdate(
      {
        resourceKey,
        $or: [{ lockedBy: userId }, { expiresAt: { $lte: now } }],
      },
      {
        $set: {
          resourceKey,
          lockedBy: userId,
          lockedByName: userName,
          expiresAt,
        },
      },
      { upsert: true, new: true }
    );
    return { acquired: true, lock };
  } catch (err) {
    // Duplicate key (11000) means another user holds an active, unexpired lock
    if (err?.code === 11000) {
      const existing = await ResourceLock.findOne({ resourceKey });
      if (existing && existing.expiresAt > new Date() && String(existing.lockedBy) !== String(userId)) {
        return { acquired: false, lock: existing };
      }
      // Edge case: expired right between the query and read; retry once
      const retryLock = await ResourceLock.findOneAndUpdate(
        {
          resourceKey,
          $or: [{ lockedBy: userId }, { expiresAt: { $lte: new Date() } }],
        },
        {
          $set: {
            resourceKey,
            lockedBy: userId,
            lockedByName: userName,
            expiresAt: new Date(Date.now() + ttlMs),
          },
        },
        { upsert: true, new: true }
      );
      return { acquired: true, lock: retryLock };
    }
    throw err;
  }
}

async function releaseResourceLock(resourceKey, userId) {
  await ResourceLock.deleteOne({ resourceKey, lockedBy: userId });
}

async function getResourceLockStatus(resourceKey, userId) {
  const now = new Date();
  const lock = await ResourceLock.findOne({ resourceKey, expiresAt: { $gt: now } });
  if (!lock) {
    return { locked: false, isOwner: false, lockedByName: null, expiresAt: null };
  }
  const isOwner = Boolean(userId && String(lock.lockedBy) === String(userId));
  return {
    locked: true,
    isOwner,
    lockedBy: lock.lockedBy,
    lockedByName: lock.lockedByName,
    expiresAt: lock.expiresAt,
  };
}

/**
 * Checks whether `resourceKey` is actively locked by someone other than `userId`.
 * Returns null if clear, or a 423 error payload object if locked by another user.
 */
async function checkLockConflict(resourceKey, userId) {
  const status = await getResourceLockStatus(resourceKey, userId);
  if (status.locked && !status.isOwner) {
    return {
      status: 423,
      body: {
        message: `This item is currently being edited or reviewed by ${status.lockedByName}. Please wait until they finish.`,
        code: 'RESOURCE_LOCKED',
        lockedByName: status.lockedByName,
        expiresAt: status.expiresAt,
      },
    };
  }
  return null;
}

module.exports = {
  DEFAULT_LOCK_TTL_MS,
  acquireResourceLock,
  releaseResourceLock,
  getResourceLockStatus,
  checkLockConflict,
};

