const AcademicPeriod = require('../models/AcademicPeriod');
const ClassModel = require('../models/Class');
const DocumentModel = require('../models/Document');
const Instructor = require('../models/Instructor');
const { logAudit } = require('../utils/auditLog');
const { CATEGORY, ACTION } = require('../constants/auditActions');

/**
 * Format academic period human-readable name
 */
const formatPeriodName = (period) => {
  if (!period) return '—';
  const sem = period.semester === 'Summer' ? 'Summer Term' : `${period.semester} Semester`;
  return `AY ${period.schoolYear} · ${sem}`;
};

/**
 * Validate academic year string (e.g., "2026-2027")
 */
const validateSchoolYear = (sy) => {
  if (!sy || typeof sy !== 'string') return false;
  const match = sy.match(/^(\d{4})-(\d{4})$/);
  if (!match) return false;
  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);
  return end === start + 1;
};

/**
 * GET /api/academic-periods
 * Returns all academic periods with aggregate statistics
 */
exports.getAcademicPeriods = async (req, res) => {
  try {
    const { status, search, includeArchived } = req.query;

    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    } else if (includeArchived !== 'true') {
      // By default show all non-archived or all based on request
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { schoolYear: { $regex: q, $options: 'i' } },
        { semester: { $regex: q, $options: 'i' } },
      ];
    }

    const periods = await AcademicPeriod.find(filter)
      .sort({ schoolYear: -1, createdAt: -1 })
      .populate('setBy', 'fullName email')
      .lean();

    // Enrich periods with counts of associated classes and documents
    const enriched = await Promise.all(
      periods.map(async (p) => {
        const periodId = p._id;

        const [classesCount, documents] = await Promise.all([
          ClassModel.countDocuments({ academicPeriodId: periodId }),
          DocumentModel.find({ academicPeriodId: periodId }).select('versions.review.decision').lean(),
        ]);

        let approvedDocs = 0;
        let rejectedDocs = 0;
        let pendingDocs = 0;

        documents.forEach((doc) => {
          const latestVersion = doc.versions && doc.versions.length > 0
            ? doc.versions[doc.versions.length - 1]
            : null;
          const decision = latestVersion?.review?.decision;
          if (decision === 'approved') approvedDocs++;
          else if (decision === 'rejected') rejectedDocs++;
          else pendingDocs++;
        });

        const totalDocs = documents.length;
        const complianceRate = totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0;

        return {
          ...p,
          stats: {
            classesCount,
            totalDocs,
            approvedDocs,
            rejectedDocs,
            pendingDocs,
            complianceRate,
          },
        };
      })
    );

    res.json({
      success: true,
      periods: enriched,
      count: enriched.length,
    });
  } catch (err) {
    console.error('Error fetching academic periods:', err);
    res.status(500).json({ message: 'Failed to load academic periods.' });
  }
};

/**
 * GET /api/academic-periods/current
 * Returns the currently active academic period
 */
exports.getCurrentAcademicPeriod = async (req, res) => {
  try {
    let current = await AcademicPeriod.findOne({ isCurrent: true }).lean();

    // Fallback if none flagged as current: find latest Active or Upcoming period
    if (!current) {
      current = await AcademicPeriod.findOne({ status: 'Active' })
        .sort({ schoolYear: -1, createdAt: -1 })
        .lean();
    }

    if (!current) {
      return res.json({
        success: true,
        currentPeriod: null,
        formatted: 'No Active Period',
      });
    }

    res.json({
      success: true,
      currentPeriod: current,
      formatted: formatPeriodName(current),
    });
  } catch (err) {
    console.error('Error fetching current academic period:', err);
    res.status(500).json({ message: 'Failed to retrieve active academic period.' });
  }
};

/**
 * GET /api/academic-periods/:id/details
 * Detailed overview of a specific period (sections, subjects, instructors, compliance)
 */
