// server/utils/driveNaming.js
//
// Builds the Drive folder paths and file names agreed for the project, so no controller
// types them by hand. Pure functions: no Drive calls, no database calls.
// Drive names are for people only. The app relies on stored IDs, never on names.

const { sanitizeName } = require('./storageService');

// "B 1.0" -> "B"
function checklistLetter(checklistRef) {
  const m = /^([A-Z])\b/.exec(String(checklistRef || '').trim());
  return m ? m[1] : null;
}

// Department / "Name [instructorId]"
function instructorBasePath({ department, fullName, instructorId }) {
  return [department || 'No Department', `${sanitizeName(fullName, 60)} [${instructorId}]`];
}

// Faculty documents: <base>/Faculty Portfolio/<A - Card title>
// Items not in the checklist go to "Other Documents".
function facultyFolderPath({ department, fullName, instructorId, requirement }) {
  const letter = requirement.inChecklist === false ? null : checklistLetter(requirement.checklistRef);
  const card = letter ? `${letter} - ${requirement.card}` : 'Other Documents';
  return [...instructorBasePath({ department, fullName, instructorId }), 'Faculty Portfolio', card];
}

// Class documents: <base>/Class Portfolio/SY 2026-2027/1st Sem/<IT141 - T40 | All classes>[/L - Sample Checked Activities/CO1]
// `classDoc` is the class record, or null for a document shared by several classes ("All classes").
function classFolderPath({ department, fullName, instructorId, period, classDoc, co }) {
  const folder = classDoc ? `${classDoc.subject.code} - ${classDoc.section.code}` : 'All classes';
  const path = [
    ...instructorBasePath({ department, fullName, instructorId }),
    'Class Portfolio',
    `SY ${period.schoolYear}`,
    `${period.semester} Sem`,
    folder,
  ];
  if (co) path.push('L - Sample Checked Activities', co);
  return path;
}

// <Slot>[_<Date or period or CO>]_v<N>_<CleanOriginalName>_<4 characters of the document id>.<ext>
//   Bachelors-TOR_v1_TOR-BSIT_c1d4.pdf
//   Seminar_2025-08-14_v1_Cert-DevOps_c3d4.pdf
//   L-CheckedOutput-Highest_CO1_v1_Student-A_e9f0.pdf
function buildFileName({ slot, qualifier, version, originalName, documentId }) {
  const dot = String(originalName || '').lastIndexOf('.');
  const ext = dot > 0 ? originalName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const base = dot > 0 ? originalName.slice(0, dot) : String(originalName || 'file');
  const clean = sanitizeName(base, 50).replace(/\s+/g, '-') || 'file';
  const shortId = String(documentId || '').slice(-4);
  const parts = [sanitizeName(slot, 60).replace(/\s+/g, '-'), qualifier && sanitizeName(qualifier, 30).replace(/\s+/g, '-'), `v${version}`, clean, shortId]
    .filter(Boolean)
    .join('_');
  return ext ? `${parts}.${ext}` : parts;
}

const SLOT_TYPE_LABELS = {
  return_receipt: 'Return Output Receipt',
  instruction: 'Instruction of the Activity',
  output: 'Sample Checked Activities',
  rubrics: 'Answer Key or Rated Rubrics',
  raw_score: 'Raw Score (Class Record)',
  gradesheet_signed: 'Grade Sheet (Signed)',
  official_gradesheet: 'Official Grade Sheet (Registrar)',
  gclassroom_score: 'Google Classroom Classwork Score',
  consultation_forms: 'Student Consultation Forms',
  online_consultation_screenshots: 'Online Consultation Screenshots',
  addressing_concerns_evidence: 'Evidence of Addressing Student Concerns',
};

// Standardized Class Portfolio filename:
//   - Sample Checked Activities (CO1..CO5): "CO1 - Activity Name.ext"
//   - All other Class Portfolio uploads:    "Section Code - Subject Code - Requirement.ext"
function buildClassFileName({ classDoc, requirement, slot, meta, originalName }) {
  const dot = String(originalName || '').lastIndexOf('.');
  const ext = dot > 0 ? originalName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';

  let baseName;
  if (requirement?.key === 'CLASS_L_CHECKED_ACTIVITIES' && slot?.co) {
    const coCode = sanitizeName(slot.co, 20);
    const activity = sanitizeName(meta?.activityName || meta?.title || meta?.name || 'Activity', 80);
    baseName = `${coCode} - ${activity}`;
  } else {
    const sectionCode = sanitizeName(classDoc?.section?.code || '', 30);
    const subjectCode = sanitizeName(classDoc?.subject?.code || '', 30);
    const baseReqLabel = SLOT_TYPE_LABELS[slot?.type] || requirement?.label || requirement?.card || 'Document';
    const reqLabel = sanitizeName(
      slot?.term ? `${baseReqLabel} (${slot.term})` : baseReqLabel,
      90
    );
    baseName = [sectionCode, subjectCode, reqLabel].filter(Boolean).join(' - ');
  }

  return ext ? `${baseName}.${ext}` : baseName;
}

// Reports: <base>/Reports
function reportsFolderPath({ department, fullName, instructorId }) {
  return [...instructorBasePath({ department, fullName, instructorId }), 'Reports'];
}

module.exports = {
  checklistLetter,
  instructorBasePath,
  facultyFolderPath,
  classFolderPath,
  reportsFolderPath,
  buildFileName,
  buildClassFileName,
};