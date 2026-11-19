// server/controllers/classController.js
const Class = require('../models/Class');
const AcademicPeriod = require('../models/AcademicPeriod');
const Document = require('../models/Document');
const Requirement = require('../models/Requirement');
const { STATUS } = require('../constants/documentStatus');
const { validateClassFields } = require('../constants/classPolicy');
const { isActingAsAdmin } = require('../constants/adminPermissions');

/**
 * GET /api/classes
 * Fetch all active classes for the authenticated instructor (or filtered by academic period)
 */
exports.getClasses = async (req, res) => {
  try {
    const isAdmin = isActingAsAdmin(req.user);
    const ownerId = isAdmin && req.query.instructorId ? req.query.instructorId : req.user.id;
    const { academicPeriodId, archived, includeArchived } = req.query;

    const filter = isAdmin && !req.query.instructorId ? {} : { ownerId };
    if (archived === 'true') {
      filter.archivedAt = { $ne: null };
    } else if (includeArchived !== 'true') {
      filter.archivedAt = null;
    }

    if (academicPeriodId) {
      filter.academicPeriodId = academicPeriodId;
    }

    const classes = await Class.find(filter)
      .populate('academicPeriodId', 'schoolYear semester isCurrent')
      .sort({ createdAt: -1 });

    // Compute document counts per class
    const classIds = classes.map((c) => c._id);
    const classALoadBranch = {
      requirementKey: 'CLASS_A_LOAD_REPORT',
      ownerId: !isAdmin || req.query.instructorId ? ownerId : { $in: classes.map((c) => c.ownerId) },
    };
    if (archived === 'true') {
      classALoadBranch.archivedAt = { $ne: null };
    } else if (includeArchived !== 'true') {
      classALoadBranch.archivedAt = null;
    }
    const docFilter = {
      $or: [
        { classIds: { $in: classIds } },
        classALoadBranch,
      ],
    };
    if (!isAdmin || req.query.instructorId) {
      docFilter.ownerId = ownerId;
    }
    const docs = await Document.find(docFilter).select('status classIds requirementKey ownerId academicPeriodId');

    // Total required class portfolio items count
    const totalRequiredDocs = await Requirement.countDocuments({
      scope: 'class',
      active: true,
    });
    const totalRequired = totalRequiredDocs || 31;

    const classStatsMap = {};
    classIds.forEach((id) => {
      classStatsMap[id.toString()] = { approvedCount: 0, pendingCount: 0, rejectedCount: 0 };
    });

    docs.forEach((doc) => {
      if (doc.requirementKey === 'CLASS_A_LOAD_REPORT') {
        // Shared load report applies to all classes of this instructor & period
        classes.forEach((cls) => {
          const isSameOwner = String(cls.ownerId) === String(doc.ownerId);
          const clsPeriod = cls.academicPeriodId?._id || cls.academicPeriodId;
          const isSamePeriod = !doc.academicPeriodId || String(clsPeriod) === String(doc.academicPeriodId);
          if (isSameOwner && isSamePeriod) {
            const idStr = cls._id.toString();
            if (classStatsMap[idStr]) {
              if (doc.status === STATUS.APPROVED) {
                classStatsMap[idStr].approvedCount += 1;
              } else if (doc.status === STATUS.PENDING_REVIEW) {
                classStatsMap[idStr].pendingCount += 1;
              } else if (doc.status === STATUS.REJECTED) {
                classStatsMap[idStr].rejectedCount += 1;
              }
            }
          }
        });
      } else {
        const docClasses = doc.classIds || [];
        docClasses.forEach((cid) => {
          const idStr = cid.toString();
          if (classStatsMap[idStr]) {
            if (doc.status === STATUS.APPROVED) {
              classStatsMap[idStr].approvedCount += 1;
            } else if (doc.status === STATUS.PENDING_REVIEW) {
              classStatsMap[idStr].pendingCount += 1;
            } else if (doc.status === STATUS.REJECTED) {
              classStatsMap[idStr].rejectedCount += 1;
            }
          }
        });
      }
    });

    const enrichedClasses = classes.map((cls) => {
      const stats = classStatsMap[cls._id.toString()] || {
        approvedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
      };
      return {
        _id: cls._id,
        id: cls._id,
        ownerId: cls.ownerId,
        subject: cls.subject,
        section: cls.section,
        academicPeriod: cls.academicPeriodId,
        approvedCount: stats.approvedCount,
        pendingCount: stats.pendingCount,
        rejectedCount: stats.rejectedCount,
        totalRequired,
        completionPercent:
          totalRequired > 0 ? Math.round((stats.approvedCount / totalRequired) * 100) : 0,
        archivedAt: cls.archivedAt || null,
        createdAt: cls.createdAt,
      };
    });

    // Overview aggregate counts
    let totalApproved = 0;
    let totalPending = 0;
    let totalNeedsAction = 0;
    let totalRequiredSum = 0;

    enrichedClasses.forEach((cls) => {
      totalApproved += cls.approvedCount;
      totalPending += cls.pendingCount;
      totalNeedsAction += cls.rejectedCount;
      totalRequiredSum += cls.totalRequired;
    });

    const completionPercentage =
      totalRequiredSum > 0 ? Math.round((totalApproved / totalRequiredSum) * 100) : 0;

    res.json({
      classes: enrichedClasses,
      summary: {
        needsAction: totalNeedsAction,
        awaitingReview: totalPending,
        approved: totalApproved,
        completion: completionPercentage,
      },
    });
  } catch (err) {
    console.error('Error in getClasses:', err);
    res.status(500).json({ message: 'Failed to retrieve classes.' });
  }
};

