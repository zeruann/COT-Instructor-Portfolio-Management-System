import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import Sidebar from '../Sidebar';
import TopBar from './TopBar';
import Breadcrumb from './Breadcrumb';
import { fetchNotifications } from '../../api/notifications';
import {
  canUseAdminMode,
  getAdminPageKeyForPath,
  getFirstAllowedAdminPath,
  hasAdminPageAccess,
  hasFacultyRequirementAccess,
} from '../../config/adminPermissions';

function getDisplayNameFromProfile(data) {
  if (!data) return null;
  const p = data.profile || {};
  const parts = [p.firstName, p.middleName, p.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return data.fullName || null;
}

function readStoredUser(role) {
  try {
    if (role === 'admin') {
      const stored =
        localStorage.getItem('admin') ||
        localStorage.getItem('user') ||
        localStorage.getItem('instructor');
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = getDisplayNameFromProfile(parsed);
        if (name) return { ...parsed, fullName: name };
        return parsed;
      }
      return null;
    }
    const stored = localStorage.getItem('instructor') || localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      const name = getDisplayNameFromProfile(parsed);
      if (name) return { ...parsed, fullName: name };
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// The frame around every signed-in page: sidebar, top bar, breadcrumb, and the page itself.
function AppLayout({ role }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false); // the sidebar on phones and tablets
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [user, setUser] = useState(() => readStoredUser(role));
  const [unreadCount, setUnreadCount] = useState(0);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  // Poll unread notification count every 60 seconds
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchNotifications();
        if (!cancelled && Array.isArray(data)) {
          setUnreadCount(data.filter((n) => !n.readAt).length);
        }
      } catch {
        // silently ignore — badge is non-critical
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Allow child pages to reset the badge (e.g. after "Mark all as read")
  useEffect(() => {
    const onAllRead = () => setUnreadCount(0);
    const onOneRead = () => setUnreadCount((c) => Math.max(0, c - 1));
    const onOneDeleted = (e) => {
      if (e.detail?.unread) setUnreadCount((c) => Math.max(0, c - 1));
    };
    window.addEventListener('notifications-read', onAllRead);
    window.addEventListener('notification-read', onOneRead);
    window.addEventListener('notification-deleted', onOneDeleted);
    return () => {
      window.removeEventListener('notifications-read', onAllRead);
      window.removeEventListener('notification-read', onOneRead);
      window.removeEventListener('notification-deleted', onOneDeleted);
    };
  }, []);

  // Fetch current user from /api/profile/me on mount to guarantee fresh profile name
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/profile/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => {
        if (!me) return;
        const displayName = getDisplayNameFromProfile(me);
        const resolvedName = displayName || me.fullName;
        setUser((prev) => ({
          ...(prev || {}),
          ...me,
          fullName: resolvedName || prev?.fullName,
        }));

        // Keep localStorage up to date
        const storageKey = role === 'admin' ? 'admin' : 'instructor';
        const existing = localStorage.getItem(storageKey);
        const parsed = existing ? JSON.parse(existing) : {};
        localStorage.setItem(
          storageKey,
          JSON.stringify({ ...parsed, ...me, ...(resolvedName ? { fullName: resolvedName } : {}) })
        );
      })
      .catch((err) => console.warn('Could not fetch current profile for topbar:', err));
  }, [role]);

  // The Profile page fires "instructor-updated" or "admin-updated" after saving,
  // so the top bar shows the new name without reloading the page.
  useEffect(() => {
    const refreshUser = () => setUser(readStoredUser(role));
    window.addEventListener('instructor-updated', refreshUser);
    window.addEventListener('admin-updated', refreshUser);
    return () => {
      window.removeEventListener('instructor-updated', refreshUser);
      window.removeEventListener('admin-updated', refreshUser);
    };
  }, [role]);

  const currentAdminPageKey = role === 'admin' ? getAdminPageKeyForPath(pathname) : null;
  let isAdminRequirementLocked = false;
  if (role === 'admin' && user && pathname.startsWith('/admin/portfolio/faculty-portfolio/')) {
    const slug = pathname.replace('/admin/portfolio/faculty-portfolio/', '').split('/')[0];
    if (slug && slug !== 'other-requirements' && !hasFacultyRequirementAccess(user, slug)) {
      isAdminRequirementLocked = true;
    }
  }
  const isAdminPageLocked =
    role === 'admin' &&
    Boolean(user) &&
    (!canUseAdminMode(user) ||
      (currentAdminPageKey && !hasAdminPageAccess(user, currentAdminPageKey)) ||
      isAdminRequirementLocked);

  const firstAllowedAdminPath = role === 'admin' ? getFirstAllowedAdminPath(user) : '/instructors/dashboard';

  return (
    <div className="flex h-dvh bg-brand-bg">
      <Sidebar
        role={role}
        user={user}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          role={role}
          user={user}
          onMenuClick={() => setMenuOpen(true)}
          unreadCount={unreadCount}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
        <Breadcrumb role={role} />
        <main className="flex-1 overflow-y-auto p-5">
          <div key={pathname} className="motion-safe:animate-page-fade-in">
            {isAdminPageLocked ? (
              <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#efeef8] text-[#2e2a72]">
                  <Lock size={26} />
                </div>
                <h2 className="text-lg font-bold text-[#2e2a72]">Page Locked</h2>
                <p className="mt-1.5 text-sm text-gray-500">
                  You do not have permission to access this administrator page. Only pages and documents granted to your account are enabled.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {canUseAdminMode(user) && firstAllowedAdminPath !== pathname && (
                    <Link
                      to={firstAllowedAdminPath}
                      className="rounded-xl bg-[#2e2a72] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#231f5c] transition"
                    >
                      Go to Allowed Page
                    </Link>
                  )}
                  <Link
                    to="/instructors/dashboard"
                    className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Instructor Dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;