// client/src/config/navigation.js

// The menu of each role. The sidebar, the top bar and the breadcrumb all read from here,
// so adding or renaming a page only needs a change in this file.
//
// An item with a `children` list becomes a dropdown in the sidebar (it has no `to` of its own).

import {
  Home,
  Briefcase,
  FolderOpen,
  Archive,
  Bell,
  User,
  Lock,
  Calendar,
  UserPlus,
  Users,
  ClipboardCheck,
  ClipboardList,
  Settings,
  History,
  FileSpreadsheet,
} from 'lucide-react';

export const NAV = {
  instructor: {
    roleLabel: 'Instructor',
    defaultName: 'Instructor',
    homePath: '/instructors/dashboard',
    profilePath: '/instructors/profile',
    securityPath: '/instructors/security',
    notificationsPath: '/instructors/notifications',
    accountInTopBar: true,
    showSectionInBreadcrumb: false, // Home > Faculty Portfolio

    sections: [
      {
        heading: 'Portfolio',
        items: [
          { to: '/instructors/dashboard', label: 'Dashboard', icon: Home },
          { to: '/instructors/faculty-portfolio', label: 'Faculty Portfolio', icon: Briefcase },
          { to: '/instructors/class-portfolio', label: 'Class Portfolio', icon: FolderOpen },
          { to: '/instructors/reports', label: 'Reports', icon: FileSpreadsheet },
          { to: '/instructors/archive', label: 'Archive', icon: Archive },
          { to: '/instructors/notifications', label: 'Notifications', icon: Bell },
        ],
      },
      {
        heading: 'Account',
        items: [
          { to: '/instructors/profile', label: 'Profile', icon: User },
          { to: '/instructors/activity-logs', label: 'Activity Logs', icon: History },
          { to: '/instructors/security', label: 'Security', icon: Lock },
        ],
      },
    ],

    // Pages that belong to Faculty Portfolio (shown in the breadcrumb).

    subPages: [
      { to: '/instructors/portfolio/faculty-portfolio/educational-attainment', label: 'Educational Attainment', parentTo: '/instructors/faculty-portfolio' },
      { to: '/instructors/portfolio/faculty-portfolio/service-records', label: 'Service Records', parentTo: '/instructors/faculty-portfolio' },
      { to: '/instructors/portfolio/faculty-portfolio/seminars-and-workshops', label: 'Seminars and Workshops', parentTo: '/instructors/faculty-portfolio' },
      { to: '/instructors/portfolio/faculty-portfolio/achievements', label: 'Achievements', parentTo: '/instructors/faculty-portfolio' },
      { to: '/instructors/portfolio/faculty-portfolio/research', label: 'Research', parentTo: '/instructors/faculty-portfolio' },
      { to: '/instructors/portfolio/faculty-portfolio/extension-involvement', label: 'Extension Involvement', parentTo: '/instructors/faculty-portfolio' },
      { to: '/instructors/portfolio/faculty-portfolio/production', label: 'Production', parentTo: '/instructors/faculty-portfolio' },
      { to: '/instructors/portfolio/faculty-portfolio/professional-organization-membership', label: 'Professional Organization Membership', parentTo: '/instructors/faculty-portfolio' },
      { to: '/instructors/portfolio/faculty-portfolio/passed-licensure-examinations', label: 'Passed Licensure Examinations', parentTo: '/instructors/faculty-portfolio' },
      { to: '/instructors/portfolio/faculty-portfolio/ipcr', label: 'IPCR', parentTo: '/instructors/faculty-portfolio' },

      // The three tabs share one crumb: Home > Faculty Portfolio > Other Requirements

      { to: '/instructors/portfolio/faculty-portfolio/other-requirements', label: 'Other Requirements', parentTo: '/instructors/faculty-portfolio' },
      { to: '/instructors/portfolio/faculty-portfolio/other-requirements/professional-organization-membership', label: 'Other Requirements', parentTo: '/instructors/faculty-portfolio' },
      { to: '/instructors/portfolio/faculty-portfolio/other-requirements/passed-licensure-examinations', label: 'Other Requirements', parentTo: '/instructors/faculty-portfolio' },
      { to: '/instructors/portfolio/faculty-portfolio/other-requirements/ipcr', label: 'Other Requirements', parentTo: '/instructors/faculty-portfolio' },

      // Class Portfolio nested routes are resolved dynamically in findSubPage
      // (paths include a class id): Home > Class Portfolio > Requirement
    ],
  },

  admin: {
    roleLabel: 'Administrator',
    defaultName: 'Admin User',
    homePath: '/admin/AdminDashboard',
    profilePath: '/admin/profile',
    securityPath: '/admin/security',
    notificationsPath: '/admin/notifications',
    showSectionInBreadcrumb: false, // Home > Faculty Portfolio
    accountInTopBar: true, // My Profile, Security and Logout are in the top bar menu, not in the sidebar

    sections: [
      {
        heading: 'Management',
        items: [
          { to: '/admin/AdminDashboard', label: 'Dashboard', icon: Home },

          // Dropdown: Instructors

          {
            label: 'Instructors',
            icon: Users,
            children: [
              { to: '/admin/instructors', label: 'View Instructors', icon: Users },
              { to: '/admin/invite-instructor', label: 'Invite Instructors', icon: UserPlus },
            ],
          },

          // Dropdown: Portfolio Review

          {
            label: 'Portfolio Review',
            icon: ClipboardCheck,
            children: [
              { to: '/admin/review/faculty-portfolio', label: 'Faculty Portfolio', icon: ClipboardCheck },
              { to: '/admin/review/class-portfolio', label: 'Class Portfolio', icon: ClipboardList },
            ],
          },
        ],
      },
      {
        heading: 'Records',
        items: [
          { to: '/admin/reports', label: 'Reports', icon: FileSpreadsheet },
          { to: '/admin/archive', label: 'Archive', icon: Archive, hidden: true },
          { to: '/admin/archive-records', label: 'Archive Records', icon: Archive },
          { to: '/admin/academic-period', label: 'Academic Period', icon: Calendar },
          { to: '/admin/activity-logs', label: 'Activity Logs', icon: History },
        ],
      },
      {
        heading: 'Settings',
        items: [
          { to: '/admin/settings', label: 'API Settings', icon: Settings },
        ],
      },
    ],

    // Pages that belong to Faculty Portfolio (shown in the breadcrumb).

    subPages: [
      { to: '/admin/portfolio/faculty-portfolio/educational-attainment', label: 'Educational Attainment', parentTo: '/admin/review/faculty-portfolio' },
      { to: '/admin/portfolio/faculty-portfolio/service-records', label: 'Service Records', parentTo: '/admin/review/faculty-portfolio' },
      { to: '/admin/portfolio/faculty-portfolio/seminars-and-workshops', label: 'Seminars and Workshops', parentTo: '/admin/review/faculty-portfolio' },
      { to: '/admin/portfolio/faculty-portfolio/achievements', label: 'Achievements', parentTo: '/admin/review/faculty-portfolio' },
      { to: '/admin/portfolio/faculty-portfolio/research', label: 'Research', parentTo: '/admin/review/faculty-portfolio' },
      { to: '/admin/portfolio/faculty-portfolio/extension-involvement', label: 'Extension Involvement', parentTo: '/admin/review/faculty-portfolio' },
      { to: '/admin/portfolio/faculty-portfolio/production', label: 'Production', parentTo: '/admin/review/faculty-portfolio' },
      { to: '/admin/portfolio/faculty-portfolio/professional-organization-membership', label: 'Professional Organization Membership', parentTo: '/admin/review/faculty-portfolio' },
      { to: '/admin/portfolio/faculty-portfolio/passed-licensure-examinations', label: 'Passed Licensure Examinations', parentTo: '/admin/review/faculty-portfolio' },
      { to: '/admin/portfolio/faculty-portfolio/ipcr', label: 'IPCR', parentTo: '/admin/review/faculty-portfolio' },

      // The three tabs share one crumb: Home > Portfolio Review > Faculty Portfolio > Other Requirements

      { to: '/admin/portfolio/faculty-portfolio/other-requirements', label: 'Other Requirements', parentTo: '/admin/review/faculty-portfolio' },
      { to: '/admin/portfolio/faculty-portfolio/other-requirements/professional-organization-membership', label: 'Other Requirements', parentTo: '/admin/review/faculty-portfolio' },
      { to: '/admin/portfolio/faculty-portfolio/other-requirements/passed-licensure-examinations', label: 'Other Requirements', parentTo: '/admin/review/faculty-portfolio' },
      { to: '/admin/portfolio/faculty-portfolio/other-requirements/ipcr', label: 'Other Requirements', parentTo: '/admin/review/faculty-portfolio' },

      // Pages that belong to Class Portfolio

      // Add class portfolio sub-pages here when their routes are available.
    ],

    // Pages that are not in the sidebar. They open from the top bar.

    otherPages: [
      { to: '/admin/notifications', label: 'Notifications' },
      { to: '/admin/profile', label: 'My Profile', heading: 'Account' },
      { to: '/admin/security', label: 'Security', heading: 'Account' },
    ],
  },
};

