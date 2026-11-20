// server/controllers/documentController.js
const mongoose = require('mongoose');
const Document = require('../models/Document');
const Requirement = require('../models/Requirement');
const Instructor = require('../models/Instructor');
const Setting = require('../models/Setting');
const AcademicPeriod = require('../models/AcademicPeriod');
const Notification = require('../models/Notification');
const Class = require('../models/Class');
const { STATUS, assertTransition } = require('../constants/documentStatus');
const storageService = require('../utils/storageService');
const driveNaming = require('../utils/driveNaming');
const { logAudit } = require('../utils/auditLog');
const { ACTION } = require('../constants/auditActions');
const { notifyAdmins } = require('../utils/adminNotificationService');
const { checkLockConflict } = require('../utils/resourceLock');
const { REJECT_COMMENT_MAX_WORDS, countWords } = require('../constants/reviewPolicy');
const {
  isActingAsAdmin,
  canUseAdminMode,
  hasDocumentReviewAccess,
} = require('../constants/adminPermissions');

/**
 * Helper to safely parse stringified JSON (from multipart/form-data)
 */
function parseJsonSafe(val, fallback = {}) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}



// =====================================================================================================================
// Search: POST  =======================================================================================
// =====================================================================================================================

/**
 * POST /api/documents/upload
 */