exports.getAcademicPeriodDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const period = await AcademicPeriod.findById(id).populate('setBy', 'fullName email').lean();
    if (!period) {
      return res.status(404).json({ message: 'Academic period not found.' });
    }

    // 1. Fetch all classes in this period
    const classes = await ClassModel.find({ academicPeriodId: id })
      .populate('ownerId', 'fullName email department profile')
      .lean();

    // 2. Aggregate unique subjects and sections
    const subjectsMap = new Map();
    const sectionsMap = new Map();
    const instructorsMap = new Map();

    classes.forEach((cls) => {
      if (cls.subject?.code) {
        subjectsMap.set(cls.subject.code, cls.subject.name || cls.subject.code);
      }
      if (cls.section?.code) {
        sectionsMap.set(cls.section.code, cls.section.name || cls.section.code);
      }
      if (cls.ownerId) {
        const instId = String(cls.ownerId._id || cls.ownerId);
        if (!instructorsMap.has(instId)) {
          const profile = cls.ownerId.profile || {};
          const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || cls.ownerId.fullName || cls.ownerId.email;
          instructorsMap.set(instId, {
            id: instId,
            name: displayName,
            email: cls.ownerId.email,
            department: cls.ownerId.department || '—',
            classCount: 1,
            documentsSubmitted: 0,
            approvedCount: 0,
          });
        } else {
          instructorsMap.get(instId).classCount++;
        }
      }
    });

    // 3. Fetch all documents in this period
    const documents = await DocumentModel.find({ academicPeriodId: id })
      .populate('ownerId', 'fullName email department profile')
      .lean();

    let approvedDocs = 0;
    let rejectedDocs = 0;
    let pendingDocs = 0;

    documents.forEach((doc) => {
      const ownerId = String(doc.ownerId?._id || doc.ownerId);
      const latestVersion = doc.versions && doc.versions.length > 0
        ? doc.versions[doc.versions.length - 1]
        : null;
      const decision = latestVersion?.review?.decision;

      if (decision === 'approved') approvedDocs++;
      else if (decision === 'rejected') rejectedDocs++;
      else pendingDocs++;

      if (instructorsMap.has(ownerId)) {
        const inst = instructorsMap.get(ownerId);
        inst.documentsSubmitted++;
        if (decision === 'approved') inst.approvedCount++;
      }
    });

    const totalDocs = documents.length;
    const complianceRate = totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0;

    const subjectsList = Array.from(subjectsMap.entries()).map(([code, name]) => ({ code, name }));
    const sectionsList = Array.from(sectionsMap.entries()).map(([code, name]) => ({ code, name }));
    const instructorsList = Array.from(instructorsMap.values());

    res.json({
      success: true,
      period,
      formatted: formatPeriodName(period),
      summary: {
        totalClasses: classes.length,
        totalSubjects: subjectsList.length,
        totalSections: sectionsList.length,
        totalInstructors: instructorsList.length,
        totalDocuments: totalDocs,
        approvedDocs,
        rejectedDocs,
        pendingDocs,
        complianceRate,
      },
      subjects: subjectsList,
      sections: sectionsList,
      instructors: instructorsList,
    });
  } catch (err) {
    console.error('Error fetching academic period details:', err);
    res.status(500).json({ message: 'Failed to load academic period details.' });
  }
};

/**
 * POST /api/academic-periods
 * Create a new academic period
 */
exports.createAcademicPeriod = async (req, res) => {
  try {
    const { schoolYear, semester, startDate, endDate, status, setActive } = req.body;

    // Validate School Year
    if (!validateSchoolYear(schoolYear)) {
      return res.status(400).json({
        message: 'Invalid Academic Year format. Must be YYYY-YYYY where the end year is the next consecutive year (e.g., 2026-2027).',
      });
    }

    // Validate Semester
    if (!['1st', '2nd', 'Summer'].includes(semester)) {
      return res.status(400).json({
        message: 'Invalid semester. Must be "1st", "2nd", or "Summer".',
      });
    }

    // Validate Dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and End date are required.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid start or end date.' });
    }

    if (end <= start) {
      return res.status(400).json({ message: 'End date must be later than the start date.' });
    }

    // Prevent adding a new school year while the current active period is still in 1st semester
    const currentActive = await AcademicPeriod.findOne({
      isCurrent: true,
      isArchived: { $ne: true },
    }).lean();
    if (
      currentActive &&
      currentActive.semester === '1st' &&
      schoolYear !== currentActive.schoolYear
    ) {
      return res.status(400).json({
        message: `Cannot add a new academic year while AY ${currentActive.schoolYear} is still in 1st Semester.`,
      });
    }

    // Check for duplicate period
    const existing = await AcademicPeriod.findOne({ schoolYear, semester });
    if (existing) {
      return res.status(409).json({
        message: `Academic period for ${schoolYear} · ${semester} Semester already exists.`,
      });
    }

    const shouldBeActive = setActive === true || status === 'Active';

    // If making active, unset isCurrent on all others
    if (shouldBeActive) {
      await AcademicPeriod.updateMany({ isCurrent: true }, { isCurrent: false });
    }

    const period = new AcademicPeriod({
      schoolYear,
      semester,
      startDate: start,
      endDate: end,
      status: shouldBeActive ? 'Active' : (status || 'Upcoming'),
      isCurrent: shouldBeActive,
      isArchived: status === 'Archived',
      setBy: req.user.id,
    });

    await period.save();

    // Log audit
    await logAudit({
      actor: req.user,
      action: ACTION.PERIOD_CREATE,
      targetType: 'academicPeriod',
      targetId: period._id,
      targetLabel: formatPeriodName(period),
      category: CATEGORY.PERIOD,
      details: `Created academic period ${formatPeriodName(period)} (${startDate} to ${endDate})`,
    });

    res.status(201).json({
      success: true,
      message: `Academic period ${formatPeriodName(period)} created successfully.`,
      period,
    });
  } catch (err) {
    console.error('Error creating academic period:', err);
    res.status(500).json({ message: err.message || 'Failed to create academic period.' });
  }
};

