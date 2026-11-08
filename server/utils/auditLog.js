const AuditLog = require('../models/AuditLog');

/**
 * Record an action. Call it from any controller, for instructor, admin or system actions.
 * It never throws: a logging problem must not break the request that is being logged.
 *
 *   await logAudit({
 *     actor: req.user,                      // the signed-in account (or null for the system)
 *     action: ACTION.ACCOUNT_DEACTIVATE,
 *     targetType: 'instructor', targetId: instructor._id, targetLabel: instructor.fullName,
 *     meta: { before: { accountStatus: 'Active' }, after: { accountStatus: 'Deactivated' } },
 *     req,                                  // optional: stores IP and browser
 *   });
 */
async function logAudit({ actor, action, outcome = 'success', targetType, targetId, targetLabel, meta, req }) {
  try {
    const type = actor && actor.accountType;
    const actorRole = actor
      ? (type === 'Administrator' ? 'Administrator' : 'Instructor')
      : 'System';
    const actorId = actor ? (actor._id || actor.id) : null;
    const actorName = actor ? (actor.fullName || actor.name || 'User') : 'System';

    await AuditLog.create({
      actorId: actorId ? new mongoose.Types.ObjectId(String(actorId)) : null,
      actorRole,
      actorName,
      category: String(action).split('.')[0],
      action,
      outcome,
      targetType,
      targetId: targetId ? new mongoose.Types.ObjectId(String(targetId)) : undefined,
      targetLabel,
      meta,
      ip: req ? req.ip : undefined,
      userAgent: req && req.get ? req.get('user-agent') : undefined,
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { logAudit };