exports.uploadDocument = async (req, res) => {
  try {
    // 1. Check if a file was provided by multer
    if (!req.file) {
      return res.status(400).json({
        message: 'Please select a file to upload.'
      });
    }

    const { requirementKey, documentId, academicPeriodId } = req.body;
    const meta = parseJsonSafe(req.body.meta, {});
    const slot = parseJsonSafe(req.body.slot, {});
    const classIds = parseJsonSafe(req.body.class || req.body.classIds, []);

    if (!requirementKey) {
      return res.status(400).json({
        message: 'requirementKey is required'
      });
    }

    //2. Identify the logged-in Instructor
    const ownerId = req.user.id;
    const instructor = await Instructor.findById(ownerId);
    if (!instructor) {
      return res.status(404).json({
        message: 'Instructor account not found'
      });
    }

    //3. Find the requirement definition (e.g Service Record, TOR,  etc)
    const requirement = await Requirement.findOne({ key: requirementKey })
    if (!requirement) {
      return res.status(404).json
        ({ message: `Requirement "${requirementKey}" not found.` });
    }

    const isClassDoc = Boolean(
      requirementKey?.startsWith('CLASS_') || (Array.isArray(classIds) && classIds.length > 0)
    );

    // Check academic period status for Class Portfolio documents only (Faculty Portfolio is independent of academic year)
    let targetPeriodId = academicPeriodId;
    if (!targetPeriodId) {
      const activePeriod = await AcademicPeriod.findOne({ isCurrent: true });
      if (activePeriod) targetPeriodId = activePeriod._id;
    }

    if (isClassDoc && targetPeriodId) {
      const targetPeriod = await AcademicPeriod.findById(targetPeriodId);
      if (targetPeriod && (targetPeriod.status === 'Closed' || targetPeriod.status === 'Archived')) {
        return res.status(403).json({
          message: `The academic period (${targetPeriod.schoolYear} · ${targetPeriod.semester} Semester) is ${targetPeriod.status.toLowerCase()}. Submissions and changes are not allowed.`,
        });
      }
    }

    // 3b. Determine effective class IDs and academic period
    let effectiveClassIds = classIds;
    const isSharedLoadReport = requirementKey === 'CLASS_A_LOAD_REPORT';
    if (isSharedLoadReport) {
      const Class = require('../models/Class');
      const instClasses = await Class.find({
        ownerId,
        ...(targetPeriodId ? { academicPeriodId: targetPeriodId } : {}),
        archivedAt: null,
      }).select('_id');
      const idSet = new Set([...classIds.map(String), ...instClasses.map((c) => c._id.toString())]);
      effectiveClassIds = Array.from(idSet);
    }

    //4. Check if replacing an existing document or creating a new one
    let existingDoc = null;
    if (documentId) {
      existingDoc = await Document.findOne({ _id: documentId, ownerId });
    } else if (isSharedLoadReport) {
      // A 1.0 Instructional Load Report is one shared record per instructor + academic period
      existingDoc = await Document.findOne({
        ownerId,
        requirementKey: 'CLASS_A_LOAD_REPORT',
        academicPeriodId: targetPeriodId || null,
        archivedAt: null,
      });
    } else if (!requirement.multiple) {
      //Single-entry requirement: check if a record already exists
      const slotKey = Document.buildSlotKey({
        ownerId,
        requirementKey,
        academicPeriodId: academicPeriodId || null,
        classIds,
        slot,
      });
      existingDoc = await Document.findOne({ slotKey });
    }

    //5. If replacing an existing document, delete old file from Google Drive
    if (existingDoc && existingDoc.versions && existingDoc.versions.length > 0) {
      for (const oldVer of existingDoc.versions) {
        if (oldVer.driveFileId) {
          try {
            await storageService.deleteFile(oldVer.driveFileId);
          } catch (delErr) {
            console.warn(`Could not delete old file from Drive: ${oldVer.driveFileId}`, delErr.message);
          }
        }
      }
    }

    //6. Build Google Drive folder path and filename
    let folderPath;
    if (isSharedLoadReport) {
      const AcademicPeriod = require('../models/AcademicPeriod');
      const period = targetPeriodId ? await AcademicPeriod.findById(targetPeriodId) : null;
      folderPath = driveNaming.classFolderPath({
        department: instructor.department || 'General',
        fullName: instructor.fullName,
        instructorId: ownerId,
        period: period || { schoolYear: '2026-2027', semester: '1st' },
        classDoc: null, // "All classes" shared folder
      });
    } else if (requirement.scope === 'class' && classIds.length > 0) {
      const Class = require('../models/Class');
      const AcademicPeriod = require('../models/AcademicPeriod');
      const classDoc = await Class.findById(classIds[0]);
      let period = null;
      if (academicPeriodId) {
        period = await AcademicPeriod.findById(academicPeriodId);
      } else if (classDoc?.academicPeriodId) {
        period = await AcademicPeriod.findById(classDoc.academicPeriodId);
      }
      folderPath = driveNaming.classFolderPath({
        department: instructor.department || 'General',
        fullName: instructor.fullName,
        instructorId: ownerId,
        period: period || { schoolYear: '2026-2027', semester: '1st' },
        classDoc,
        co: slot.co || null,
      });
    } else {
      folderPath = driveNaming.facultyFolderPath({
        department: instructor.department || 'General',
        fullName: instructor.fullName,
        instructorId: ownerId,
        requirement,
      });
    }

    const targetDocId = existingDoc ? existingDoc._id : new mongoose.Types.ObjectId();
    const fileName = driveNaming.buildFileName({
      slot: meta.name || requirement.label || requirement.card,
      version: 1,
      originalName: req.file.originalname,
      documentId: targetDocId,
    });

    // Check if Google Drive is enabled in settings
    const driveSetting = await Setting.findOne({ key: 'googleDriveEnabled' });
    if (driveSetting && driveSetting.value === false) {
      return res.status(503).json({
        message: 'Google Drive file uploads are temporarily disabled by the administrator.',
      });
    }

    //7. Upload the file to Google Drive
    const driveUpload = await storageService.uploadFile({
      instructorId: ownerId,
      folderPath,
      buffer: req.file.buffer,
      fileName,
      mimeType: req.file.mimetype,
    });

    //8. Prepare the single active file record
    const newVersion = {
      n: 1,
      driveFileId: driveUpload.fileId,
      driveFolderId: driveUpload.folderId || null,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: driveUpload.size,
      checksum: driveUpload.checksum,
      uploadedAt: new Date(),
      uploadedBy: ownerId,
      review: null,
    };

    let savedDoc;
    if (existingDoc) {
      //Update the existing MongoDB record
      existingDoc.versions = [newVersion];
      existingDoc.currentVersion = 1;
      existingDoc.status = STATUS.PENDING_REVIEW;
      existingDoc.submittedAt = new Date();

      if (isSharedLoadReport) {
        existingDoc.classIds = effectiveClassIds;
        existingDoc.academicPeriodId = targetPeriodId || existingDoc.academicPeriodId;
        existingDoc.slotKey = Document.buildSlotKey({
          ownerId,
          requirementKey,
          academicPeriodId: targetPeriodId || existingDoc.academicPeriodId,
          classIds: [],
          slot,
        });
      }

      if (Object.keys(meta).length > 0) {
        existingDoc.meta = { ...existingDoc.meta, ...meta };
      }

      savedDoc = await existingDoc.save();
    } else {
      //Create a brand new MongoDB record
      const slotKey = !requirement.multiple
        ? Document.buildSlotKey({
          ownerId,
          requirementKey,
          academicPeriodId: targetPeriodId || academicPeriodId || null,
          classIds: isSharedLoadReport ? [] : effectiveClassIds,
          slot,
        })
        : undefined;

      savedDoc = await Document.create({
        _id: targetDocId,
        requirementKey,
        ownerId,
        classIds: effectiveClassIds,
        slot,
        academicPeriodId: targetPeriodId || academicPeriodId || null,
        meta,
        slotKey,
        status: STATUS.PENDING_REVIEW,
        currentVersion: 1,
        versions: [newVersion],
        submittedAt: new Date(),
      });
    }

    const docName = requirement.label || requirement.card || requirement.name || requirementKey;
    const isReupload = Boolean(existingDoc);
    const wasRejected = existingDoc && existingDoc.status === STATUS.REJECTED;

    await logAudit({
      actor: instructor,
      action: isReupload ? ACTION.DOC_REUPLOAD : ACTION.DOC_UPLOAD,
      targetType: 'document',
      targetId: savedDoc._id,
      targetLabel: docName,
      documentName: docName,
      fileName: req.file.originalname,
      details: isReupload
        ? `Re-uploaded ${req.file.originalname} for ${docName}`
        : `Uploaded ${req.file.originalname} for ${docName}`,
      meta: {
        requirementKey,
        document: docName,
        fileName: req.file.originalname,
        fileSize: req.file.size,
      },
      req,
    });

    // Notify administrators of new submission or re-upload
    try {
      const instructorName = instructor.fullName || 'An instructor';
      let adminActionLink = `/admin/instructors/${ownerId}`;
      let classSuffix = '';

      if (requirement.scope === 'class' && classIds.length > 0) {
        adminActionLink = `/admin/class-portfolio/${classIds[0]}/${requirement.key.replace(/^CLASS_/, '').toLowerCase().replace(/_/g, '-')}`;
        const classObj = await Class.findById(classIds[0]).lean();
        if (classObj) {
          classSuffix = ` (${classObj.subject?.code || ''} · ${classObj.section?.code || ''})`;
        }
      } else {
        adminActionLink = `/admin/review/faculty-portfolio?instructorId=${ownerId}`;
      }

      if (wasRejected) {
        await notifyAdmins({
          type: 'resubmission',
          title: 'File Resubmitted',
          message: `${instructorName} re-uploaded a rejected document for ${docName}${classSuffix}.`,
          documentId: savedDoc._id,
          requirementKey,
          actionLink: adminActionLink,
          senderId: ownerId,
          category: 'pending_review',
        });
      } else if (isReupload) {
        await notifyAdmins({
          type: 'document_submitted',
          title: 'Document Updated',
          message: `${instructorName} uploaded a new version of ${docName}${classSuffix}.`,
          documentId: savedDoc._id,
          requirementKey,
          actionLink: adminActionLink,
          senderId: ownerId,
          category: 'pending_review',
        });
      } else {
        await notifyAdmins({
          type: 'document_submitted',
          title: 'New Document Uploaded',
          message: `${instructorName} submitted a file for ${docName}${classSuffix}.`,
          documentId: savedDoc._id,
          requirementKey,
          actionLink: adminActionLink,
          senderId: ownerId,
          category: 'pending_review',
        });
      }
    } catch (notifAdminErr) {
      console.warn('Could not notify admins of document upload:', notifAdminErr.message);
    }

    //9. Send success response back to the client
    return res.status(201).json({
      message: 'File uploaded successfully.',
      document: savedDoc,
    });

  } catch (err) {
    console.error('Error in uploadDocument:', err);
    return res.status(500).json({
      message: err.message || 'Failed to upload file.',
    });
  }
};




