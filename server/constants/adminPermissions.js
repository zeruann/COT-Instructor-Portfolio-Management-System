// server/constants/adminPermissions.js

const ADMIN_PAGES = [
  { key: 'dashboard', label: 'Dashboard', path: '/admin/AdminDashboard' },
  { key: 'instructors', label: 'View Instructors', path: '/admin/instructors' },
  { key: 'invite_instructors', label: 'Invite Instructors', path: '/admin/invite-instructor' },
  { key: 'review_faculty', label: 'Faculty Portfolio Review', path: '/admin/review/faculty-portfolio' },
  { key: 'review_class', label: 'Class Portfolio Review', path: '/admin/review/class-portfolio' },
  { key: 'reports', label: 'Reports', path: '/admin/reports' },
  { key: 'archive_records', label: 'Archive Records', path: '/admin/archive-records' },
  { key: 'academic_period', label: 'Academic Period', path: '/admin/academic-period' },
  { key: 'activity_logs', label: 'Activity Logs', path: '/admin/activity-logs' },
  { key: 'api_settings', label: 'API Settings', path: '/admin/settings' },
];

const FACULTY_DOCUMENT_PERMISSIONS = [
  { key: 'FAC_A_PDS', label: 'A 1.0 Faculty Profile (Updated PDS)' },
  { key: 'FAC_B', label: 'B 1.0 Educational Attainment' },
  { key: 'FAC_C_SERVICE_RECORD', label: 'C 1.0 Service Records' },
  { key: 'FAC_D_SEMINAR', label: 'D 1.0 Seminars and Workshops' },
  { key: 'FAC_E_AWARD', label: 'E 1.0 Achievements (Grants & Awards)' },
  { key: 'FAC_F_RESEARCH', label: 'F 1.0 Research' },
  { key: 'FAC_G_EXTENSION', label: 'G 1.0 Extension Involvement' },
  { key: 'FAC_H_PRODUCTION', label: 'H 1.0 Production' },
  { key: 'FAC_I_MEMBERSHIP', label: 'I 1.0 Professional Organization Membership' },
  { key: 'FAC_J_LICENSURE', label: 'J 1.0 Passed Licensure Examinations' },
  { key: 'FAC_L_IPCR', label: 'L 1.0 IPCR' },
];

const CLASS_DOCUMENT_PERMISSIONS = [
  { key: 'CLASS_A_LOAD_REPORT', label: 'A 1.0 Instructional Load Report' },
  { key: 'CLASS_B_CLASS_LIST', label: 'B 1.0 Official Class list' },
  { key: 'CLASS_C_SYLLABUS', label: 'C 1.0 Syllabus' },
  { key: 'CLASS_D_IM', label: 'D 1.0 Instructional Materials' },
  { key: 'CLASS_E_POLICIES_RECEIPT', label: 'E 1.0 Classroom Policies Acknowledgement Receipt' },
  { key: 'CLASS_F_SYLLABUS_RECEIPT', label: 'F 1.0 Syllabus Acknowledgement Receipt' },
  { key: 'CLASS_G_SEAT_PLAN', label: 'G 1.0 Seat Plan' },
  { key: 'CLASS_H_OFFICERS', label: 'H 1.0 Classroom Officers' },
  { key: 'CLASS_I_ATTENDANCE', label: 'I 1.0 Attendance' },
  { key: 'CLASS_J_PRELIM_TEST', label: 'J 1.0 Preliminary Test' },
  { key: 'CLASS_K_SIGNED_TOS', label: 'K 1.0 Signed TOS' },
  { key: 'CLASS_L_TEST_QUESTIONNAIRE', label: 'L 1.0 Test Questionnaire' },
  { key: 'CLASS_L_CHECKED_ACTIVITIES', label: 'L 1.0 Sample Checked Activities' },
  { key: 'CLASS_M_CLASS_RECORD', label: 'M 1.0 Class record and official grade' },
  { key: 'CLASS_N_STUDENT_CONSULTATION', label: 'N 1.0 Student consultation forms' },
  { key: 'CLASS_O_INC_COMPLETION', label: 'O 1.0 INC Completion requirement outputs' },
  { key: 'CLASS_P_SUPERVISORY_OBSERVATION', label: 'P 1.0 Supervisory class observation result' },
  { key: 'CLASS_Q_STUDENT_EVALUATION', label: 'Q 1.0 Summary of student evaluation' },
  { key: 'CLASS_R_LEARNING_CONTRACT', label: 'R 1.0 Learning Contract' },
];

const VALID_PAGE_KEYS = new Set(ADMIN_PAGES.map((p) => p.key));
const VALID_FACULTY_KEYS = new Set(FACULTY_DOCUMENT_PERMISSIONS.map((d) => d.key));
const VALID_CLASS_KEYS = new Set(CLASS_DOCUMENT_PERMISSIONS.map((d) => d.key));

