const Instructor = require('../models/Instructor');
const { markStaleUsersOffline } = require('../utils/onlineStatus');
const {
  ADMIN_PAGES,
  FACULTY_DOCUMENT_PERMISSIONS,
  CLASS_DOCUMENT_PERMISSIONS,
  normalizeAdminAccess,
  formatAccessSummary,
} = require('../constants/adminPermissions');
const { logAudit } = require('../utils/auditLog');
const { ACTION } = require('../constants/auditActions');
const { notifyAdmins, notifyUser } = require('../utils/adminNotificationService');
const { sendAdminAccessEmail } = require('../utils/sendEmail');

const SAFE_FIELDS = '-password -resetPasswordToken -resetPasswordExpires';

// GET /api/instructors
exports.getInstructors = async (req, res) => {
  try {
    await markStaleUsersOffline();

    const instructors = await Instructor.find({
      $or: [
        { status: 'Accepted' },
        { status: { $exists: false } },
        { status: null },
        { status: '' },
      ],
    })
      .select(SAFE_FIELDS)
      .sort({ createdAt: -1 });
    res.json(instructors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/instructors/:id
exports.getInstructorById = async (req, res) => {
  try {
    await markStaleUsersOffline();

    const instructor = await Instructor.findById(req.params.id).select(SAFE_FIELDS);

    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found.' });
    }

    res.json(instructor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/instructors/:id/status   body: { accountStatus: "Active" | "Deactivated" }
exports.updateInstructorStatus = async (req, res) => {
  try {
    const { accountStatus } = req.body;

    if (!['Active', 'Deactivated'].includes(accountStatus)) {
      return res.status(400).json({ message: 'Invalid account status.' });
    }

    const update = { accountStatus };
    if (accountStatus === 'Deactivated') {
      update.onlineStatus = 'Offline';
      update.lastSeenAt = null;
    }

    const instructor = await Instructor.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).select(SAFE_FIELDS);

    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found.' });
    }

    res.json(instructor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/instructors/permissions/meta
exports.getAdminPermissionsMeta = (req, res) => {
  res.json({
    pages: ADMIN_PAGES,
    facultyDocuments: FACULTY_DOCUMENT_PERMISSIONS,
    classDocuments: CLASS_DOCUMENT_PERMISSIONS,
  });
};

// PATCH /api/instructors/:id/admin-access
exports.updateInstructorAdminAccess = async (req, res) => {
  try {
    const target = await Instructor.findById(req.params.id).select(SAFE_FIELDS);
    if (!target) {
      return res.status(404).json({ message: 'Instructor not found.' });
    }
    if (target.accountType === 'Administrator') {
      return res.status(400).json({ message: 'System Administrators already have full access.' });
    }

    const beforeAccess = {
      enabled: Boolean(target.adminAccess?.enabled),
      scope: target.adminAccess?.scope || 'none',
      pages: target.adminAccess?.pages || [],
      documents: {
        faculty: target.adminAccess?.documents?.faculty || [],
        class: target.adminAccess?.documents?.class || [],
      },
    };

    const normalized = normalizeAdminAccess(req.body);

    if (!beforeAccess.enabled && !normalized.enabled) {
      return res.status(400).json({
        message: 'Select Full Administrator Access or at least one Limited Access permission.',
      });
    }

    const now = new Date();
    const actor = req.currentUser;
    const actorName = actor?.fullName || actor?.email || 'Administrator';
    const targetName = target.fullName || target.email;

    target.adminAccess = {
      ...normalized,
      invitedBy: normalized.enabled ? (actor?._id || null) : null,
      invitedByName: normalized.enabled ? actorName : '',
      grantedAt: normalized.enabled ? (target.adminAccess?.grantedAt || now) : null,
      updatedAt: now,
    };

    await target.save();

    const wasEnabled = beforeAccess.enabled;
    const isEnabled = normalized.enabled;
    const isRevoked = wasEnabled && !isEnabled;
    const isUpdate = wasEnabled && isEnabled;

    const action = isRevoked
      ? ACTION.ADMIN_ACCESS_REVOKE
      : isUpdate
        ? ACTION.ADMIN_ACCESS_UPDATE
        : ACTION.ADMIN_ACCESS_GRANT;

    const accessSummary = formatAccessSummary(normalized);
    const details = isRevoked
      ? `${actorName} revoked Administrator access for ${targetName}`
      : isUpdate
        ? `${actorName} updated Administrator access for ${targetName}: ${accessSummary}`
        : `${actorName} granted Administrator access to ${targetName}: ${accessSummary}`;

    await logAudit({
      actor,
      action,
      outcome: 'success',
      targetType: 'instructor',
      targetId: target._id,
      targetLabel: targetName,
      details,
      meta: { before: beforeAccess, after: normalized },
      req,
    });

    await notifyUser({
      userId: target._id,
      type: 'role_access_updated',
      title: isRevoked
        ? 'Administrator Access Revoked'
        : isUpdate
          ? 'Administrator Access Updated'
          : 'Administrator Access Granted',
      message: details,
      senderId: actor?._id || null,
      category: 'system',
    });

    await notifyAdmins({
      type: 'role_access_updated',
      title: isRevoked
        ? 'Instructor Admin Access Revoked'
        : isUpdate
          ? 'Instructor Admin Access Updated'
          : 'Instructor Admin Access Granted',
      message: details,
      senderId: actor?._id || null,
      category: 'system',
    });

    let emailSent = false;
    if (target.email) {
      try {
        emailSent = Boolean(
          await sendAdminAccessEmail({
            to: target.email,
            fullName: targetName,
            grantedByName: actorName,
            accessSummary,
            isRevoked,
            isUpdate,
          })
        );
      } catch (emailErr) {
        console.warn('Admin access notification email failed:', emailErr.message);
      }
    }

    res.json({
      instructor: target,
      emailSent,
      summary: accessSummary,
    });
  } catch (err) {
    console.error('updateInstructorAdminAccess error:', err);
    res.status(500).json({ message: err.message || 'Failed to update administrator access.' });
  }
};