// client/src/config/adminPermissions.js

export const ADMIN_PAGES = [
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

export const FACULTY_DOCUMENT_PERMISSIONS = [
  { key: 'FAC_A_PDS', label: 'A 1.0 Faculty Profile (Updated PDS)', path: 'pds' },
  { key: 'FAC_B', label: 'B 1.0 Educational Attainment', path: 'educational-attainment' },
  { key: 'FAC_C_SERVICE_RECORD', label: 'C 1.0 Service Records', path: 'service-records' },
  { key: 'FAC_D_SEMINAR', label: 'D 1.0 Seminars and Workshops', path: 'seminars-and-workshops' },
  { key: 'FAC_E_AWARD', label: 'E 1.0 Achievements (Grants & Awards)', path: 'achievements' },
  { key: 'FAC_F_RESEARCH', label: 'F 1.0 Research', path: 'research' },
  { key: 'FAC_G_EXTENSION', label: 'G 1.0 Extension Involvement', path: 'extension-involvement' },
  { key: 'FAC_H_PRODUCTION', label: 'H 1.0 Production', path: 'production' },
  { key: 'FAC_I_MEMBERSHIP', label: 'I 1.0 Professional Organization Membership', path: 'professional-organization-membership' },
  { key: 'FAC_J_LICENSURE', label: 'J 1.0 Passed Licensure Examinations', path: 'passed-licensure-examinations' },
  { key: 'FAC_L_IPCR', label: 'L 1.0 IPCR', path: 'ipcr' },
];

export const CLASS_DOCUMENT_PERMISSIONS = [
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

export const EMPTY_ADMIN_ACCESS = {
  enabled: false,
  scope: 'none',
  pages: [],
  documents: {
    faculty: [],
    class: [],
  },
};

export function readStoredUserRecord() {
  try {
    const raw =
      localStorage.getItem('admin') ||
      localStorage.getItem('instructor') ||
      localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function canUseAdminMode(user) {
  if (!user) return false;
  if (user.accountType === 'Administrator') return true;
  return Boolean(user.adminAccess?.enabled && ['full', 'limited'].includes(user.adminAccess?.scope));
}

export function isFullAdministrator(user) {
  if (!user) return false;
  if (user.accountType === 'Administrator') return true;
  return Boolean(user.adminAccess?.enabled && user.adminAccess?.scope === 'full');
}

export function hasAdminPageAccess(user, pageKey) {
  if (!pageKey) return true;
  if (!user) return false;
  if (isFullAdministrator(user)) return true;
  if (!user.adminAccess?.enabled || user.adminAccess?.scope !== 'limited') return false;
  return Array.isArray(user.adminAccess.pages) && user.adminAccess.pages.includes(pageKey);
}

export function hasFacultyRequirementAccess(user, keyOrPath) {
  if (!user) return false;
  if (isFullAdministrator(user)) return true;
  if (!user.adminAccess?.enabled || user.adminAccess?.scope !== 'limited') return false;
  const granted = user.adminAccess.documents?.faculty || [];
  if (!keyOrPath) return granted.length > 0;

  const matched = FACULTY_DOCUMENT_PERMISSIONS.find(
    (d) =>
      d.key === keyOrPath ||
      d.path === keyOrPath ||
      String(keyOrPath).startsWith(`${d.key}_`)
  );
  if (matched) return granted.includes(matched.key);
  return granted.includes(keyOrPath);
}

export function hasClassRequirementAccess(user, requirementKey) {
  if (!user) return false;
  if (isFullAdministrator(user)) return true;
  if (!user.adminAccess?.enabled || user.adminAccess?.scope !== 'limited') return false;
  const granted = user.adminAccess.documents?.class || [];
  if (!requirementKey) return granted.length > 0;
  return granted.includes(requirementKey);
}

export function getAdminPageKeyForPath(pathname = '') {
  if (pathname.startsWith('/admin/AdminDashboard')) return 'dashboard';
  if (pathname.startsWith('/admin/instructors')) return 'instructors';
  if (pathname.startsWith('/admin/invite-instructor')) return 'invite_instructors';
  if (
    pathname.startsWith('/admin/review/faculty-portfolio') ||
    pathname.startsWith('/admin/portfolio/faculty-portfolio') ||
    pathname.startsWith('/admin/faculty-portfolio')
  ) {
    return 'review_faculty';
  }
  if (
    pathname.startsWith('/admin/review/class-portfolio') ||
    pathname.startsWith('/admin/class-portfolio')
  ) {
    return 'review_class';
  }
  if (pathname.startsWith('/admin/reports')) return 'reports';
  if (pathname.startsWith('/admin/archive-records') || pathname.startsWith('/admin/archive')) {
    return 'archive_records';
  }
  if (pathname.startsWith('/admin/academic-period')) return 'academic_period';
  if (pathname.startsWith('/admin/activity-logs')) return 'activity_logs';
  if (pathname.startsWith('/admin/settings')) return 'api_settings';
  return null;
}

export function getFirstAllowedAdminPath(user) {
  if (isFullAdministrator(user)) return '/admin/AdminDashboard';
  const pages = user?.adminAccess?.pages || [];
  const first = ADMIN_PAGES.find((p) => pages.includes(p.key));
  return first ? first.path : '/admin/AdminDashboard';
}