function normalizeAdminAccess(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      enabled: false,
      scope: 'none',
      pages: [],
      documents: { faculty: [], class: [] },
    };
  }

  const scope = ['none', 'full', 'limited'].includes(raw.scope) ? raw.scope : 'none';
  if (scope === 'none' || raw.enabled === false) {
    return {
      enabled: false,
      scope: 'none',
      pages: [],
      documents: { faculty: [], class: [] },
    };
  }

  if (scope === 'full') {
    return {
      enabled: true,
      scope: 'full',
      pages: ADMIN_PAGES.map((p) => p.key),
      documents: {
        faculty: FACULTY_DOCUMENT_PERMISSIONS.map((d) => d.key),
        class: CLASS_DOCUMENT_PERMISSIONS.map((d) => d.key),
      },
    };
  }

  const pages = [
    ...new Set((Array.isArray(raw.pages) ? raw.pages : []).filter((k) => VALID_PAGE_KEYS.has(k))),
  ];
  const faculty = [
    ...new Set(
      (Array.isArray(raw.documents?.faculty) ? raw.documents.faculty : []).filter((k) =>
        VALID_FACULTY_KEYS.has(k)
      )
    ),
  ];
  const classDocs = [
    ...new Set(
      (Array.isArray(raw.documents?.class) ? raw.documents.class : []).filter((k) =>
        VALID_CLASS_KEYS.has(k)
      )
    ),
  ];

  // Auto-enable Portfolio Review pages when specific documents under them are granted
  if (faculty.length > 0 && !pages.includes('review_faculty')) {
    pages.push('review_faculty');
  }
  if (classDocs.length > 0 && !pages.includes('review_class')) {
    pages.push('review_class');
  }

  const enabled = pages.length > 0 || faculty.length > 0 || classDocs.length > 0;
  return {
    enabled,
    scope: enabled ? 'limited' : 'none',
    pages: enabled ? pages : [],
    documents: {
      faculty: enabled ? faculty : [],
      class: enabled ? classDocs : [],
    },
  };
}

function isActingAsAdmin(reqUser) {
  if (!reqUser) return false;
  if (reqUser.activeRole) {
    return reqUser.activeRole === 'admin';
  }
  return reqUser.accountType === 'Administrator';
}

function canUseAdminMode(user) {
  if (!user) return false;
  if (user.accountType === 'Administrator') return true;
  return Boolean(user.adminAccess?.enabled && ['full', 'limited'].includes(user.adminAccess?.scope));
}

function hasAdminPageAccess(user, pageKey) {
  if (!user) return false;
  if (user.accountType === 'Administrator') return true;
  if (!user.adminAccess?.enabled) return false;
  if (user.adminAccess.scope === 'full') return true;
  if (user.adminAccess.scope === 'limited') {
    return Array.isArray(user.adminAccess.pages) && user.adminAccess.pages.includes(pageKey);
  }
  return false;
}

function hasDocumentReviewAccess(user, requirementKey) {
  if (!user) return false;
  if (user.accountType === 'Administrator') return true;
  if (!user.adminAccess?.enabled) return false;
  if (user.adminAccess.scope === 'full') return true;
  if (user.adminAccess.scope !== 'limited') return false;
  if (!requirementKey) return false;

  const key = String(requirementKey);
  if (key.startsWith('FAC_')) {
    const granted = user.adminAccess.documents?.faculty || [];
    if (granted.includes(key)) return true;
    return granted.some((g) => key.startsWith(`${g}_`) || key === g);
  }
  if (key.startsWith('CLASS_')) {
    const granted = user.adminAccess.documents?.class || [];
    return granted.includes(key);
  }
  return false;
}

function formatAccessSummary(access) {
  if (!access || !access.enabled || access.scope === 'none') {
    return 'No Administrator access';
  }
  if (access.scope === 'full') {
    return 'Full Administrator access (all pages and documents)';
  }
  const pageCount = access.pages?.length || 0;
  const facCount = access.documents?.faculty?.length || 0;
  const classCount = access.documents?.class?.length || 0;
  const parts = [];
  if (pageCount > 0) parts.push(`${pageCount} admin page${pageCount === 1 ? '' : 's'}`);
  if (facCount > 0) parts.push(`${facCount} faculty requirement${facCount === 1 ? '' : 's'}`);
  if (classCount > 0) parts.push(`${classCount} class requirement${classCount === 1 ? '' : 's'}`);
  return `Limited Administrator access (${parts.join(', ') || 'none'})`;
}

module.exports = {
  ADMIN_PAGES,
  FACULTY_DOCUMENT_PERMISSIONS,
  CLASS_DOCUMENT_PERMISSIONS,
  normalizeAdminAccess,
  isActingAsAdmin,
  canUseAdminMode,
  hasAdminPageAccess,
  hasDocumentReviewAccess,
  formatAccessSummary,
};

