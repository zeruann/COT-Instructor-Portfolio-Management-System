// Shared schema and data adapters for BukSU COT Faculty Compliance Checklist

export const CATEGORY_PATHS = [
  'educational-attainment',
  'service-records',
  'seminars-and-workshops',
  'achievements',
  'research',
  'extension-involvement',
  'production',
  'professional-organization-membership',
  'passed-licensure-examinations',
  'ipcr',
];

export const computeCompletion = (summaries) => {
  const categoryCount = CATEGORY_PATHS.length;
  let approvedShare = 0;
  let pendingShare = 0;
  let rejectedShare = 0;
  const counts = { approved: 0, pending: 0, rejected: 0 };

  CATEGORY_PATHS.forEach((path) => {
    const s = summaries?.[path] || {};
    const approved = s.approved || 0;
    const pending = s.pendingReview || 0;
    const rejected = s.rejected || 0;
    const total = Math.max(s.totalFiles || 0, approved + pending + rejected);
    if (total === 0) return;

    approvedShare += approved / total;
    pendingShare += pending / total;
    rejectedShare += rejected / total;
    counts.approved += approved;
    counts.pending += pending;
    counts.rejected += rejected;
  });

  const toPct = (share) => (share / categoryCount) * 100;
  return {
    percent: Math.round(toPct(approvedShare)),
    approvedPct: toPct(approvedShare),
    pendingPct: toPct(pendingShare),
    rejectedPct: toPct(rejectedShare),
    counts,
  };
};

export const SUBJECT_COLUMNS = 8;

// Faculty Portfolio: 3 rows on a 9-column grid. `span` = columns used.
export const FACULTY_ROWS = [
  [
    { code: 'A', span: 1, title: 'A. 1.0 Faculty Profile', note: '(Updated PDS)' },
    {
      code: 'B',
      span: 2,
      title: 'B 1.0 Educational Attainment',
      note: '(TOR, Diploma or Certificate of Unit earned of Bachelors, Masters and PhD )',
    },
    { code: 'C', span: 2, title: 'C 1.0 Service Records' },
    {
      code: 'D',
      span: 4,
      title: 'D 1.0 List of Seminar, Workshop and sample copies',
      note: '( Updated list from PDS and Certificates of seminar workshops from August 2019- present) (Log all your Seminars, Workshops moving forward)',
    },
  ],
  [
    {
      code: 'E',
      span: 1,
      title: 'E 1.0 Grants, Awards, Certification of commendation (Speakership) -',
      note: '(Arrange from Late to present)',
    },
    {
      code: 'F',
      span: 2,
      title: 'F 1.0 Research proposals, and finished/ Published',
      note: '(Arrange from Late to present and Certificate of publication and abstract)',
    },
    {
      code: 'G',
      span: 3,
      title: 'G 1.0 Extension Involvement',
      note: '( Certificates of extensions involvement, project leaders training designs etc. or any related documents that proof of extension involvements )',
    },
    {
      code: 'H',
      span: 3,
      title: 'H 1.0 Production (Published IM’s, Copyrighted, Patent and Utility Models)',
      note: '(Certificates of Copyrighted IM’s, Patent or utility model approved application 1st or 2nd certificate.)',
    },
  ],
  [
    {
      code: 'I',
      span: 2,
      title: 'I 1.0 Membership to professional organization',
      note: '(Sample copy of professional membership form present)',
    },
    {
      code: 'J',
      span: 2,
      title: 'J. 1.0 Passed Licensure Examinations',
      note: '(Sample copy of PRC ID)',
    },
    {
      code: 'L',
      span: 5,
      title: 'L 1.0 IPCR',
      note: '(Photocopy of IPCR from (1st and 2nd sem, current school year))',
    },
  ],
];

export const TERMS = ['Midterm', 'Finalterm'];
export const COS = ['CO 1', 'CO 2', 'CO 3', 'CO 4', 'CO 5'];

// Index after L. 1.0 Test Questionaire where PDF checklist splits cleanly from Page 1 to Page 2
export const CHECKLIST_PAGE1_CLASS_COUNT = 12;