/**
 * PUT /api/academic-periods/:id
 * Edit an existing academic period
 */
exports.updateAcademicPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolYear, semester, startDate, endDate, status } = req.body;

    const period = await AcademicPeriod.findById(id);
    if (!period) {
      return res.status(404).json({ message: 'Academic period not found.' });
    }

    if (period.isArchived) {
      return res.status(400).json({ message: 'Archived academic periods cannot be edited.' });
    }

    // Validate school year if provided
    if (schoolYear && !validateSchoolYear(schoolYear)) {
      return res.status(400).json({
        message: 'Invalid Academic Year format. Must be YYYY-YYYY where the end year is the next consecutive year (e.g., 2026-2027).',
      });
    }

    // Validate semester if provided
    if (semester && !['1st', '2nd', 'Summer'].includes(semester)) {
      return res.status(400).json({
        message: 'Invalid semester. Must be "1st", "2nd", or "Summer".',
      });
    }

    // Check duplicate if year/semester changed
    const newYear = schoolYear || period.schoolYear;
    const newSem = semester || period.semester;
    if (newYear !== period.schoolYear || newSem !== period.semester) {
      const duplicate = await AcademicPeriod.findOne({
        _id: { $ne: id },
        schoolYear: newYear,
        semester: newSem,
      });
      if (duplicate) {
        return res.status(409).json({
          message: `Academic period for ${newYear} · ${newSem} Semester already exists.`,
        });
      }
    }

    // Validate dates
    const start = startDate ? new Date(startDate) : period.startDate;
    const end = endDate ? new Date(endDate) : period.endDate;

    if (end <= start) {
      return res.status(400).json({ message: 'End date must be later than the start date.' });
    }

    period.schoolYear = newYear;
    period.semester = newSem;
    period.startDate = start;
    period.endDate = end;

    if (status && status !== period.status) {
      if (status === 'Active') {
        await AcademicPeriod.updateMany({ _id: { $ne: id }, isCurrent: true }, { isCurrent: false });
        period.isCurrent = true;
        period.status = 'Active';
      } else if (status === 'Closed') {
        period.isCurrent = false;
        period.status = 'Closed';
        period.closedAt = new Date();
      } else if (status === 'Upcoming') {
        period.isCurrent = false;
        period.status = 'Upcoming';
      }
    }

    period.setBy = req.user.id;
    await period.save();

    await logAudit({
      actor: req.user,
      action: ACTION.PERIOD_UPDATE,
      targetType: 'academicPeriod',
      targetId: period._id,
      targetLabel: formatPeriodName(period),
      category: CATEGORY.PERIOD,
      details: `Updated academic period ${formatPeriodName(period)}`,
    });

    res.json({
      success: true,
      message: `Academic period updated successfully.`,
      period,
    });
  } catch (err) {
    console.error('Error updating academic period:', err);
    res.status(500).json({ message: err.message || 'Failed to update academic period.' });
  }
};

/**
 * PATCH /api/academic-periods/:id/activate
 * Sets the specified academic period as the active one
 */
exports.setActiveAcademicPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const period = await AcademicPeriod.findById(id);
    if (!period) {
      return res.status(404).json({ message: 'Academic period not found.' });
    }

    if (period.isArchived) {
      return res.status(400).json({ message: 'Cannot activate an archived academic period.' });
    }

    // Unset any currently active period
    await AcademicPeriod.updateMany(
      { isCurrent: true },
      { $set: { isCurrent: false, status: 'Closed', closedAt: new Date() } }
    );

    // Set this period as active
    period.isCurrent = true;
    period.status = 'Active';
    period.closedAt = null;
    period.setBy = req.user.id;
    await period.save();

    await logAudit({
      actor: req.user,
      action: ACTION.PERIOD_SET,
      targetType: 'academicPeriod',
      targetId: period._id,
      targetLabel: formatPeriodName(period),
      category: CATEGORY.PERIOD,
      details: `Activated academic period ${formatPeriodName(period)} as system default`,
    });

    res.json({
      success: true,
      message: `Set ${formatPeriodName(period)} as the active academic period.`,
      period,
    });
  } catch (err) {
    console.error('Error activating academic period:', err);
    res.status(500).json({ message: 'Failed to activate academic period.' });
  }
};

/**
 * PATCH /api/academic-periods/:id/close
 * Closes an academic period, preventing further submissions
 */
