// client/src/config/navigation.js
//
// The menu of each role. The sidebar, the top bar and the breadcrumb all read from here,
// so adding or renaming a page only needs a change in this file.
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
} from 'lucide-react';

export const NAV = {
  instructor: {
    roleLabel: 'Instructor',
    defaultName: 'Instructor',
    homePath: '/instructors/dashboard',
    profilePath: '/instructors/profile',
    notificationsPath: '/instructors/notifications',
    showSectionInBreadcrumb: false, // Home > Faculty Portfolio
    sections: [
      {
        heading: 'Portfolio',
        items: [
          { to: '/instructors/dashboard', label: 'Dashboard', icon: Home },
          { to: '/instructors/faculty-portfolio', label: 'Faculty Portfolio', icon: Briefcase },
          { to: '/instructors/class-portfolio', label: 'Class Portfolio', icon: FolderOpen },
          { to: '/instructors/archive', label: 'Archive', icon: Archive },
          { to: '/instructors/notifications', label: 'Notifications', icon: Bell },
        ],
      },
      {
        heading: 'Account',
        items: [
          { to: '/instructors/profile', label: 'Profile', icon: User },
          { to: '/instructors/security', label: 'Security', icon: Lock },
        ],
      },
    ],
  },

  admin: {
    roleLabel: 'Administrator',
    defaultName: 'Admin User',
    homePath: '/admin/AdminDashboard',
    profilePath: '/admin/profile',
    securityPath: '/admin/security',
    notificationsPath: '/admin/notifications',
    showSectionInBreadcrumb: true, // Home > Review > Faculty Portfolio
    accountInTopBar: true, // My Profile, Security and Logout are in the top bar menu, not in the sidebar
    sections: [
      {
        heading: 'Management',
        items: [
          { to: '/admin/AdminDashboard', label: 'Dashboard', icon: Home },
          { to: '/admin/invite-instructor', label: 'Invite Instructors', icon: UserPlus },
          { to: '/admin/instructors', label: 'Instructors', icon: Users },
        ],
      },
      {
        heading: 'Review',
        items: [
          { to: '/admin/review/faculty-portfolio', label: 'Faculty Portfolio', icon: ClipboardCheck },
          { to: '/admin/review/class-portfolio', label: 'Class Portfolio', icon: ClipboardList },
        ],
      },
      {
        heading: 'Records',
        items: [
          { to: '/admin/archive', label: 'Archive', icon: Archive },
          { to: '/admin/academic-period', label: 'Academic Period', icon: Calendar },
        ],
      },
    ],
    // Pages that are not in the sidebar. They open from the top bar.
    otherPages: [
      { to: '/admin/notifications', label: 'Notifications' },
      { to: '/admin/profile', label: 'My Profile', heading: 'Account' },
      { to: '/admin/security', label: 'Security', heading: 'Account' },
    ],
  },
};

// Finds the menu item that matches the current address.
// A sub-page such as /admin/instructors/123 matches its parent, /admin/instructors.
// Returns { heading, item }, or null when nothing matches.
export function findMenuItem(role, pathname) {
  const menu = NAV[role];
  const matches = (item) => pathname === item.to || pathname.startsWith(item.to + '/');

  for (const section of menu.sections) {
    const item = section.items.find(matches);
    if (item) return { heading: section.heading, item };
  }

  // Pages that are not in the sidebar (they open from the top bar)
  const otherPage = (menu.otherPages || []).find(matches);
  return otherPage ? { heading: otherPage.heading, item: otherPage } : null;
}