/**
 * GET /api/classes/:id
 * Fetch details of a single class along with document status summary for each requirement
 */
exports.getClassById = async (req, res) => {
  try {
    const isAdmin = isActingAsAdmin(req.user);
    const { id } = req.params;
    const { includeArchived } = req.query;

    const filter = { _id: id };
    if (!isAdmin) {
      filter.ownerId = req.user.id;
      if (includeArchived !== 'true') {
        filter.archivedAt = null;
      }
    }

    const classDoc = await Class.findOne(filter)
      .populate('academicPeriodId', 'schoolYear semester isCurrent isArchived')
      .populate('ownerId', 'fullName email department profile');

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    // Fetch documents associated with this class
    const classOwnerId = classDoc.ownerId?._id || classDoc.ownerId;
    const classPeriodId = classDoc.academicPeriodId?._id || classDoc.academicPeriodId;

    const docFilter = {
      $or: [
        { classIds: classDoc._id },
        {
          requirementKey: 'CLASS_A_LOAD_REPORT',
          ownerId: classOwnerId,
          academicPeriodId: classPeriodId,
        },
      ],
    };
    if (!classDoc.archivedAt && includeArchived !== 'true') {
      docFilter.archivedAt = null;
    }
    const docs = await Document.find(docFilter).select('requirementKey status');

    let approved = 0;
    let pendingReview = 0;
    let rejected = 0;
    const requirementSummary = {};

    docs.forEach((doc) => {
      const key = doc.requirementKey;
      if (!requirementSummary[key]) {
        requirementSummary[key] = { approved: 0, pendingReview: 0, rejected: 0, totalFiles: 0 };
      }
      requirementSummary[key].totalFiles += 1;
      if (doc.status === STATUS.APPROVED) {
        approved += 1;
        requirementSummary[key].approved += 1;
      } else if (doc.status === STATUS.PENDING_REVIEW) {
        pendingReview += 1;
        requirementSummary[key].pendingReview += 1;
      } else if (doc.status === STATUS.REJECTED) {
        rejected += 1;
        requirementSummary[key].rejected += 1;
      }
    });

    const totalRequiredDocs = await Requirement.countDocuments({ scope: 'class', active: true });
    const totalRequired = totalRequiredDocs || 31;
    const notSubmitted = Math.max(0, totalRequired - (approved + pendingReview + rejected));
    const completionPercent = totalRequired > 0 ? Math.round((approved / totalRequired) * 100) : 0;

    res.json({
      class: {
        _id: classDoc._id,
        id: classDoc._id,
        ownerId: classDoc.ownerId,
        subject: classDoc.subject,
        section: classDoc.section,
        academicPeriod: classDoc.academicPeriodId,
        archivedAt: classDoc.archivedAt || null,
      },
      counts: {
        approved,
        pendingReview,
        rejected,
        notSubmitted,
        totalRequired,
      },
      completionPercent,
      requirementSummary,
    });
  } catch (err) {
    console.error('Error in getClassById:', err);
    res.status(500).json({ message: 'Failed to retrieve class details.' });
  }
};