// =====================================================================================================================
// Search: GET  =======================================================================================
// List documents for an instructor (filtered by requirementKey, etc.)
// =====================================================================================================================

exports.getDocuments = async (req, res) => {
  try {
    const { requirementKey, instructorId, ownerId, academicPeriodId, status, classId } = req.query;

    const filter = { archivedAt: null };
    const targetOwnerId = instructorId || ownerId;
    if (isActingAsAdmin(req.user)) {
      if (targetOwnerId) {
        filter.ownerId = targetOwnerId;
      }
    } else {
      filter.ownerId = req.user.id;
    }
    if (requirementKey) filter.requirementKey = requirementKey;
    if (academicPeriodId) filter.academicPeriodId = academicPeriodId;
    if (status) filter.status = status;

    if (requirementKey === 'CLASS_A_LOAD_REPORT') {
      // A 1.0 Instructional Load Report is shared across all classes of that instructor for the academic period
      if (classId && !filter.academicPeriodId) {
        const cls = await Class.findById(classId).select('academicPeriodId ownerId');
        if (cls) {
          if (!filter.ownerId) filter.ownerId = cls.ownerId;
          filter.academicPeriodId = cls.academicPeriodId;
        }
      }
      // Do not restrict by single classId so all classes of that instructor/period see the shared load report
    } else if (classId) {
      filter.classIds = classId;
    }

    const documents = await Document.find(filter)
      .sort({ updatedAt: -1 })
      .lean();

    // If a shared load report was found and classId is specified, ensure classId is linked
    if (requirementKey === 'CLASS_A_LOAD_REPORT' && classId && documents.length > 0) {
      const doc = documents[0];
      const hasClass = (doc.classIds || []).some((cid) => String(cid) === String(classId));
      if (!hasClass) {
        await Document.updateOne({ _id: doc._id }, { $addToSet: { classIds: classId } });
      }
    }

    return res.json(documents);
  } catch (err) {
    console.error('Error in getDocuments:', err);
    return res.status(500).json({ message: 'Failed to fetch documents.' });
  }
};


