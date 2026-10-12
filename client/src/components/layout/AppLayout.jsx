import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar';
import TopBar from './TopBar';
import Breadcrumb from './Breadcrumb';

// Instructors are saved in localStorage when they log in.
// Admins only keep a token, so their name shows as "Admin User" for now.
function readStoredUser(role) {
  if (role !== 'instructor') return null;
  try {
    return JSON.parse(localStorage.getItem('instructor') || 'null');
  } catch {
    return null;
  }
}

// The frame around every signed-in page: sidebar, top bar, breadcrumb, and the page itself.
function AppLayout({ role }) {
  const [menuOpen, setMenuOpen] = useState(false); // the sidebar on phones and tablets
  const [user, setUser] = useState(() => readStoredUser(role));

  // The Profile page fires "instructor-updated" after saving,
  // so the top bar shows the new name without reloading the page.
  useEffect(() => {
    const refreshUser = () => setUser(readStoredUser(role));
    window.addEventListener('instructor-updated', refreshUser);
    return () => window.removeEventListener('instructor-updated', refreshUser);
  }, [role]);

  return (
    <div className="flex h-dvh bg-brand-bg">
      <Sidebar role={role} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar role={role} user={user} onMenuClick={() => setMenuOpen(true)} />
        <Breadcrumb role={role} />
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