exports.closeAcademicPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const period = await AcademicPeriod.findById(id);
    if (!period) {
      return res.status(404).json({ message: 'Academic period not found.' });
    }

    if (period.status === 'Closed') {
      return res.status(400).json({ message: 'Academic period is already closed.' });
    }

    period.status = 'Closed';
    period.isCurrent = false;
    period.isArchived = false;
    period.closedAt = new Date();
    await period.save();

    await logAudit({
      actor: req.user,
      action: ACTION.PERIOD_CLOSE,
      targetType: 'academicPeriod',
      targetId: period._id,
      targetLabel: formatPeriodName(period),
      category: CATEGORY.PERIOD,
      details: `Closed academic period ${formatPeriodName(period)}. Submissions locked.`,
    });

    res.json({
      success: true,
      message: `Academic period ${formatPeriodName(period)} closed. Submissions are now locked.`,
      period,
    });
  } catch (err) {
    console.error('Error closing academic period:', err);
    res.status(500).json({ message: 'Failed to close academic period.' });
  }
};

/**
 * PATCH /api/academic-periods/:id/archive
 * Archives a completed period
 */
exports.archiveAcademicPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const period = await AcademicPeriod.findById(id);
    if (!period) {
      return res.status(404).json({ message: 'Academic period not found.' });
    }

    period.status = 'Archived';
    period.isArchived = true;
    period.isCurrent = false;
    period.archivedAt = new Date();
    await period.save();

    // Also mark classes belonging to this period as archived
    await ClassModel.updateMany(
      { academicPeriodId: id, archivedAt: null },
      { $set: { archivedAt: new Date() } }
    );

    await logAudit({
      actor: req.user,
      action: ACTION.PERIOD_ARCHIVE,
      targetType: 'academicPeriod',
      targetId: period._id,
      targetLabel: formatPeriodName(period),
      category: CATEGORY.PERIOD,
      details: `Archived academic period ${formatPeriodName(period)}. Moved to records archive.`,
    });

    res.json({
      success: true,
      message: `Academic period ${formatPeriodName(period)} archived successfully.`,
      period,
    });
  } catch (err) {
    console.error('Error archiving academic period:', err);
    res.status(500).json({ message: 'Failed to archive academic period.' });
  }
};

/**
 * PATCH /api/academic-periods/:id/unarchive
 * Reopens / unarchives an academic period back to 'Closed'
 */
exports.unarchiveAcademicPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const period = await AcademicPeriod.findById(id);
    if (!period) {
      return res.status(404).json({ message: 'Academic period not found.' });
    }

    period.status = 'Closed';
    period.isArchived = false;
    period.archivedAt = null;
    await period.save();

    await logAudit({
      actor: req.user,
      action: ACTION.PERIOD_CLOSE || 'PERIOD_CLOSE',
      targetType: 'academicPeriod',
      targetId: period._id,
      targetLabel: formatPeriodName(period),
      category: CATEGORY.PERIOD,
      details: `Reopened archived academic period ${formatPeriodName(period)}. Status set to Closed.`,
    });

    res.json({
      success: true,
      message: `Academic period ${formatPeriodName(period)} reopened successfully.`,
      period,
    });
  } catch (err) {
    console.error('Error unarchiving academic period:', err);
    res.status(500).json({ message: 'Failed to reopen academic period.' });
  }
};

/**
 * DELETE /api/academic-periods/:id
 * Delete an academic period if no associated data exists
 */
exports.deleteAcademicPeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const period = await AcademicPeriod.findById(id);
    if (!period) {
      return res.status(404).json({ message: 'Academic period not found.' });
    }

    if (period.isCurrent) {
      return res.status(400).json({ message: 'Cannot delete the currently active academic period.' });
    }

    const [classesCount, docsCount] = await Promise.all([
      ClassModel.countDocuments({ academicPeriodId: id }),
      DocumentModel.countDocuments({ academicPeriodId: id }),
    ]);

    if (classesCount > 0 || docsCount > 0) {
      return res.status(400).json({
        message: `Cannot delete this academic period because it contains ${classesCount} classes and ${docsCount} documents. Please close or archive it instead.`,
      });
    }

    await AcademicPeriod.findByIdAndDelete(id);

    await logAudit({
      actor: req.user,
      action: ACTION.PERIOD_SET,
      targetType: 'academicPeriod',
      targetId: id,
      targetLabel: formatPeriodName(period),
      category: CATEGORY.PERIOD,
      details: `Deleted academic period ${formatPeriodName(period)}`,
    });

    res.json({
      success: true,
      message: `Academic period ${formatPeriodName(period)} deleted.`,
    });
  } catch (err) {
    console.error('Error deleting academic period:', err);
    res.status(500).json({ message: 'Failed to delete academic period.' });
  }
};

