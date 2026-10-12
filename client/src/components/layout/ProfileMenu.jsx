import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Lock, LogOut, User } from 'lucide-react';
import useLogout from '../../hooks/useLogout';
import UserBadge from './UserBadge';

const itemBase = 'flex w-full items-center gap-3 px-4 py-2 text-sm text-brand-gray';
const linkItem = `${itemBase} hover:bg-gray-50 hover:text-brand-purple`;
const logoutItem = `${itemBase} border-t border-gray-200 hover:bg-red-50 hover:text-red-600`;

// The profile button in the top bar. Click it to open: My Profile, Security, Logout.
function ProfileMenu({ role, menu, name }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const { askToLogout, logoutModal } = useLogout(role);

  // While the menu is open: clicking outside it, or pressing Escape, closes it.
  useEffect(() => {
    if (!open) return undefined;
    const closeIfOutside = (event) => {
      if (!wrapperRef.current.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeIfOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeIfOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${name}, ${menu.roleLabel}: account menu`}
        className="flex items-center gap-3"
      >
        <UserBadge name={name} roleLabel={menu.roleLabel} />
        <ChevronDown
          size={20}
          className={`hidden text-brand-gray sm:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          <Link role="menuitem" to={menu.profilePath} onClick={() => setOpen(false)} className={linkItem}>
            <User size={18} aria-hidden="true" />
            My Profile
          </Link>
          <Link role="menuitem" to={menu.securityPath} onClick={() => setOpen(false)} className={linkItem}>
            <Lock size={18} aria-hidden="true" />
            Security
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              askToLogout();
            }}
            className={logoutItem}
          >
            <LogOut size={18} aria-hidden="true" />
            Logout
          </button>
        </div>
      )}

      {logoutModal}
    </div>
  );
}

export default ProfileMenu;