/**
 * POST /api/classes
 * Create a new class
 */
exports.createClass = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { subjectCode, subjectName, sectionCode, sectionName, sectionGroup, academicPeriodId } = req.body;

    if (!subjectCode || !sectionCode) {
      return res.status(400).json({ message: 'Subject code and section code are required.' });
    }

    const fieldError = validateClassFields({ subjectCode, subjectName, sectionCode, sectionName, sectionGroup });
    if (fieldError) {
      return res.status(400).json({ message: fieldError });
    }

    let targetPeriodId = academicPeriodId;
    if (!targetPeriodId) {
      let currentPeriod = await AcademicPeriod.findOne({ isCurrent: true });
      if (!currentPeriod) {
        currentPeriod = await AcademicPeriod.findOne({ status: 'Active' })
          .sort({ schoolYear: -1, createdAt: -1 });
      }
      if (!currentPeriod) {
        return res.status(400).json({ message: 'There is no current academic period. Please set one before adding a class.' });
      }
      targetPeriodId = currentPeriod._id;
    }

    // Check for duplicate class
    const existing = await Class.findOne({
      ownerId,
      academicPeriodId: targetPeriodId,
      'subject.code': subjectCode.trim().toUpperCase(),
      'section.code': sectionCode.trim().toUpperCase(),
      archivedAt: null,
    });

    if (existing) {
      return res.status(409).json({ message: `A class with subject code "${subjectCode.trim().toUpperCase()}" and section code "${sectionCode.trim().toUpperCase()}" already exists in the current academic period.` });
    }

    const newClass = await Class.create({
      ownerId,
      academicPeriodId: targetPeriodId,
      subject: {
        code: subjectCode.trim().toUpperCase(),
        name: (subjectName || subjectCode).trim(),
      },
      section: {
        code: sectionCode.trim().toUpperCase(),
        name: (sectionName || sectionCode).trim(),
      },
    });

    await newClass.populate('academicPeriodId', 'schoolYear semester isCurrent');

    // Automatically link existing Instructional Load Report for this instructor & period
    const loadReportDoc = await Document.findOne({
      ownerId,
      academicPeriodId: targetPeriodId,
      requirementKey: 'CLASS_A_LOAD_REPORT',
      archivedAt: null,
    });

    let initialApproved = 0;
    let initialPending = 0;
    let initialRejected = 0;

    if (loadReportDoc) {
      if (!loadReportDoc.classIds.some((cid) => String(cid) === String(newClass._id))) {
        loadReportDoc.classIds.push(newClass._id);
        await loadReportDoc.save();
      }
      if (loadReportDoc.status === STATUS.APPROVED) initialApproved = 1;
      else if (loadReportDoc.status === STATUS.PENDING_REVIEW) initialPending = 1;
      else if (loadReportDoc.status === STATUS.REJECTED) initialRejected = 1;
    }

    const totalRequiredDocs = await Requirement.countDocuments({ scope: 'class', active: true });

    res.status(201).json({
      _id: newClass._id,
      id: newClass._id,
      subject: newClass.subject,
      section: newClass.section,
      academicPeriod: newClass.academicPeriodId,
      approvedCount: initialApproved,
      pendingCount: initialPending,
      rejectedCount: initialRejected,
      totalRequired: totalRequiredDocs || 31,
      createdAt: newClass.createdAt,
    });
  } catch (err) {
    console.error('Error in createClass:', err);
    res.status(500).json({ message: err.message || 'Failed to create class.' });
  }
};