// =====================================================================================================================
// Search: PREVIEW  =======================================================================================
// GET /api/documents/:id
// Get single document details
// =====================================================================================================================

exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const isOwner = String(doc.ownerId) === String(req.user.id);
    const isAdmin = isActingAsAdmin(req.user);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    return res.json(doc);
  } catch (err) {
    console.error('Error in getDocumentById:', err);
    return res.status(500).json({ message: 'Failed to fetch document.' });
  }
};


/**
 * GET /api/documents/:id/file
 * Stream document content from Google Drive to the browser
 */
exports.streamDocumentFile = async (req, res) => {
  try {
    const { id } = req.params;
    const versionNum = req.query.version ? parseInt(req.query.version, 10) : null;

    const doc = await Document.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    // Permission check: Owner or Administrator
    const isOwner = String(doc.ownerId) === String(req.user.id);
    const isAdmin = isActingAsAdmin(req.user);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Locate requested or current version
    const targetVer = versionNum
      ? doc.versions.find((v) => Number(v.n) === Number(versionNum))
      : doc.versions.find((v) => v.n === doc.currentVersion) || doc.versions[doc.versions.length - 1];

    if (!targetVer || !targetVer.driveFileId) {
      return res.status(404).json({ message: 'File version not found in storage.' });
    }

    // Fetch stream from Google Drive
    const fileData = await storageService.getFile(targetVer.driveFileId);

    res.setHeader('Content-Type', targetVer.mimeType || fileData.mimeType || 'application/octet-stream');
    if (fileData.size) {
      res.setHeader('Content-Length', fileData.size);
    }
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(targetVer.originalName || fileData.name)}"`
    );

    fileData.stream.on('error', (streamErr) => {
      console.error('Drive stream error:', streamErr);
      if (!res.headersSent) res.status(500).json({ message: 'Error streaming file.' });
    });

    fileData.stream.pipe(res);
  } catch (err) {
    console.error('Error in streamDocumentFile:', err);
    if (!res.headersSent) {
      return res.status(500).json({ message: err.message || 'Failed to stream document file.' });
    }
  }
};

/**
 * PATCH /api/documents/:id/review
 * Admin review endpoint (Approve or Reject with comment)
 */
