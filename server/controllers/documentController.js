// server/controllers/documentController.js
const mongoose = require('mongoose');
const Document = require('../models/Document');
const Requirement = require('../models/Requirement');
const Instructor = require('../models/Instructor');
const Setting = require('../models/Setting');
const AcademicPeriod = require('../models/AcademicPeriod');
const { STATUS, assertTransition } = require('../constants/documentStatus');
const storageService = require('../utils/storageService');
const driveNaming = require('../utils/driveNaming');
const { logAudit } = require('../utils/auditLog');
const { ACTION } = require('../constants/auditActions');

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
    const classIds = parseJsonSafe(req.body.class, []);

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

    // Check academic period status: if specified or default active period is closed/archived
    let targetPeriodId = academicPeriodId;
    if (!targetPeriodId) {
      const activePeriod = await AcademicPeriod.findOne({ isCurrent: true });
      if (activePeriod) targetPeriodId = activePeriod._id;
    }

    if (targetPeriodId) {
      const targetPeriod = await AcademicPeriod.findById(targetPeriodId);
      if (targetPeriod && (targetPeriod.status === 'Closed' || targetPeriod.status === 'Archived')) {
        return res.status(403).json({
          message: `The academic period (${targetPeriod.schoolYear} · ${targetPeriod.semester} Semester) is ${targetPeriod.status.toLowerCase()}. Submissions and changes are not allowed.`,
        });
      }
    }

    //4. Check if replacing an existing document or creating a new one
    let existingDoc = null;
    if (documentId) {
      existingDoc = await Document.findOne({ _id: documentId, ownerId });
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
    const folderPath = driveNaming.facultyFolderPath({
      department: instructor.department || 'General',
      fullName: instructor.fullName,
      instructorId: ownerId,
      requirement,
    });

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
          academicPeriodId: academicPeriodId || null,
          classIds,
          slot,
        })

        : undefined;


      savedDoc = await Document.create({
        _id: targetDocId,
        requirementKey,
        ownerId,
        classIds,
        slot,
        academicPeriodId: academicPeriodId || null,
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
    const { requirementKey, instructorId, academicPeriodId, status } = req.query;

    let targetOwnerId = req.user.id;
    if (req.user.accountType === 'Administrator') {
      if (instructorId) {
        targetOwnerId = instructorId;
      }
    }

    const filter = { ownerId: targetOwnerId };
    if (requirementKey) filter.requirementKey = requirementKey;
    if (academicPeriodId) filter.academicPeriodId = academicPeriodId;
    if (status) filter.status = status;

    const documents = await Document.find(filter)
      .sort({ updatedAt: -1 })
      .lean();

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
    const isAdmin = req.user.accountType === 'Administrator';
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
    const isAdmin = req.user.accountType === 'Administrator';
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
    if (req.user.accountType !== 'Administrator') {
      return res.status(403).json({ message: 'Only administrators can review documents.' });
    }

    const { id } = req.params;
    const { decision, comment } = req.body;

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be "approved" or "rejected".' });
    }

    if (decision === 'rejected' && (!comment || !comment.trim())) {
      return res.status(400).json({ message: 'A comment is required when rejecting a document.' });
    }

    const doc = await Document.findById(id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
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
    await doc.save();

    const reqDef = await Requirement.findOne({ key: doc.requirementKey });
    const docName = reqDef ? (reqDef.label || reqDef.card) : doc.requirementKey;
    const currentVer = doc.versions?.find((v) => v.n === doc.currentVersion);
    const fileName = currentVer?.originalName || 'file';

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
    const isAdmin = req.user.accountType === 'Administrator';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Check if period is closed or archived
    if (doc.academicPeriodId) {
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
    const isAdmin = req.user.accountType === 'Administrator';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Check if period is closed or archived
    if (doc.academicPeriodId) {
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
    if (req.user.accountType === 'Administrator' && req.query.instructorId) {
      targetOwnerId = req.query.instructorId;
    }

    // Fetch all faculty requirements
    const requirements = await Requirement.find({ scope: 'faculty', active: true }).lean();

    // Fetch all documents submitted by this instructor
    const documents = await Document.find({ ownerId: targetOwnerId }).lean();

    // Map requirement keys to card names
    const reqKeyToCard = {};
    for (const r of requirements) {
      reqKeyToCard[r.key] = r.card;
    }

    // Card path map
    const cardNameToPath = {
      'Educational Attainment': 'educational-attainment',
      'Service Records': 'service-records',
      'Seminars and Workshops': 'seminars-and-workshops',
      'Achievements': 'achievements',
      'Research': 'research',
      'Extension Involvement': 'extension-involvement',
      'Production': 'production',
      'Other Requirements': 'other-requirements',
      'Membership to Professional Organization': 'other-requirements',
      'Passed Licensure Examinations': 'other-requirements',
      'IPCR': 'other-requirements',
    };

    const summaries = {};

    for (const doc of documents) {
      const cardName = reqKeyToCard[doc.requirementKey] || 'other-requirements';
      const cardPath = cardNameToPath[cardName] || 'other-requirements';

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