/**
 * PATCH /api/classes/:id
 * Update class details (subject, section)
 */
exports.updateClass = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;
    const { subjectCode, subjectName, sectionCode, sectionName, sectionGroup } = req.body;

    const classDoc = await Class.findOne({ _id: id, ownerId, archivedAt: null });
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    const fieldError = validateClassFields({ subjectCode, subjectName, sectionCode, sectionName, sectionGroup });
    if (fieldError) {
      return res.status(400).json({ message: fieldError });
    }

    const newSubjCode = subjectCode ? subjectCode.trim().toUpperCase() : classDoc.subject.code;
    const newSecCode = sectionCode ? sectionCode.trim().toUpperCase() : classDoc.section.code;

    // Check duplicate if subject.code or section.code is changing
    if (newSubjCode !== classDoc.subject.code || newSecCode !== classDoc.section.code) {
      const duplicate = await Class.findOne({
        _id: { $ne: id },
        ownerId,
        academicPeriodId: classDoc.academicPeriodId,
        'subject.code': newSubjCode,
        'section.code': newSecCode,
        archivedAt: null,
      });

      if (duplicate) {
        return res.status(409).json({
          message: `A class with subject code "${newSubjCode}" and section code "${newSecCode}" already exists in this academic period.`,
        });
      }
    }

    if (subjectCode) classDoc.subject.code = newSubjCode;
    if (subjectName) classDoc.subject.name = subjectName.trim();
    if (sectionCode) classDoc.section.code = newSecCode;
    if (sectionName) classDoc.section.name = sectionName.trim();

    await classDoc.save();
    await classDoc.populate('academicPeriodId', 'schoolYear semester isCurrent');

    res.json(classDoc);
  } catch (err) {
    console.error('Error in updateClass:', err);
    res.status(500).json({ message: err.message || 'Failed to update class.' });
  }
};

/**
 * POST /api/classes/:id/archive
 * Archive a class
 */
exports.archiveClass = async (req, res) => {
  try {
    const isAdmin = isActingAsAdmin(req.user);
    const { id } = req.params;
    const filter = isAdmin ? { _id: id } : { _id: id, ownerId: req.user.id };

    const classDoc = await Class.findOne(filter);
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    classDoc.archivedAt = new Date();
    await classDoc.save();

    res.json({ message: 'Class archived successfully.' });
  } catch (err) {
    console.error('Error in archiveClass:', err);
    res.status(500).json({ message: 'Failed to archive class.' });
  }
};

/**
 * POST /api/classes/:id/unarchive
 * Restore an archived class
 */
exports.unarchiveClass = async (req, res) => {
  try {
    const isAdmin = isActingAsAdmin(req.user);
    const { id } = req.params;
    const filter = isAdmin ? { _id: id } : { _id: id, ownerId: req.user.id };

    const classDoc = await Class.findOne(filter);
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    classDoc.archivedAt = null;
    await classDoc.save();

    res.json({ message: 'Class unarchived successfully.' });
  } catch (err) {
    console.error('Error in unarchiveClass:', err);
    res.status(500).json({ message: 'Failed to unarchive class.' });
  }
};

/**
 * DELETE /api/classes/:id
 * Delete a class completely (or archive if permanent=false is passed)
 */
exports.deleteClass = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;
    const { permanent } = req.query;

    const classDoc = await Class.findOne({ _id: id, ownerId });
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    // Default to completely/permanently deleting the class
    if (permanent === 'false') {
      classDoc.archivedAt = new Date();
      await classDoc.save();
      return res.json({ message: 'Class archived successfully.' });
    }

    // Remove class reference from any documents linked to this class
    await Document.updateMany(
      { classIds: classDoc._id },
      { $pull: { classIds: classDoc._id } }
    );

    // Hard-delete the class record
    await Class.deleteOne({ _id: id });

    res.json({ message: 'Class deleted completely.' });
  } catch (err) {
    console.error('Error in deleteClass:', err);
    res.status(500).json({ message: 'Failed to delete class.' });
  }
};