exports.reviewDocument = async (req, res) => {
  try {
    const reviewer = await Instructor.findById(req.user.id).select(
      'accountType accountStatus adminAccess'
    );
    if (
      !reviewer ||
      reviewer.accountStatus !== 'Active' ||
      !isActingAsAdmin(req.user) ||
      !canUseAdminMode(reviewer)
    ) {
      return res.status(403).json({ message: 'Only administrators can review documents.' });
    }

    const { id } = req.params;
    const { decision, comment, expectedVersion } = req.body;

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be "approved" or "rejected".' });
    }

    if (decision === 'rejected' && (!comment || !comment.trim())) {
      return res.status(400).json({ message: 'A comment is required when rejecting a document.' });
    }

    if (decision === 'rejected' && countWords(comment) > REJECT_COMMENT_MAX_WORDS) {
      return res.status(400).json({
        message: `The reason for rejection must be ${REJECT_COMMENT_MAX_WORDS} words or fewer.`,
      });
    }

    // Pessimistic lock check: block if another admin currently holds the review lock
    const lockConflict = await checkLockConflict(`document:${id}`, req.user.id);
    if (lockConflict) {
      return res.status(lockConflict.status).json(lockConflict.body);
    }

    const doc = await Document.findById(id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    if (String(doc.instructorId || doc.ownerId) === String(req.user.id)) {
      return res.status(403).json({
        message: 'You cannot review your own documents.',
      });
    }

    if (!hasDocumentReviewAccess(reviewer, doc.requirementKey)) {
      return res.status(403).json({
        message: 'You do not have permission to review this requirement type.',
      });
    }

    // Optimistic lock check: reject stale writes if document was already updated
    if (expectedVersion !== undefined && expectedVersion !== null && Number(expectedVersion) !== doc.__v) {
      return res.status(409).json({
        message: 'This document was just updated by another reviewer. Please refresh and try again.',
        code: 'VERSION_CONFLICT',
      });
    }

    const targetStatus = decision === 'approved' ? STATUS.APPROVED : STATUS.REJECTED;

    // Attach review to current version
    const currentVersionObj = doc.versions.find((v) => v.n === doc.currentVersion);
    if (currentVersionObj) {
      currentVersionObj.review = {
        decision,
        by: req.user.id,
        comment: comment ? comment.trim() : '',
        at: new Date(),
      };
    }

    doc.status = targetStatus;
    doc.reviewedAt = new Date();
    doc.increment();
    await doc.save();

    const reqDef = await Requirement.findOne({ key: doc.requirementKey });
    const docName = reqDef ? (reqDef.label || reqDef.card) : doc.requirementKey;
    const currentVer = doc.versions?.find((v) => v.n === doc.currentVersion);
    const fileName = currentVer?.originalName || 'file';

    // Create Notification for the document owner
    try {
      const reqTitle = docName;

      let classInfoStr = '';
      let actionLink = null;
      if (doc.classIds && doc.classIds.length > 0) {
        const cls = await Class.findById(doc.classIds[0]);
        if (cls) {
          const sCode = cls.subject?.code || '';
          const secCode = cls.section?.code || cls.section?.name || '';
          classInfoStr = ` for ${sCode} · ${secCode}`;
          actionLink = `/instructors/class-portfolio/${cls._id}`;
        }
      } else {
        actionLink = '/instructors/faculty-portfolio';
      }

      const legacyType = decision === 'approved' ? 'document_approved' : 'document_rejected';
      const uiType = decision === 'approved' ? 'approved' : 'resubmission';
      const notifTitle =
        decision === 'approved' ? 'Document Approved' : 'Resubmission Requested';
      let message = '';

      if (decision === 'approved') {
        message = `${reqTitle}${classInfoStr} was approved.`;
      } else {
        const commentPart = comment && comment.trim() ? ` Comment: "${comment.trim()}"` : '';
        message = `A new version of ${reqTitle}${classInfoStr} was requested.${commentPart}`;
      }

      console.log(`[Notification] Creating notification for owner ${doc.ownerId}: ${message}`);

      try {
        await Notification.create({
          userId: doc.ownerId,
          type: uiType,
          title: notifTitle,
          message,
          comment: comment ? comment.trim() : '',
          documentId: doc._id,
          requirementKey: doc.requirementKey,
          actionLink,
          senderId: req.user.id,
          category: decision === 'approved' ? 'all' : 'pending_review',
        });
      } catch (insertErr) {
        // If MongoDB collection level validator restricts 'type' enum to legacy values, fallback to legacy type
        console.warn('[Notification] Primary insert failed, trying legacy enum format:', insertErr.message);
        await Notification.create({
          userId: doc.ownerId,
          type: legacyType,
          title: notifTitle,
          message,
          comment: comment ? comment.trim() : '',
          documentId: doc._id,
          requirementKey: doc.requirementKey,
          actionLink,
          senderId: req.user.id,
          category: decision === 'approved' ? 'all' : 'pending_review',
        });
      }
    } catch (notifErr) {
      console.error('Could not create notification for review:', notifErr);
    }

    await logAudit({
      actor: req.user,
      action: decision === 'approved' ? ACTION.DOC_APPROVE : ACTION.DOC_REJECT,
      targetType: 'document',
      targetId: doc._id,
      targetLabel: docName,
      documentName: docName,
      fileName,
      details: decision === 'approved' ? `Approved document ${fileName}` : `Rejected document ${fileName}: ${comment || ''}`,
      meta: { decision, comment, document: docName, fileName },
      req,
    });

    return res.json({
      message: `Document successfully ${decision}.`,
      document: doc,
    });
  } catch (err) {
    if (err?.name === 'VersionError') {
      return res.status(409).json({
        message: 'This document was just updated by another reviewer. Please refresh and try again.',
        code: 'VERSION_CONFLICT',
      });
    }
    console.error('Error in reviewDocument:', err);
    return res.status(500).json({ message: err.message || 'Failed to review document.' });
  }
};

