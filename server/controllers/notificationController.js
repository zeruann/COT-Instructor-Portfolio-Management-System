// server/controllers/notificationController.js
const Notification = require('../models/Notification');

/**
 * GET /api/notifications
 * Fetch notifications for the current authenticated user
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.query;

    const filter = { userId };
    if (category && category !== 'all') {
      if (category === 'unread') {
        filter.readAt = null;
      } else if (category === 'pending') {
        filter.category = 'pending_review';
      } else if (category === 'system') {
        filter.category = 'system';
      }
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json(notifications);
  } catch (err) {
    console.error('Error in getNotifications:', err);
    return res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
};

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read for current user
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
    return res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Error in markAllAsRead:', err);
    return res.status(500).json({ message: 'Failed to update notifications.' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { $set: { readAt: new Date() } },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    return res.json(notif);
  } catch (err) {
    console.error('Error in markAsRead:', err);
    return res.status(500).json({ message: 'Failed to update notification.' });
  }
};

