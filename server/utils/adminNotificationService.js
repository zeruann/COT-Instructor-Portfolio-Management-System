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
  category = 'pending_review',
}) {
  try {
    const admins = await Instructor.find({
      accountType: 'Administrator',
      accountStatus: { $ne: 'Deactivated' },
    }).select('_id');

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

module.exports = {
  notifyAdmins,
};