/**
 * DELETE /api/documents/:id
 * Remove draft or rejected document entry
 */

exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    // Permission check: Owner or Administrator
    const isOwner = String(doc.ownerId) === String(req.user.id);
    const isAdmin = isActingAsAdmin(req.user);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Check if period is closed or archived (Class Portfolio only; Faculty Portfolio is independent of academic year)
    const isClassDoc = Boolean(
      doc.requirementKey?.startsWith('CLASS_') || (Array.isArray(doc.classIds) && doc.classIds.length > 0)
    );
    if (isClassDoc && doc.academicPeriodId) {
      const period = await AcademicPeriod.findById(doc.academicPeriodId);
      if (period && (period.status === 'Closed' || period.status === 'Archived')) {
        return res.status(403).json({
          message: `This document belongs to a ${period.status.toLowerCase()} academic period. Deletions and modifications are locked.`,
        });
      }
    }

    // Business rule: Approved documents cannot be deleted by instructors
    if (!isAdmin && doc.status === STATUS.APPROVED) {
      return res.status(400).json({ message: 'Approved documents cannot be deleted.' });
    }

    // Clean up physical files in Google Drive
    if (doc.versions && doc.versions.length > 0) {
      for (const ver of doc.versions) {
        if (ver.driveFileId) {
          try {
            await storageService.deleteFile(ver.driveFileId);
          } catch (delErr) {
            console.warn(`Could not delete file ${ver.driveFileId} from Drive:`, delErr.message);
          }
        }
      }
    }

    const reqDef = await Requirement.findOne({ key: doc.requirementKey });
    const docName = reqDef ? (reqDef.label || reqDef.card) : doc.requirementKey;
    const currentVer = doc.versions?.[doc.versions.length - 1];
    const fileName = currentVer?.originalName || 'file';

    // Delete MongoDB document
    await Document.findByIdAndDelete(id);

    await logAudit({
      actor: req.user,
      action: ACTION.DOC_DELETE,
      targetType: 'document',
      targetId: id,
      targetLabel: docName,
      documentName: docName,
      fileName,
      details: `Deleted ${fileName} from ${docName}`,
      meta: {
        document: docName,
        fileName,
        requirementKey: doc.requirementKey,
      },
      req,
    });

    return res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (err) {
    console.error('Error in deleteDocument:', err);
    return res.status(500).json({ message: err.message || 'Failed to delete document.' });
  }
};

