// server/controllers/documentController.js
const mongoose = require('mongoose');
const Document = require('../models/Document');
const Requirement = require('../models/Requirement');
const Instructor = require('../models/Instructor');
const { STATUS, assertTransition } = require('../constants/documentStatus');
const storageService = require('../utils/storageService');
const driveNaming = require('../utils/driveNaming');
const { logAudit } = require('../utils/auditLog');

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

/**
 * POST /api/documents/upload
 * Handles initial file upload or re-uploading a new version
 */
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { requirementKey, documentId, academicPeriodId } = req.body;
    const meta = parseJsonSafe(req.body.meta, {});
    const slot = parseJsonSafe(req.body.slot, {});
    const classIds = parseJsonSafe(req.body.classIds, []);

    if (!requirementKey) {
      return res.status(400).json({ message: 'requirementKey is required.' });
    }

    // Owner is always the logged in user for faculty uploads
    const ownerId = req.user.id;
    const instructor = await Instructor.findById(ownerId);
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found.' });
    }

    // Requirement metadata
    const requirement = await Requirement.findOne({ key: requirementKey });
    if (!requirement) {
      return res.status(404).json({ message: `Requirement "${requirementKey}" not found.` });
    }

    // Check if updating an existing document or creating new
    let existingDoc = null;
    if (documentId) {
      existingDoc = await Document.findOne({ _id: documentId, ownerId });
      if (!existingDoc) {
        return res.status(404).json({ message: 'Document to update not found.' });
      }
    } else if (!requirement.multiple) {
      // For single-slot requirements, check if one already exists for this slotKey
      const slotKey = Document.buildSlotKey({
        ownerId,
        requirementKey,
        academicPeriodId: academicPeriodId || null,
        classIds,
        slot,
      });
      existingDoc = await Document.findOne({ slotKey });
    }

    // 1. Build Google Drive folder hierarchy
    const folderPath = driveNaming.facultyFolderPath({
      department: instructor.department || 'General',
      fullName: instructor.fullName,
      instructorId: ownerId,
      requirement,
    });

    // 2. Build unique filename for Google Drive (no incrementing version)
    const targetDocId = existingDoc ? existingDoc._id : new mongoose.Types.ObjectId();
    const fileName = driveNaming.buildFileName({
      slot: meta.name || requirement.label || requirement.card,
      version: 1,
      originalName: req.file.originalname,
      documentId: targetDocId,
    });

    // 3. Upload file to Google Drive
    const driveUpload = await storageService.uploadFile({
      instructorId: ownerId,
      folderPath,
      buffer: req.file.buffer,
      fileName,
      mimeType: req.file.mimetype,
    });

    // 4. Create single active file record
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
      // Re-upload / update existing document:
      // Clean up previous file(s) from Google Drive so old files do not linger
      if (existingDoc.versions && existingDoc.versions.length > 0) {
        for (const oldVer of existingDoc.versions) {
          if (oldVer.driveFileId) {
            try {
              await storageService.deleteFile(oldVer.driveFileId);
            } catch (delErr) {
              console.warn(`Could not delete old drive file ${oldVer.driveFileId}:`, delErr.message);
            }
          }
        }
      }

      // Replace with only the new file
      existingDoc.versions = [newVersion];
      existingDoc.currentVersion = 1;
      existingDoc.status = STATUS.PENDING_REVIEW;
      existingDoc.submittedAt = new Date();
      if (Object.keys(meta).length > 0) {
        existingDoc.meta = { ...existingDoc.meta, ...meta };
      }
      savedDoc = await existingDoc.save();
    } else {
      // New document creation
      const slotKey = !requirement.multiple
        ? Document.buildSlotKey({
          ownerId,
          requirementKey,
          academicPeriodId: academicPeriodId || null,
          classIds,
          slot,
        })
        : undefined;

      const newDoc = new Document({
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

      savedDoc = await newDoc.save();
    }

    await logAudit({
      actor: req.user,
      action: existingDoc ? 'document.reupload' : 'document.upload',
      targetType: 'document',
      targetId: savedDoc._id,
      targetLabel: req.file.originalname,
      meta: { requirementKey, version: 1 },
      req,
    });

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

/**
 * GET /api/documents
 * List documents for an instructor (filtered by requirementKey, etc.)
 */
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

/**
 * GET /api/documents/:id
 * Get single document details
 */
exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    // Auth check: Must be owner or Administrator
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
 * Securely stream file media from Google Drive for preview or download
 */
exports.streamDocumentFile = async (req, res) => {
  try {
    const { id } = req.params;
    const versionNum = req.query.version ? Number(req.query.version) : null;

    const doc = await Document.findById(id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    // Access control
    const isOwner = String(doc.ownerId) === String(req.user.id);
    const isAdmin = req.user.accountType === 'Administrator';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Locate requested or current version
    const version = versionNum
      ? doc.versions.find((v) => v.n === versionNum)
      : doc.versions.find((v) => v.n === doc.currentVersion) || doc.versions[doc.versions.length - 1];

    if (!version || !version.driveFileId) {
      return res.status(404).json({ message: 'File version not found.' });
    }

    // Get stream from Google Drive
    const driveFile = await storageService.getFile(version.driveFileId);

    // Set streaming headers
    res.setHeader('Content-Type', version.mimeType || driveFile.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(version.originalName || driveFile.name)}"`
    );
    if (driveFile.size) {
      res.setHeader('Content-Length', driveFile.size);
    }

    // Pipe stream to client
    driveFile.stream.on('error', (streamErr) => {
      console.error('Stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming file.' });
      }
    });

    driveFile.stream.pipe(res);
  } catch (err) {
    console.error('Error in streamDocumentFile:', err);
    if (!res.headersSent) {
      return res.status(500).json({ message: err.message || 'Failed to stream file.' });
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

    await logAudit({
      actor: req.user,
      action: `document.${decision}`,
      targetType: 'document',
      targetId: doc._id,
      targetLabel: doc.requirementKey,
      meta: { decision, comment },
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

    const isOwner = String(doc.ownerId) === String(req.user.id);
    const isAdmin = req.user.accountType === 'Administrator';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (doc.status === STATUS.APPROVED) {
      return res.status(400).json({ message: 'Approved documents cannot be deleted.' });
    }

    // Clean up files in Google Drive
    if (doc.versions && doc.versions.length > 0) {
      for (const ver of doc.versions) {
        if (ver.driveFileId) {
          storageService.deleteFile(ver.driveFileId).catch((delErr) => {
            console.warn(`Could not delete file ${ver.driveFileId} from Google Drive:`, delErr.message);
          });
        }
      }
    }

    await Document.findByIdAndDelete(id);

    await logAudit({
      actor: req.user,
      action: 'document.delete',
      targetType: 'document',
      targetId: id,
      targetLabel: doc.requirementKey,
      req,
    });

    return res.json({ message: 'Document deleted successfully.' });
  } catch (err) {
    console.error('Error in deleteDocument:', err);
    return res.status(500).json({ message: 'Failed to delete document.' });
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
