// server/controllers/notificationController.js
const Notification = require('../models/Notification');
const Instructor = require('../models/Instructor');
const { isActingAsAdmin } = require('../constants/adminPermissions');

const ADMIN_TITLE_REGEX = /^(New Document|User Mode|Role Switch|User Role|Instructor Admin|Failed Admin|Failed Role|Instructor Invited)/i;

function buildAudienceFilter(actingAsAdmin) {
  if (actingAsAdmin) {
    return {
      $or: [
        { audience: 'admin' },
        {
          audience: null,
          $or: [
            { category: 'pending_review' },
            { type: 'document_submitted' },
            { title: ADMIN_TITLE_REGEX },
          ],
        },
        {
          audience: { $exists: false },
          $or: [
            { category: 'pending_review' },
            { type: 'document_submitted' },
            { title: ADMIN_TITLE_REGEX },
          ],
        },
      ],
    };
  }

  return {
    $or: [
      { audience: 'instructor' },
      {
        $or: [{ audience: null }, { audience: { $exists: false } }],
        category: { $ne: 'pending_review' },
        type: { $ne: 'document_submitted' },
        title: { $not: ADMIN_TITLE_REGEX },
      },
    ],
  };
}

/**
 * GET /api/notifications
 * Fetch notifications for the current authenticated user, scoped to active role
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.query;
    const actingAsAdmin = isActingAsAdmin(req.user);

    const filter = {
      userId,
      ...buildAudienceFilter(actingAsAdmin),
    };
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
      .populate('senderId', 'fullName email profile.photoUrl googlePhotoUrl department accountType')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    let defaultAdmin = null;
    const hasUnsetSender = notifications.some(
      (n) => !n.senderId && ['approved', 'document_approved', 'resubmission', 'document_rejected'].includes(n.type)
    );
    if (hasUnsetSender) {
      defaultAdmin = await Instructor.findOne({ accountType: 'Administrator' })
        .select('fullName email profile.photoUrl googlePhotoUrl department accountType')
        .lean();
    }

    const enriched = notifications.map((n) => {
      if (!n.senderId && ['approved', 'document_approved', 'resubmission', 'document_rejected'].includes(n.type)) {
        return {
          ...n,
          senderId: defaultAdmin || { fullName: 'Administrator', accountType: 'Administrator' },
        };
      }
      return n;
    });

    return res.json(enriched);
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
    const actingAsAdmin = isActingAsAdmin(req.user);
    await Notification.updateMany(
      { userId, readAt: null, ...buildAudienceFilter(actingAsAdmin) },
      { $set: { readAt: new Date() } }
    );
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

/**
 * DELETE /api/notifications/clear-all
 * Delete all notifications for current user
 */
exports.clearAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await Notification.deleteMany({ userId });
    return res.json({
      message: 'All notifications deleted.',
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error('Error in clearAll notifications:', err);
    return res.status(500).json({ message: 'Failed to delete notifications.' });
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a single notification belonging to the current user
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notif = await Notification.findOneAndDelete({ _id: id, userId });

    if (!notif) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    return res.json({ message: 'Notification deleted.', id });
  } catch (err) {
    console.error('Error in deleteNotification:', err);
    return res.status(500).json({ message: 'Failed to delete notification.' });
  }
};