// Does the address belong to this item? /admin/instructors/123 belongs to /admin/instructors.
// Dropdown parents have no `to`, so they never match on their own.

function matches(item, pathname) {
  if (!item.to) return false;

  if (item.to === '/admin/review/class-portfolio') {
    return (
      pathname === item.to ||
      pathname.startsWith(item.to + '/') ||
      pathname.startsWith('/admin/class-portfolio/')
    );
  }

  return pathname === item.to || pathname.startsWith(item.to + '/');
}

// Finds the menu item that matches the current address.
// Returns { heading, item }, or null when nothing matches.
// For a page inside a dropdown, the heading is the dropdown's name
// (so the breadcrumb reads Home > Portfolio Review > Faculty Portfolio).

export function findMenuItem(role, pathname) {
  const menu = NAV[role];

  if (!menu) return null;

  for (const section of menu.sections) {
    for (const entry of section.items) {
      if (entry.children) {
        const child = entry.children.find((c) => matches(c, pathname));
        if (child) return { heading: entry.label, item: child };
      } else if (matches(entry, pathname)) {
        return { heading: section.heading, item: entry };
      }
    }
  }

  // Pages that are not in the sidebar (they open from the top bar)

  const otherPage = (menu.otherPages || []).find((entry) => matches(entry, pathname));
  return otherPage ? { heading: otherPage.heading, item: otherPage } : null;
}

