const {
  acquireResourceLock,
  releaseResourceLock,
  getResourceLockStatus,
} = require('../utils/resourceLock');

exports.acquireLock = async (req, res) => {
  try {
    const { resourceKey } = req.body;
    if (!resourceKey || typeof resourceKey !== 'string') {
      return res.status(400).json({ message: 'resourceKey is required.' });
    }

    const { acquired, lock } = await acquireResourceLock(resourceKey.trim(), req.user);
    return res.json({
      acquired,
      locked: true,
      isOwner: acquired,
      lockedBy: lock.lockedBy,
      lockedByName: lock.lockedByName,
      expiresAt: lock.expiresAt,
    });
  } catch (err) {
    console.error('acquireLock error:', err);
    return res.status(500).json({ message: 'Failed to acquire resource lock.' });
  }
};

exports.releaseLock = async (req, res) => {
  try {
    const { resourceKey } = req.body;
    if (!resourceKey || typeof resourceKey !== 'string') {
      return res.status(400).json({ message: 'resourceKey is required.' });
    }

    await releaseResourceLock(resourceKey.trim(), req.user.id);
    return res.json({ released: true });
  } catch (err) {
    console.error('releaseLock error:', err);
    return res.status(500).json({ message: 'Failed to release resource lock.' });
  }
};

exports.getLockStatus = async (req, res) => {
  try {
    const { resourceKey } = req.query;
    if (!resourceKey || typeof resourceKey !== 'string') {
      return res.status(400).json({ message: 'resourceKey query parameter is required.' });
    }

    const status = await getResourceLockStatus(resourceKey.trim(), req.user.id);
    return res.json(status);
  } catch (err) {
    console.error('getLockStatus error:', err);
    return res.status(500).json({ message: 'Failed to check resource lock.' });
  }
};

