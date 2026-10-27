// server/controllers/documentController.js
const mongoose = require('mongoose');
const Document = require('../models/Document');
const Requirement = require('../models/Requirement');
const Instructor = require('../models/Instructor');
const Setting = require('../models/Setting');
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


// =====================================================================================================================
// Search: PREVIEW  =======================================================================================
// GET /api/documents/:id/file
// =====================================================================================================================

// GET /api/documents/:id/file
exports.streamDocumentFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.query;

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

    // Find requested or active version
    const targetVer = version
      ? doc.versions.find((v) => Number(v.n) === Number(version))
      : doc.versions.find((v) => v.n === doc.currentVersion) || doc.versions[doc.versions.length - 1];

    if (!targetVer || !targetVer.driveFileId) {
      return res.status(404).json({ message: 'File version not found in storage.' });
    }

    // Fetch stream from Google Drive
    const fileData = await storageService.getFile(targetVer.driveFileId);

    res.setHeader('Content-Type', fileData.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', fileData.size);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(targetVer.originalName || fileData.name)}"`);

    fileData.stream.on('error', (streamErr) => {
      console.error('Drive stream error:', streamErr);
      if (!res.headersSent) res.status(500).end();
    });

    fileData.stream.pipe(res);
  } catch (err) {
    console.error('Error in streamDocumentFile:', err);
    return res.status(500).json({ message: err.message || 'Failed to stream document file.' });
  }
};



// =====================================================================================================================
// Search: REVIEW  =======================================================================================
// PATCH /api/documents/:id/review
// =====================================================================================================================

exports.reviewDocument = async (req, res) => {
  return res.status(501).json({ message: 'Review endpoint reset. Ready for clean rebuild.' });
};


// =====================================================================================================================
// Search: DELETE  =======================================================================================
// DELETE /api/documents/:id
// =====================================================================================================================

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

    // Delete MongoDB document
    await Document.deleteOne({ _id: doc._id });

    return res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (err) {
    console.error('Error in deleteDocument:', err);
    return res.status(500).json({ message: err.message || 'Failed to delete document.' });
  }
};




// =====================================================================================================================
// Search: SUMMARY  =======================================================================================
// GET /api/documents/summary/faculty
// =====================================================================================================================

exports.getFacultyPortfolioSummary = async (req, res) => {
  return res.json({});
};