// Class portfolio requirement path → breadcrumb label.
// Kept here so Breadcrumb can resolve nested /class-portfolio/:id/:reqPath routes.
export const CLASS_PORTFOLIO_REQ_LABELS = {
  'instructional-load-report': 'A 1.0 Instructional Load Report',
  'official-class-list': 'B 1.0 Official Class list',
  'syllabus': 'C 1.0 Syllabus',
  'instructional-materials': 'D 1.0 Instructional Materials',
  'classroom-policies': 'E 1.0 Classroom Policies Acknowledgement Receipt',
  'syllabus-acknowledgement': 'F 1.0 Syllabus Acknowledgement Receipt',
  'seat-plan': 'G 1.0 Seat Plan',
  'classroom-officers': 'H 1.0 Classroom Officers',
  'attendance': 'I. 1.0 Attendance',
  'preliminary-test': 'J. 1.0 Preliminary Test',
  'signed-tos': 'K. 1.0 Signed TOS',
  'test-questionnaire': 'L. 1.0 Test Questionnaire',
  'sample-checked-activities': 'L 1.0 Sample Checked Activities',
  'class-record-grades': 'M 1.0 Class record and official grade',
  'student-consultation-forms': 'N 1.0 Student consultation forms',
  'inc-completion': 'O 1.0 INC Completion requirement outputs',
  'supervisory-observation': 'P 1.0 Supervisory class observation result',
  'student-evaluation': 'Q 1.0 Summary of student evaluation',
  'learning-contract': 'R 1.0 Learning Contract',
};

function findClassPortfolioSubPage(role, pathname) {
  if (role === 'instructor') {
    const reqMatch = pathname.match(/^\/instructors\/class-portfolio\/([^/]+)\/([^/]+)\/?$/);
    if (reqMatch) {
      const [, classId, reqPath] = reqMatch;
      const label = CLASS_PORTFOLIO_REQ_LABELS[reqPath];
      if (label) {
        return {
          to: pathname,
          label,
          parentTo: '/instructors/class-portfolio',
          classId,
          reqPath,
        };
      }
    }

    const classMatch = pathname.match(/^\/instructors\/class-portfolio\/([^/]+)\/?$/);
    if (classMatch) {
      return {
        to: pathname,
        label: 'Class Details',
        parentTo: '/instructors/class-portfolio',
        classId: classMatch[1],
      };
    }
  }

  return null;
}

// Finds the sub-page of the current address (for example "Research"), or null.

export function findSubPage(role, pathname) {
  const menu = NAV[role];

  const classPortfolioSubPage = findClassPortfolioSubPage(role, pathname);
  if (classPortfolioSubPage) return classPortfolioSubPage;

  return (menu?.subPages || []).find((entry) => matches(entry, pathname)) || null;
}

// Finds the parent sidebar item for a nested portfolio page.

export function findParentMenuItem(role, pathname) {
  const menu = NAV[role];

  if (!menu) return null;

  const subPage = findSubPage(role, pathname);

  if (subPage?.parentTo) {
    for (const section of menu.sections) {
      for (const entry of section.items) {
        if (entry.children) {
          const child = entry.children.find((c) => c.to === subPage.parentTo);
          if (child) return { heading: entry.label, item: child };
        } else if (entry.to === subPage.parentTo) {
          return { heading: section.heading, item: entry };
        }
      }
    }
  }

  return findMenuItem(role, pathname);
}