/**
 * PATCH /api/documents/:id
 * Update document details/metadata
 */
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { meta } = req.body;

    const doc = await Document.findById(id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const isOwner = String(doc.ownerId) === String(req.user.id);
    const isAdmin = isActingAsAdmin(req.user);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Check if period is closed or archived (Class Portfolio only; Faculty Portfolio is independent of academic year)
    const isClassDoc = Boolean(
      doc.requirementKey?.startsWith('CLASS_') || (Array.isArray(doc.classIds) && doc.classIds.length > 0)
    );
    if (isClassDoc && doc.academicPeriodId) {
      const period = await AcademicPeriod.findById(doc.academicPeriodId);
      if (period && (period.status === 'Closed' || period.status === 'Archived')) {
        return res.status(403).json({
          message: `This document belongs to a ${period.status.toLowerCase()} academic period. Deletions and modifications are locked.`,
        });
      }
    }

    if (meta && typeof meta === 'object') {
      doc.meta = { ...doc.meta, ...meta };
    }
    await doc.save();

    const reqDef = await Requirement.findOne({ key: doc.requirementKey });
    const docName = reqDef ? (reqDef.label || reqDef.card) : doc.requirementKey;
    const currentVer = doc.versions?.find((v) => v.n === doc.currentVersion) || doc.versions?.[doc.versions.length - 1];
    const fileName = currentVer?.originalName || 'file';

    await logAudit({
      actor: req.user,
      action: ACTION.DOC_EDIT,
      targetType: 'document',
      targetId: id,
      targetLabel: docName,
      documentName: docName,
      fileName,
      details: `Edited details for ${docName} (${fileName})`,
      meta: {
        document: docName,
        fileName,
        requirementKey: doc.requirementKey,
      },
      req,
    });

    return res.json({ message: 'Document updated successfully.', document: doc });
  } catch (err) {
    console.error('Error in updateDocument:', err);
    return res.status(500).json({ message: err.message || 'Failed to update document.' });
  }
};

/**
 * GET /api/documents/summary/faculty
 * Get aggregated counts per card for Faculty Portfolio overview
 */
exports.getFacultyPortfolioSummary = async (req, res) => {
  try {
    let targetOwnerId = req.user.id;
    if (isActingAsAdmin(req.user)) {
      if (req.query.instructorId) {
        targetOwnerId = req.query.instructorId;
      } else {
        return res.json({});
      }
    }

    // Fetch all active faculty requirements
    const requirements = await Requirement.find({ scope: 'faculty', active: true }).lean();
    const facultyKeys = requirements.map((r) => r.key);

    // Fetch only active faculty documents submitted by this instructor (excluding class documents and archived)
    const documents = await Document.find({
      ownerId: targetOwnerId,
      archivedAt: null,
      requirementKey: { $in: facultyKeys },
      $or: [{ classIds: { $exists: false } }, { classIds: { $size: 0 } }],
    }).lean();

    // Map requirement keys to card names
    const reqKeyToCard = {};
    for (const r of requirements) {
      reqKeyToCard[r.key] = r.card;
    }

    // Card path map matching requirement cards
    const cardNameToPath = {
      'Educational Attainment': 'educational-attainment',
      'Service Records': 'service-records',
      'Seminars and Workshops': 'seminars-and-workshops',
      'List of Seminars and Workshops': 'seminars-and-workshops',
      'Achievements': 'achievements',
      'Grants, Awards and Certifications of Commendation': 'achievements',
      'Research': 'research',
      'Extension Involvement': 'extension-involvement',
      'Production': 'production',
      'Other Requirements': 'professional-organization-membership',
      'Membership to Professional Organization': 'professional-organization-membership',
      'Professional Organization Membership': 'professional-organization-membership',
      'Passed Licensure Examinations': 'passed-licensure-examinations',
      'IPCR': 'ipcr',
      'Other Documents': 'professional-organization-membership',
    };

    const summaries = {};

    for (const doc of documents) {
      const cardName = reqKeyToCard[doc.requirementKey];
      if (!cardName) continue;
      const cardPath = cardNameToPath[cardName];
      if (!cardPath) continue;

      if (!summaries[cardPath]) {
        summaries[cardPath] = {
          approved: 0,
          pendingReview: 0,
          rejected: 0,
          draft: 0,
          totalFiles: 0,
          commentCount: 0,
          previewed: false,
        };
      }

      summaries[cardPath].totalFiles += 1;

      if (doc.status === STATUS.APPROVED) summaries[cardPath].approved += 1;
      else if (doc.status === STATUS.PENDING_REVIEW) summaries[cardPath].pendingReview += 1;
      else if (doc.status === STATUS.REJECTED) {
        summaries[cardPath].rejected += 1;
        summaries[cardPath].commentCount += 1;
      } else if (doc.status === STATUS.DRAFT) {
        summaries[cardPath].draft += 1;
      }
    }

    return res.json(summaries);
  } catch (err) {
    console.error('Error in getFacultyPortfolioSummary:', err);
    return res.status(500).json({ message: 'Failed to calculate summary.' });
  }
};