export const CLASS_ROWS = [
  { type: 'row', code: 'A', title: 'A 1.0 Instructional Load Report' },
  { type: 'row', code: 'B', title: 'B 1.0 Official Class list', note: '(SIAS and Google Classroom)' },
  { type: 'row', code: 'C', title: 'C 1.0 Syllabus', note: '(with Form 17 and 18 include draft)' },
  { type: 'row', code: 'D', title: 'D 1.0 Instructional Materials' },
  { type: 'row', code: 'E', title: 'E 1.0 Classroom Policies Acknowledgement Receipt' },
  { type: 'row', code: 'F', title: 'F 1.0 Syllabus Acknowledgement Receipt' },
  { type: 'row', code: 'G', title: 'G 1.0 Seat Plan' },
  { type: 'row', code: 'H', title: 'H. 1.0 Classroom Officers', note: '(with Signatures)' },
  { type: 'row', code: 'I', title: 'I. 1.0 Attendance' },
  { type: 'row', code: 'J', title: 'J. 1.0 Preliminary Test - Test Checker and Item Analyzer' },
  { type: 'row', code: 'K', title: 'K. 1.0 Signed TOS', subs: TERMS },
  { type: 'row', code: 'L', title: 'L. 1.0 Test Questionaire', subs: TERMS },
  { type: 'section', title: 'L 1.0 Sample Checked Activities' },
  { type: 'row', title: 'Instruction of the Activities', note: '(per Course Outcome)', subs: COS, stack: true },
  {
    type: 'row',
    title: 'Sample of Checked Student Output',
    note: '(3 students with highest, middle and lowest score)',
    subs: COS,
    stack: true,
  },
  { type: 'row', title: 'Answer Key or Rated Rubrics', subs: COS, stack: true },
  { type: 'row', title: 'Return Output Receipt', empty: true },
  { type: 'spacer' },
  { type: 'section', title: 'M 1.0 Class record and official grade' },
  { type: 'row', title: 'Raw score (class record) attached some (samples from LMS)' },
  { type: 'row', title: 'Grade sheet (class record) signed.' },
  { type: 'row', title: 'Official Grade sheet (Registrar)' },
  { type: 'row', title: 'Google Classroom Classwork Score' },
  { type: 'spacer' },
  { type: 'section', title: 'N 1.0 Student consultation forms' },
  { type: 'row', title: 'Student Consultation Forms' },
  { type: 'row', title: 'Samples Screen shots of online consultation platforms', note: '(with section code)' },
  { type: 'row', title: 'Evidence of addressing the student concerns', note: '(with section code)' },
  { type: 'spacer' },
];

// Bottom block (O to R): single boxes, not per subject.
export const FOOTER_ROWS = [
  [
    {
      code: 'O',
      span: 5,
      title: 'O 1.0 INC Completion requirement outputs',
      note: '(Sample Activity of the students attached the assessment tools and accomplished INC Form.)',
    },
    {
      code: 'P',
      span: 4,
      title: 'P 1.0 Supervisory class observation result',
      note: '(Class observation rating of supervisors (chair/Dean))',
    },
  ],
  [
    {
      code: 'Q',
      span: 4,
      title: 'Q 1.0 Summary of student evaluation',
      note: '(QAMIS Ratings screen shots and Sample of comments (optional) and corrective actions if needed)',
    },
    { code: 'R', span: 2, title: 'R 1.0 Learning Contract' },
    { span: 3, blank: true },
  ],
];

export const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const isDone = (s = '') => String(s).startsWith('☑');
export const isPending = (s = '') => String(s).includes('Pending');

export function stateOf(x) {
  if (x == null) return { checked: false, pending: false, link: '', files: [] };
  if (typeof x === 'boolean') return { checked: x, pending: false, link: '', files: [] };
  if (typeof x === 'string') return { checked: isDone(x), pending: isPending(x), link: '', files: [] };
  const checked = isDone(x.status) || x.docStatus === 'approved';
  const pending = isPending(x.status) || x.docStatus === 'pending_review';
  const link = x.link || '';
  const files =
    Array.isArray(x.files) && x.files.length > 0
      ? x.files
      : link
        ? [{ link, status: x.docStatus || (checked ? 'approved' : 'pending_review'), name: x.name || 'Document' }]
        : [];
  return { checked, pending, link, files, docStatus: x.docStatus };
}

export function findApiRow(apiRows, tpl) {
  if (!Array.isArray(apiRows)) return undefined;
  const t = norm(tpl.title).replace(/^[a-z]10/, '');
  const bare = (r) => norm(r.label).replace(/^[a-z]10/, '');
  return (
    apiRows.find((r) => bare(r) && bare(r) === t) ||
    (tpl.code
      ? apiRows.find(
        (r) => r.code && norm(r.code).startsWith(norm(tpl.code)) && norm(r.code).length <= 4
      )
      : undefined) ||
    apiRows.find((r) => {
      const l = bare(r);
      return l && t && (l.includes(t) || t.includes(l));
    })
  );
}

export function readBox(cell, sub) {
  if (!cell) return stateOf(null);
  if (!sub) return stateOf(cell);
  const hit =
    cell.items?.find?.((i) => norm(i.label) === norm(sub)) ?? cell.subs?.[sub] ?? cell[sub];
  return stateOf(hit !== undefined ? hit : cell);
}

