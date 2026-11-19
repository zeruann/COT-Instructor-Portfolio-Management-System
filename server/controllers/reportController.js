// server/controllers/reportController.js
const Instructor = require('../models/Instructor');
const Document = require('../models/Document');
const Requirement = require('../models/Requirement');
const Class = require('../models/Class');
const AcademicPeriod = require('../models/AcademicPeriod');
const { isFeatureEnabled } = require('./settingController');
const { buildComplianceWorkbook, uploadAsGoogleSheet } = require('../reports/complianceWorkbook');
const { getGoogleClients } = require('../utils/sheetsService');
const storageService = require('../utils/storageService');
const driveNaming = require('../utils/driveNaming');
const { isActingAsAdmin } = require('../constants/adminPermissions');

/**
 * Assembles live compliance checklist data for an instructor and selected academic period
 */
async function assembleCompliancePayload(ownerId, { periodId, schoolYear, semester } = {}) {
  // 1. Fetch instructor profile
  const instructor = await Instructor.findById(ownerId).lean();
  let instName = instructor?.fullName || 'Faculty Member';
  if (instructor?.profile?.firstName) {
    const parts = [
      instructor.profile.firstName,
      instructor.profile.middleName,
      instructor.profile.lastName,
    ].filter(Boolean);
    if (parts.length > 0) instName = parts.join(' ');
  }
  const department = instructor?.department || instructor?.profile?.department || 'IT Department';

  // 2. Fetch all academic periods
  const periods = await AcademicPeriod.find({ isArchived: { $ne: true } })
    .sort({ startDate: -1 })
    .lean();

  let targetPeriod = null;
  if (periodId) {
    targetPeriod = periods.find((p) => String(p._id) === String(periodId));
  } else if (schoolYear && semester) {
    const cleanYear = schoolYear.replace('–', '-').trim();
    const cleanSem = semester.replace(' Semester', '').trim();
    targetPeriod = periods.find(
      (p) =>
        p.schoolYear === cleanYear &&
        (p.semester === cleanSem || `${p.semester} Semester` === semester)
    );
  }

  // No selection means the report should use the current active academic period.
  if (!targetPeriod && !periodId && !schoolYear && !semester) {
    targetPeriod = periods.find((p) => p.status === 'Active') || periods.find((p) => p.isCurrent);
  }

  // Fallback to active current period, or latest period
  if (!targetPeriod) {
    targetPeriod = periods.find((p) => p.isCurrent) || periods[0];
  }

  const selectedPeriodId = targetPeriod ? targetPeriod._id : null;
  const resolvedSchoolYear = targetPeriod ? targetPeriod.schoolYear : '2026-2027';
  const resolvedSemester = targetPeriod ? `${targetPeriod.semester} Semester` : '1st Semester';

  // 3. Fetch requirements
  const facultyReqs = await Requirement.find({ scope: 'faculty', active: true })
    .sort({ cardOrder: 1, order: 1 })
    .lean();
  const classReqs = await Requirement.find({ scope: 'class', active: true })
    .sort({ cardOrder: 1, order: 1 })
    .lean();

  // 4. Fetch classes for this instructor and period
  const classFilter = { ownerId, archivedAt: null };
  if (selectedPeriodId) classFilter.academicPeriodId = selectedPeriodId;
  let classes = await Class.find(classFilter).lean();

  if (classes.length === 0) {
    const allClasses = await Class.find({ ownerId, archivedAt: null })
      .populate('academicPeriodId', 'schoolYear semester')
      .lean();
    const cleanSem = resolvedSemester.replace(' Semester', '').trim();
    const matchingPeriodClasses = allClasses.filter((c) => {
      const p = c.academicPeriodId;
      if (!p || !p.schoolYear) return false;
      return (
        p.schoolYear === resolvedSchoolYear &&
        (p.semester === cleanSem || `${p.semester} Semester` === resolvedSemester)
      );
    });
    classes = matchingPeriodClasses.length > 0 ? matchingPeriodClasses : allClasses;
  }

  const classIdList = classes.map((c) => c._id);

  // 5. Fetch uploaded documents
  const docFilter = { ownerId, archivedAt: null };
  if (selectedPeriodId) {
    const orClauses = [
      { academicPeriodId: selectedPeriodId },
      { academicPeriodId: null },
    ];
    if (classIdList.length > 0) {
      orClauses.push({ classIds: { $in: classIdList } });
    }
    docFilter.$or = orClauses;
  }
  const documents = await Document.find(docFilter).sort({ createdAt: -1 }).lean();

  // 6. Build Faculty Checklist (11 standard boxes: A 1.0 to L 1.0)
  const facultyDefinitions = [
    { code: 'A 1.0', label: 'Faculty Profile (Updated PDS)', keyPrefix: 'FAC_A', multiple: false, card: 'Faculty Profile (Updated PDS)' },
    { code: 'B 1.0', label: 'Educational Attainment', keyPrefix: 'FAC_B', multiple: true, card: 'Educational Attainment' },
    { code: 'C 1.0', label: 'Service Records', keyPrefix: 'FAC_C', multiple: true, card: 'Service Records' },
    { code: 'D 1.0', label: 'Seminars and Workshops', keyPrefix: 'FAC_D', multiple: true, card: 'List of Seminars and Workshops' },
    { code: 'E 1.0', label: 'Grants and Awards', keyPrefix: 'FAC_E', multiple: true, card: 'Grants, Awards and Certifications of Commendation' },
    { code: 'F 1.0', label: 'Research', keyPrefix: 'FAC_F', multiple: true, card: 'Research' },
    { code: 'G 1.0', label: 'Extension Involvement', keyPrefix: 'FAC_G', multiple: true, card: 'Extension Involvement' },
    { code: 'H 1.0', label: 'Production', keyPrefix: 'FAC_H', multiple: true, card: 'Production' },
    { code: 'I 1.0', label: 'Professional Membership', keyPrefix: 'FAC_I', multiple: true, card: 'Membership to Professional Organization' },
    { code: 'J 1.0', label: 'Passed Licensure Examinations', keyPrefix: 'FAC_J', multiple: false, card: 'Passed Licensure Examinations' },
    { code: 'L 1.0', label: 'IPCR (Photocopy from 1st and 2nd sem)', keyPrefix: 'FAC_L', multiple: false, card: 'IPCR' },
  ];

  const facultyChecklist = await Promise.all(
    facultyDefinitions.map(async (def) => {
      const matchingDocs = documents.filter(
        (d) => d.requirementKey && (d.requirementKey.startsWith(def.keyPrefix) || d.requirementKey === def.keyPrefix)
      );

      let status = '☐';
      let link = '';
      const total = matchingDocs.length;
      const approved = matchingDocs.filter((d) => d.status === 'approved').length;
      const pending = matchingDocs.filter((d) => d.status === 'pending_review').length;

      const isMultiple = Boolean(def.multiple || total > 1);

      const files = matchingDocs.map((doc) => {
        const curVer = doc.versions?.find((v) => v.n === doc.currentVersion) || doc.versions?.[doc.versions.length - 1];
        const driveId = curVer?.driveFileId;
        const fileLink = driveId ? `https://drive.google.com/file/d/${driveId}/view` : `/api/documents/${doc._id}/file`;
        const name =
          doc.meta?.organization ||
          doc.meta?.name ||
          doc.meta?.title ||
          curVer?.originalName ||
          'Document';
        return {
          id: doc._id,
          name,
          status: doc.status,
          link: fileLink,
          driveFileId: driveId || null,
        };
      });

      if (total === 0) {
        status = '☐';
        link = '';
      } else if (!isMultiple) {
        // Single document requirement (e.g. Faculty Profile / PDS, Licensure, IPCR)
        const doc = matchingDocs[0];
        link = files[0]?.link || '';

        if (doc.status === 'approved') status = '☑ View Document';
        else if (doc.status === 'pending_review') status = '☐ Pending review';
        else status = '☐ View Document';
      } else {
        // Multiple documents requirement: link to the Google Drive folder containing these files
        const preferredDoc = matchingDocs.find((d) => d.status === 'approved') || matchingDocs[0];
        const firstDriveId = preferredDoc?.versions?.[preferredDoc.versions.length - 1]?.driveFileId;

        // 1. Check if folderId is already saved on any document version
        let folderId = matchingDocs
          .map((d) => d.versions?.[d.versions.length - 1]?.driveFolderId)
          .find(Boolean);

        // 2. Query Drive for parent folder of the uploaded file
        if (!folderId && firstDriveId) {
          try {
            folderId = await storageService.getFileParentFolderId(firstDriveId);
          } catch {
            folderId = null;
          }
        }

        // 3. Fallback: resolve/ensure the canonical folder path
        if (!folderId) {
          try {
            const folderPath = driveNaming.facultyFolderPath({
              department: instructor?.department || 'General',
              fullName: instName,
              instructorId: ownerId,
              requirement: { checklistRef: def.code, card: def.card },
            });
            folderId = await storageService.ensureFolderPath(folderPath);
          } catch {
            folderId = null;
          }
        }

        if (folderId) {
          link = `https://drive.google.com/drive/folders/${folderId}`;

          // Backfill stored driveFolderId asynchronously for faster future requests
          if (preferredDoc?._id && preferredDoc.versions?.length > 0) {
            const curVerNum = preferredDoc.versions[preferredDoc.versions.length - 1].n;
            Document.updateOne(
              { _id: preferredDoc._id, 'versions.n': curVerNum, 'versions.driveFolderId': { $exists: false } },
              { $set: { 'versions.$.driveFolderId': folderId } }
            ).exec().catch(() => { });
          }
        } else if (files.length > 0 && files[0].link) {
          link = files[0].link;
        } else if (preferredDoc) {
          link = `/api/documents/${preferredDoc._id}/file`;
        }

        if (approved === total) {
          status = `☑ ${total} entries`;
        } else if (approved > 0) {
          status = `☑ ${approved} of ${total} approved`;
        } else if (pending > 0) {
          status = '☐ Pending review';
        } else {
          status = `☐ ${total} entries`;
        }
      }

      return {
        code: def.code,
        label: def.label,
        status,
        link: link || (files.length > 0 ? files[0].link : ''),
        count: total,
        approvedCount: approved,
        isMultiple,
        files,
      };
    })
  );

  // 7. Build Class Portfolio Matrix
  const subjects = classes.map((c) => ({
    id: c._id,
    code: c.subject?.code || 'SUBJ',
    section: c.section?.code || c.section?.name || '',
  }));

  const docToCellState = (doc) => {
    if (!doc) return { status: '☐', link: '', docStatus: null };
    const curVer = doc.versions?.find((v) => v.n === doc.currentVersion) || doc.versions?.[doc.versions.length - 1];
    const driveId = curVer?.driveFileId;
    const link = driveId
      ? `https://drive.google.com/file/d/${driveId}/view`
      : `/api/documents/${doc._id}/file`;
    const status =
      doc.status === 'approved'
        ? '☑ View'
        : doc.status === 'pending_review'
          ? '☐ Pending'
          : '☐ View';
    return {
      status,
      link,
      docStatus: doc.status,
      id: doc._id,
      name: curVer?.originalName || 'Document',
    };
  };

  const standardClassRows = [
    { code: 'A 1.0', label: 'Instructional Load Report', key: 'CLASS_A_LOAD_REPORT' },
    { code: 'B 1.0', label: 'Official Class list', key: 'CLASS_B_CLASS_LIST' },
    { code: 'C 1.0', label: 'Syllabus', key: 'CLASS_C_SYLLABUS' },
    { code: 'D 1.0', label: 'Instructional Materials', key: 'CLASS_D_IM' },
    { code: 'E 1.0', label: 'Classroom Policies Acknowledgement Receipt', key: 'CLASS_E_POLICIES_RECEIPT' },
    { code: 'F 1.0', label: 'Syllabus Acknowledgement Receipt', key: 'CLASS_F_SYLLABUS_RECEIPT' },
    { code: 'G 1.0', label: 'Seat Plan', key: 'CLASS_G_SEAT_PLAN' },
    { code: 'H 1.0', label: 'Classroom Officers', key: 'CLASS_H_OFFICERS' },
    { code: 'I 1.0', label: 'Attendance', key: 'CLASS_I_ATTENDANCE' },
    { code: 'J 1.0', label: 'Preliminary Test', key: 'CLASS_J_PRELIM_TEST' },
    { code: 'K 1.0', label: 'Signed TOS', key: 'CLASS_K_SIGNED_TOS', terms: ['Midterm', 'Finalterm'] },
    { code: 'L 1.0', label: 'Test Questionaire', key: 'CLASS_L_TEST_QUESTIONNAIRE', terms: ['Midterm', 'Finalterm'] },
    {
      code: '',
      label: 'Instruction of the Activities',
      key: 'CLASS_L_CHECKED_ACTIVITIES',
      slotType: 'instruction',
      cos: ['CO 1', 'CO 2', 'CO 3', 'CO 4', 'CO 5'],
    },
    {
      code: '',
      label: 'Sample of Checked Student Output',
      key: 'CLASS_L_CHECKED_ACTIVITIES',
      slotType: 'output',
      cos: ['CO 1', 'CO 2', 'CO 3', 'CO 4', 'CO 5'],
    },
    {
      code: '',
      label: 'Answer Key or Rated Rubrics',
      key: 'CLASS_L_CHECKED_ACTIVITIES',
      slotType: 'rubrics',
      cos: ['CO 1', 'CO 2', 'CO 3', 'CO 4', 'CO 5'],
    },
    {
      code: '',
      label: 'Raw score (class record) attached some (samples from LMS)',
      key: 'CLASS_M_CLASS_RECORD',
      slotType: 'raw_score',
    },
    {
      code: '',
      label: 'Grade sheet (class record) signed.',
      key: 'CLASS_M_CLASS_RECORD',
      slotType: 'gradesheet_signed',
    },
    {
      code: '',
      label: 'Official Grade sheet (Registrar)',
      key: 'CLASS_M_CLASS_RECORD',
      slotType: 'official_gradesheet',
    },
    {
      code: '',
      label: 'Google Classroom Classwork Score',
      key: 'CLASS_M_CLASS_RECORD',
      slotType: 'gclassroom_score',
    },
    {
      code: '',
      label: 'Student Consultation Forms',
      key: 'CLASS_N_STUDENT_CONSULTATION',
      slotType: 'consultation_forms',
    },
    {
      code: '',
      label: 'Samples Screen shots of online consultation platforms (with section code)',
      key: 'CLASS_N_STUDENT_CONSULTATION',
      slotType: 'online_consultation_screenshots',
    },
    {
      code: '',
      label: 'Evidence of addressing the student concerns (with section code)',
      key: 'CLASS_N_STUDENT_CONSULTATION',
      slotType: 'addressing_concerns_evidence',
    },
    { code: 'O 1.0', label: 'INC Completion requirement outputs', key: 'CLASS_O_INC_COMPLETION', singleFooter: true },
    { code: 'P 1.0', label: 'Supervisory class observation result', key: 'CLASS_P_SUPERVISORY_OBSERVATION', singleFooter: true },
    { code: 'Q 1.0', label: 'Summary of student evaluation', key: 'CLASS_Q_STUDENT_EVALUATION', singleFooter: true },
    { code: 'R 1.0', label: 'Learning Contract', key: 'CLASS_R_LEARNING_CONTRACT', singleFooter: true },
  ];

  const classRows = standardClassRows.map((rDef) => {
    if (rDef.singleFooter) {
      // Footer rows (O–R) apply across the instructor's classes for the period
      const matchingDocs = documents.filter((d) => d.requirementKey === rDef.key);
      const bestDoc =
        matchingDocs.find((d) => d.status === 'approved') ||
        matchingDocs.find((d) => d.status === 'pending_review') ||
        matchingDocs[0];
      const cellState = docToCellState(bestDoc);
      const files = matchingDocs.map((doc) => {
        const curVer = doc.versions?.find((v) => v.n === doc.currentVersion) || doc.versions?.[doc.versions.length - 1];
        const driveId = curVer?.driveFileId;
        return {
          id: doc._id,
          name: curVer?.originalName || 'Document',
          status: doc.status,
          link: driveId ? `https://drive.google.com/file/d/${driveId}/view` : `/api/documents/${doc._id}/file`,
          driveFileId: driveId || null,
        };
      });
      return {
        code: rDef.code,
        label: rDef.label,
        status: cellState.status,
        link: cellState.link,
        docStatus: bestDoc?.status,
        files,
        values: subjects.length > 0 ? subjects.map(() => cellState) : [cellState],
      };
    }

    const values = subjects.map((subj) => {
      const classDocs = documents.filter(
        (d) =>
          d.requirementKey === rDef.key &&
          (rDef.key === 'CLASS_A_LOAD_REPORT' ||
            (d.classIds && d.classIds.some((cid) => String(cid) === String(subj.id))))
      );

      if (rDef.terms) {
        const subs = {};
        rDef.terms.forEach((term) => {
          const termDoc = classDocs.find(
            (d) =>
              String(d.slot?.term || '').toLowerCase() === term.toLowerCase()
          );
          subs[term] = docToCellState(termDoc);
        });
        const anyApproved = Object.values(subs).some((s) => s.status.startsWith('☑'));
        const anyPending = Object.values(subs).some((s) => s.status.includes('Pending'));
        return {
          status: anyApproved ? '☑ View' : anyPending ? '☐ Pending' : '☐',
          link: '',
          subs,
        };
      }

      if (rDef.cos) {
        const subs = {};
        rDef.cos.forEach((coLabel) => {
          const coKey = coLabel.replace(/\s+/g, ''); // "CO 1" -> "CO1"
          const coDoc = classDocs.find(
            (d) =>
              d.slot?.type === rDef.slotType &&
              (String(d.slot?.co || '').replace(/\s+/g, '').toUpperCase() === coKey.toUpperCase())
          );
          subs[coLabel] = docToCellState(coDoc);
        });
        const anyApproved = Object.values(subs).some((s) => s.status.startsWith('☑'));
        const anyPending = Object.values(subs).some((s) => s.status.includes('Pending'));
        return {
          status: anyApproved ? '☑ View' : anyPending ? '☐ Pending' : '☐',
          link: '',
          subs,
        };
      }

      if (rDef.slotType) {
        const slotDoc = classDocs.find((d) => d.slot?.type === rDef.slotType);
        return docToCellState(slotDoc);
      }

      const bestDoc =
        classDocs.find((d) => d.status === 'approved') ||
        classDocs.find((d) => d.status === 'pending_review') ||
        classDocs[0];
      return docToCellState(bestDoc);
    });

    return {
      code: rDef.code,
      label: rDef.label,
      values,
    };
  });

  // 8. Build Documents Log
  const formattedDocs = documents.map((d) => {
    const curVer = d.versions?.[d.versions.length - 1] || {};
    const driveId = curVer.driveFileId;
    const reqMatch = [...facultyReqs, ...classReqs].find((r) => r.key === d.requirementKey);
    const reqName = reqMatch ? (reqMatch.label || reqMatch.card) : d.requirementKey;

    let displayStatus = 'Pending review';
    if (d.status === 'approved') displayStatus = 'Approved';
    else if (d.status === 'rejected') displayStatus = 'Rejected';
    else if (d.status === 'draft') displayStatus = 'Draft';

    return {
      id: d._id,
      requirement: reqName,
      title: curVer.originalName || d.meta?.title || 'Document',
      date: new Date(curVer.uploadedAt || d.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      filename: curVer.originalName || 'file.pdf',
      status: displayStatus,
      link: driveId ? `https://drive.google.com/file/d/${driveId}/view` : `/api/documents/${d._id}/file`,
    };
  });

  return {
    instructor: {
      id: instructor?._id,
      name: instName,
      department,
      rank: instructor?.profile?.rank || instructor?.profile?.position || 'Assistant Professor IV',
      photoUrl: instructor?.profile?.photoUrl || instructor?.googlePhotoUrl || null,
      completionPercentage: typeof instructor?.completionPercentage === 'number'
        ? instructor.completionPercentage
        : instructor?.completionRate ?? null,
    },
    instructorName: instName,
    department,
    schoolYear: resolvedSchoolYear,
    semester: resolvedSemester,
    academicPeriods: periods,
    currentPeriod: targetPeriod,
    facultyChecklist,
    classChecklist: {
      subjects,
      rows: classRows,
    },
    documents: formattedDocs,
  };
}

/**
 * GET /api/reports/compliance/data
 */
exports.getComplianceData = async (req, res) => {
  try {
    const isAdmin = isActingAsAdmin(req.user);
    const ownerId = isAdmin && req.query.instructorId ? req.query.instructorId : req.user.id;
    const { periodId, schoolYear, semester } = req.query;

    const data = await assembleCompliancePayload(ownerId, { periodId, schoolYear, semester });
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('Error in getComplianceData:', err);
    return res.status(500).json({ message: err.message || 'Failed to fetch compliance report data.' });
  }
};

/**
 * GET /api/reports/compliance/excel
 */
exports.downloadComplianceExcel = async (req, res) => {
  try {
    const isAdmin = isActingAsAdmin(req.user);
    const ownerId = isAdmin && req.query.instructorId ? req.query.instructorId : req.user.id;
    const { periodId, schoolYear, semester } = req.query;

    const data = await assembleCompliancePayload(ownerId, { periodId, schoolYear, semester });

    const buffer = await buildComplianceWorkbook(data, {
      schoolYear: data.schoolYear,
      semester: data.semester,
    });

    const safeName = (data.instructorName || 'Faculty').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeYear = (data.schoolYear || '2026-2027').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Compliance_Checklist_${safeName}_${safeYear}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Error generating Excel report:', err);
    return res.status(500).json({ message: err.message || 'Failed to generate Excel report.' });
  }
};

/**
 * POST /api/reports/compliance/sheets
 */
exports.exportComplianceGoogleSheet = async (req, res) => {
  try {
    const sheetsEnabled = await isFeatureEnabled('googleSheetsEnabled', true);
    if (!sheetsEnabled) {
      return res.status(503).json({
        message: 'Google Sheets export is currently disabled by the administrator.',
      });
    }

    const isAdmin = isActingAsAdmin(req.user);
    const ownerId = isAdmin && req.body.instructorId ? req.body.instructorId : req.user.id;
    const { periodId, schoolYear, semester } = req.body;

    const data = await assembleCompliancePayload(ownerId, { periodId, schoolYear, semester });

    const buffer = await buildComplianceWorkbook(data, {
      schoolYear: data.schoolYear,
      semester: data.semester,
    });

    const { drive, rootFolderId } = await getGoogleClients();

    let targetFolderId = rootFolderId;
    try {
      const folderPath = driveNaming.reportsFolderPath({
        department: data.department,
        fullName: data.instructorName,
        instructorId: ownerId,
      });
      const resolvedId = await storageService.ensureFolderPath(folderPath);
      if (resolvedId) targetFolderId = resolvedId;
    } catch (folderErr) {
      console.warn('Could not resolve instructor Reports folder, falling back to root:', folderErr.message);
    }

    const name = `Compliance Checklist - ${data.instructorName || 'Faculty'} (${data.schoolYear}, ${data.semester})`;
    const result = await uploadAsGoogleSheet(buffer, {
      name,
      auth: drive.context._options.auth,
      rootFolderId: targetFolderId,
    });

    return res.json({
      success: true,
      message: 'Google Sheet exported successfully.',
      spreadsheetUrl: result.spreadsheetUrl,
      spreadsheetId: result.spreadsheetId,
    });
  } catch (err) {
    console.error('Error exporting to Google Sheets:', err);
    return res.status(500).json({ message: err.message || 'Failed to export Google Sheet.' });
  }
};
