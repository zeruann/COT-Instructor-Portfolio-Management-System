// server/middleware/adminAccess.js
const Instructor = require('../models/Instructor');
const {
  canUseAdminMode,
  hasAdminPageAccess,
  hasDocumentReviewAccess,
} = require('../constants/adminPermissions');

/**
 * Loads the live user record from MongoDB and verifies they are allowed
 * to perform Administrator-mode actions (and optionally a specific admin page).
 */
function requireAdminAccess(pageKey = null) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Not authenticated.' });
      }

      const user = await Instructor.findById(req.user.id).select(
        'fullName email accountType accountStatus adminAccess profile googlePhotoUrl'
      );
      if (!user || user.accountStatus !== 'Active') {
        return res.status(403).json({ message: 'Account is not active.' });
      }

      const effectiveMode =
        req.user.activeRole ||
        (user.accountType === 'Administrator' ? 'admin' : 'instructor');

      if (effectiveMode !== 'admin' || !canUseAdminMode(user)) {
        return res.status(403).json({
          message: 'Administrator access is required for this action.',
        });
      }

      if (pageKey && !hasAdminPageAccess(user, pageKey)) {
        return res.status(403).json({
          message: 'You do not have permission to access this page.',
        });
      }

      req.currentUser = user;
      next();
    } catch (err) {
      console.error('requireAdminAccess error:', err);
      res.status(500).json({ message: 'Failed to verify administrator permissions.' });
    }
  };
}

function ensureDocumentReviewAccess(user, requirementKey) {
  return hasDocumentReviewAccess(user, requirementKey);
}

module.exports = {
  requireAdminAccess,
  ensureDocumentReviewAccess,
};

