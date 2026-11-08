// server/controllers/reportController.js
const Instructor = require('../models/Instructor');
const Document = require('../models/Document');
const Requirement = require('../models/Requirement');
const Class = require('../models/Class');
const AcademicPeriod = require('../models/AcademicPeriod');
const { buildComplianceWorkbook, uploadAsGoogleSheet } = require('../reports/complianceWorkbook');
const { getGoogleClients } = require('../utils/sheetsService');

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
  const classes = await Class.find(classFilter).lean();

  // 5. Fetch uploaded documents
  const docFilter = { ownerId };
  if (selectedPeriodId) {
    docFilter.$or = [
      { academicPeriodId: selectedPeriodId },
      { academicPeriodId: null },
    ];
  }
  const documents = await Document.find(docFilter).sort({ createdAt: -1 }).lean();

  // 6. Build Faculty Checklist (11 standard boxes: A 1.0 to L 1.0)
  const facultyDefinitions = [
    { code: 'A 1.0', label: 'Faculty Profile (Updated PDS)', keyPrefix: 'FAC_A' },
    { code: 'B 1.0', label: 'Educational Attainment', keyPrefix: 'FAC_B' },
    { code: 'C 1.0', label: 'Service Records', keyPrefix: 'FAC_C' },
    { code: 'D 1.0', label: 'Seminars and Workshops', keyPrefix: 'FAC_D' },
    { code: 'E 1.0', label: 'Grants and Awards', keyPrefix: 'FAC_E' },
    { code: 'F 1.0', label: 'Research', keyPrefix: 'FAC_F' },
    { code: 'G 1.0', label: 'Extension Involvement', keyPrefix: 'FAC_G' },
    { code: 'H 1.0', label: 'Production', keyPrefix: 'FAC_H' },
    { code: 'I 1.0', label: 'Professional Membership', keyPrefix: 'FAC_I' },
    { code: 'J 1.0', label: 'Passed Licensure Examinations', keyPrefix: 'FAC_J' },
    { code: 'L 1.0', label: 'IPCR (Photocopy from 1st and 2nd sem)', keyPrefix: 'FAC_L' },
  ];

  const facultyChecklist = facultyDefinitions.map((def) => {
    const matchingDocs = documents.filter(
      (d) => d.requirementKey && (d.requirementKey.startsWith(def.keyPrefix) || d.requirementKey === def.keyPrefix)
    );

    let status = '☐';
    let link = '';
    const total = matchingDocs.length;
    const approved = matchingDocs.filter((d) => d.status === 'approved').length;
    const pending = matchingDocs.filter((d) => d.status === 'pending_review').length;

    if (total === 0) {
      status = '☐';
    } else if (total === 1) {
      const doc = matchingDocs[0];
      const driveId = doc.versions?.[doc.versions.length - 1]?.driveFileId;
      link = driveId ? `https://drive.google.com/file/d/${driveId}/view` : `/api/documents/${doc._id}/file`;

      if (doc.status === 'approved') status = '☑ View Document';
      else if (doc.status === 'pending_review') status = '☐ Pending review';
      else status = '☐ View Document';
    } else {
      const firstDriveId = matchingDocs[0].versions?.[matchingDocs[0].versions.length - 1]?.driveFileId;
      link = firstDriveId ? `https://drive.google.com/file/d/${firstDriveId}/view` : `/api/documents/${matchingDocs[0]._id}/file`;

      if (approved === total) {
        status = `☑ ${total} entries`;
      } else if (approved > 0) {
        status = `☐ ${approved} of ${total} approved`;
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
      link,
      count: total,
      approvedCount: approved,
    };
  });

  // 7. Build Class Portfolio Matrix
  const subjects = classes.map((c) => ({
    id: c._id,
    code: c.subject?.code || 'SUBJ',
    section: c.section?.code || c.section?.name || '',
  }));

  const standardClassRows = [
    { code: 'A 1.0', label: 'Instructional Load Report', key: 'CLASS_A_LOAD_REPORT' },
    { code: 'B 1.0', label: 'Official Class list', key: 'CLASS_B_CLASS_LIST' },
    { code: 'C 1.0', label: 'Syllabus', key: 'CLASS_C_SYLLABUS' },
    { code: 'D 1.0', label: 'Instructional Materials', key: 'CLASS_D_IM' },
    { code: 'E 1.0', label: 'Classroom Policies Acknowledgement Receipt', key: 'CLASS_E_POLICIES_RECEIPT' },
    { code: 'F 1.0', label: 'Syllabus Acknowledgement Receipt', key: 'CLASS_F_SYLLABUS_RECEIPT' },
    { code: 'G 1.0', label: 'Seat Plan', key: 'CLASS_G_SEAT_PLAN' },
    { code: 'H 1.0', label: 'Classroom Officers (with Signatures)', key: 'CLASS_H_OFFICERS' },
    { code: 'I 1.0', label: 'Attendance', key: 'CLASS_I_ATTENDANCE' },
    { code: 'J 1.0', label: 'Preliminary Test (Test Checker and Item Analyzer)', key: 'CLASS_J_PRELIM_TEST' },
    { code: 'K 1.0', label: 'Signed TOS (Midterm / Finalterm)', key: 'CLASS_K_SIGNED_TOS' },
    { code: 'L 1.0', label: 'Test Questionnaire (Midterm / Finalterm)', key: 'CLASS_L_TEST_QUESTIONNAIRE' },
    { code: 'I 1.0', label: 'Sample Checked Activities (CO1 - CO5)', key: 'CLASS_L_CHECKED_ACTIVITIES' },
    { code: 'M 1.0', label: 'Class record and official grade', key: 'CLASS_M_CLASS_RECORD' },
    { code: 'N 1.0', label: 'Student consultation forms', key: 'CLASS_N_STUDENT_CONSULTATION' },
    { code: 'O 1.0', label: 'INC Completion requirement outputs', key: 'CLASS_O_INC_COMPLETION' },
    { code: 'P 1.0', label: 'Supervisory class observation result', key: 'CLASS_P_SUPERVISORY_OBSERVATION' },
    { code: 'Q 1.0', label: 'Summary of student evaluation', key: 'CLASS_Q_STUDENT_EVALUATION' },
    { code: 'R 1.0', label: 'Learning Contract', key: 'CLASS_R_LEARNING_CONTRACT' },
  ];

  const classRows = standardClassRows.map((rDef) => {
    const values = subjects.map((subj) => {
      const match = documents.find(
        (d) =>
          d.classIds &&
          d.classIds.some((cid) => String(cid) === String(subj.id)) &&
          d.requirementKey === rDef.key
      );

      if (!match) return { status: '☐', link: '' };

      const driveId = match.versions?.[match.versions.length - 1]?.driveFileId;
      const link = driveId ? `https://drive.google.com/file/d/${driveId}/view` : `/api/documents/${match._id}/file`;
      const status = match.status === 'approved' ? '☑ View' : match.status === 'pending_review' ? '☐ Pending' : '☐ View';
      return { status, link };
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
    const isAdmin = req.user.accountType === 'Administrator';
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
    const isAdmin = req.user.accountType === 'Administrator';
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
    const isAdmin = req.user.accountType === 'Administrator';
    const ownerId = isAdmin && req.body.instructorId ? req.body.instructorId : req.user.id;
    const { periodId, schoolYear, semester } = req.body;

    const data = await assembleCompliancePayload(ownerId, { periodId, schoolYear, semester });

    const buffer = await buildComplianceWorkbook(data, {
      schoolYear: data.schoolYear,
      semester: data.semester,
    });

    const { drive, rootFolderId } = await getGoogleClients();

    const name = `Compliance Checklist - ${data.instructorName || 'Faculty'}`;
    const result = await uploadAsGoogleSheet(buffer, {
      name,
      auth: drive.context._options.auth,
      rootFolderId,
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
