import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar';
import TopBar from './TopBar';
import Breadcrumb from './Breadcrumb';
import { fetchNotifications } from '../../api/notifications';

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
  const [menuOpen, setMenuOpen] = useState(false); // the sidebar on phones and tablets
  const [user, setUser] = useState(() => readStoredUser(role));
  const [unreadCount, setUnreadCount] = useState(0);

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
    window.addEventListener('notifications-read', onAllRead);
    window.addEventListener('notification-read', onOneRead);
    return () => {
      window.removeEventListener('notifications-read', onAllRead);
      window.removeEventListener('notification-read', onOneRead);
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
        if (displayName) {
          setUser((prev) => ({
            ...(prev || {}),
            ...me,
            fullName: displayName,
          }));

          // Keep localStorage up to date
          const storageKey = role === 'admin' ? 'admin' : 'instructor';
          const existing = localStorage.getItem(storageKey);
          const parsed = existing ? JSON.parse(existing) : {};
          localStorage.setItem(
            storageKey,
            JSON.stringify({ ...parsed, ...me, fullName: displayName })
          );
        }
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

  return (
    <div className="flex h-dvh bg-brand-bg">
      <Sidebar role={role} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar role={role} user={user} onMenuClick={() => setMenuOpen(true)} unreadCount={unreadCount} />
        <Breadcrumb role={role} />
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
