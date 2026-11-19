// server/utils/adminNotificationService.js
const Notification = require('../models/Notification');
const Instructor = require('../models/Instructor');

/**
 * Dispatches a notification to all active Administrators (or a specific admin)
 */
async function notifyAdmins({
  type = 'notice',
  title,
  message,
  comment = '',
  documentId = null,
  requirementKey = null,
  actionLink = null,
  senderId = null,
  excludeUserId = null,
  category = 'pending_review',
}) {
  try {
    const query = {
      accountType: 'Administrator',
      accountStatus: { $ne: 'Deactivated' },
    };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const admins = await Instructor.find(query).select('_id');

    if (!admins || admins.length === 0) return;

    const notifDocs = admins.map((admin) => ({
      userId: admin._id,
      type,
      title,
      message,
      comment,
      documentId,
      requirementKey,
      actionLink,
      senderId,
      category,
      audience: 'admin',
    }));

    try {
      await Notification.insertMany(notifDocs);
    } catch (insertErr) {
      // Fallback for strict database enum validators
      console.warn('[Admin Notification] Bulk insert fallback attempt:', insertErr.message);
      const fallbackDocs = notifDocs.map((doc) => ({
        ...doc,
        type: doc.type === 'resubmission' ? 'document_rejected' : 'notice',
      }));
      await Notification.insertMany(fallbackDocs);
    }
  } catch (err) {
    console.error('Failed to notify admins:', err.message);
  }
}

async function createNotificationSafe(doc) {
  try {
    await Notification.create(doc);
  } catch (err) {
    console.warn('[Notification] Insert fallback attempt:', err.message);
    await Notification.create({
      ...doc,
      type: 'notice',
    });
  }
}

async function notifyUser({
  userId,
  type = 'notice',
  title,
  message,
  comment = '',
  actionLink = null,
  senderId = null,
  category = 'system',
  audience = 'instructor',
}) {
  if (!userId) return;
  try {
    await createNotificationSafe({
      userId,
      type,
      title,
      message,
      comment,
      actionLink,
      senderId,
      category,
      audience,
    });
  } catch (err) {
    console.error('Failed to notify user:', err.message);
  }
}

module.exports = {
  notifyAdmins,
  notifyUser,
};

