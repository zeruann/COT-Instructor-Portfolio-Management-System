const mongoose = require('mongoose');
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
async function logAudit({
  actor,
  action,
  outcome = 'success',
  targetType,
  targetId,
  targetLabel,
  details,
  documentName,
  fileName,
  logId,
  meta,
  req,
}) {
  try {
    const type = actor && actor.accountType;
    const currentYear = new Date().getFullYear();

    let generatedLogId = logId;
    if (!generatedLogId) {
      try {
        const latestLog = await AuditLog.findOne({
          logId: new RegExp(`^LOG${currentYear}-\\d+`),
        })
          .sort({ at: -1 })
          .select('logId')
          .lean();

        let nextNum = 1;
        if (latestLog && latestLog.logId) {
          const match = latestLog.logId.match(new RegExp(`^LOG${currentYear}-(\\d+)`));
          if (match && match[1]) {
            nextNum = parseInt(match[1], 10) + 1;
          }
        } else {
          const count = await AuditLog.countDocuments({
            at: {
              $gte: new Date(currentYear, 0, 1),
              $lte: new Date(currentYear, 11, 31, 23, 59, 59, 999),
            },
          });
          nextNum = count + 1;
        }
        generatedLogId = `LOG${currentYear}-${String(nextNum).padStart(4, '0')}`;
      } catch {
        generatedLogId = `LOG${currentYear}-${String(Math.floor(1 + Math.random() * 9999)).padStart(4, '0')}`;
      }
    }

    const actorRole = actor
      ? (type === 'Administrator' ? 'Administrator' : 'Instructor')
      : 'System';
    const actorId = actor ? (actor._id || actor.id) : null;
    const actorName = actor
      && (actor.fullName || actor.name || actor.email)
        ? actor.fullName || actor.name || actor.email
        : 'System';

    await AuditLog.create({
      logId: generatedLogId,
      actorId: actorId ? new mongoose.Types.ObjectId(String(actorId)) : null,
      actorRole,
      actorName,
      category: String(action).split('.')[0],
      action,
      outcome,
      targetType,
      targetId: targetId ? new mongoose.Types.ObjectId(String(targetId)) : undefined,
      targetLabel,
      details,
      documentName,
      fileName,
      meta,
      ip: req ? (req.ip || req.connection?.remoteAddress) : undefined,
      userAgent: req && req.get ? req.get('user-agent') : undefined,
      at: new Date(),
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { logAudit };
