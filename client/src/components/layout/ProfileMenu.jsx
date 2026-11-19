import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ChevronDown, Loader2, Lock, LogOut, User } from 'lucide-react';
import useLogout from '../../hooks/useLogout';
import UserBadge from './UserBadge';
import AdminAccountModal from '../admin/AdminAccountModal';
import ModeSwitchPasswordModal from './ModeSwitchPasswordModal';
import {
  canUseAdminMode,
  getFirstAllowedAdminPath,
  readStoredUserRecord,
} from '../../config/adminPermissions';

const itemBase = 'flex w-full items-center gap-3 px-4 py-2 text-sm text-brand-gray';
const linkItem = `${itemBase} hover:bg-gray-50 hover:text-brand-purple`;
const logoutItem = `${itemBase} border-t border-gray-200 hover:bg-red-50 hover:text-red-600`;

// The profile button in the top bar. Click it to open: My Profile, Security, Switch Mode, Logout.
function ProfileMenu({ role, menu, name, avatarUrl, user }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [accountModalMode, setAccountModalMode] = useState(null);
  const [switchTargetRole, setSwitchTargetRole] = useState(null);
  const [switchingScreenRole, setSwitchingScreenRole] = useState(null);
  const wrapperRef = useRef(null);
  const { askToLogout, logoutModal } = useLogout(role);

  const currentUser = user || readStoredUserRecord();
  const showSwitchToAdmin = role === 'instructor' && canUseAdminMode(currentUser);
  const showSwitchToInstructor = role === 'admin';

  const applySwitchSuccess = (data) => {
    if (data.token) localStorage.setItem('token', data.token);
    if (data.activeRole) localStorage.setItem('activeRole', data.activeRole);
    if (data.instructor) {
      const serialized = JSON.stringify(data.instructor);
      localStorage.setItem('instructor', serialized);
      if (data.activeRole === 'admin' || data.instructor.accountType === 'Administrator') {
        localStorage.setItem('admin', serialized);
      }
    }
    setSwitchTargetRole(null);
    setSwitchingScreenRole(data.activeRole);

    setTimeout(() => {
      if (data.activeRole === 'admin') {
        navigate(getFirstAllowedAdminPath(data.instructor));
      } else {
        navigate('/instructors/dashboard');
      }
      setSwitchingScreenRole(null);
    }, 800);
  };

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
        <UserBadge name={name} roleLabel={menu.roleLabel} avatarUrl={avatarUrl} />
        <ChevronDown
          size={20}
          className={`hidden text-brand-gray transition-transform duration-200 sm:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        role="menu"
        aria-hidden={!open}
        className={`absolute right-0 top-full z-50 mt-2 w-60 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg transition-all duration-200 ease-out ${open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none'
          }`}
      >
        {role === 'admin' ? (
          <>
            <button
              type="button"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onClick={() => {
                setOpen(false);
                setAccountModalMode('profile');
              }}
              className={`${linkItem} cursor-pointer transition-colors`}
            >
              <User size={18} aria-hidden="true" />
              My Profile
            </button>
            <button
              type="button"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onClick={() => {
                setOpen(false);
                setAccountModalMode('security');
              }}
              className={`${linkItem} cursor-pointer transition-colors`}
            >
              <Lock size={18} aria-hidden="true" />
              Security
            </button>
          </>
        ) : (
          <>
            <Link
              role="menuitem"
              tabIndex={open ? 0 : -1}
              to={menu.profilePath}
              onClick={() => setOpen(false)}
              className={`${linkItem} transition-colors`}
            >
              <User size={18} aria-hidden="true" />
              My Profile
            </Link>
            <Link
              role="menuitem"
              tabIndex={open ? 0 : -1}
              to={menu.securityPath}
              onClick={() => setOpen(false)}
              className={`${linkItem} transition-colors`}
            >
              <Lock size={18} aria-hidden="true" />
              Security
            </Link>
          </>
        )}
        {showSwitchToAdmin && (
          <div className="border-t border-gray-100 px-2 py-1.5">
            <button
              type="button"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onClick={() => {
                setOpen(false);
                setSwitchTargetRole('admin');
              }}
              className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg bg-orange-50 px-3 py-2 text-left text-sm font-semibold text-brand-orange transition-colors duration-150 hover:bg-brand-orange hover:text-white cursor-pointer"
            >
              <ArrowLeftRight size={16} className="shrink-0" aria-hidden="true" />
              Switch to Administrator
            </button>
          </div>
        )}
        {showSwitchToInstructor && (
          <div className="border-t border-gray-100 px-2 py-1.5">
            <button
              type="button"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onClick={() => {
                setOpen(false);
                setSwitchTargetRole('instructor');
              }}
              className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg bg-[#efeef8] px-3 py-2 text-left text-sm font-semibold text-[#2e2a72] transition-colors duration-150 hover:bg-[#2e2a72] hover:text-white cursor-pointer"
            >
              <ArrowLeftRight size={16} className="shrink-0" aria-hidden="true" />
              Switch to Instructor
            </button>
          </div>
        )}
        <button
          type="button"
          role="menuitem"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            setOpen(false);
            askToLogout();
          }}
          className={`${logoutItem} transition-colors cursor-pointer`}
        >
          <LogOut size={18} aria-hidden="true" />
          Logout
        </button>
      </div>

      {logoutModal}
      {role === 'admin' && (
        <AdminAccountModal
          mode={accountModalMode}
          onClose={() => setAccountModalMode(null)}
        />
      )}
      <ModeSwitchPasswordModal
        open={Boolean(switchTargetRole)}
        targetRole={switchTargetRole || 'admin'}
        user={currentUser}
        onClose={() => setSwitchTargetRole(null)}
        onSuccess={applySwitchSuccess}
      />
      {switchingScreenRole &&
        createPortal(
          <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-white/85 backdrop-blur-md animate-[modalBackdropIn_150ms_ease-out_forwards]">
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-gray-200/80 bg-white px-10 py-8 shadow-xl text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-brand-orange border border-orange-200/80">
                <Loader2 size={28} className="animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {switchingScreenRole === 'admin'
                    ? 'Switching to Administrator…'
                    : 'Switching to Instructor…'}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Preparing your workspace and permissions
                </p>
              </div>
            </div>
          </div>,
          window.document.body
        )}
    </div>
  );
}

export default ProfileMenu;
