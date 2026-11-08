import { Link } from 'react-router-dom';
import { Bell, ChevronRight, Menu } from 'lucide-react';
import { NAV } from '../../config/navigation';
import UserBadge from './UserBadge';
import ProfileMenu from './ProfileMenu';

// Placeholder text until a real "current academic period" exists in the system.
const CURRENT_PERIOD = '2026–2027 · 1st Semester';

// The bar at the top of every page.
// On big screens its height (h-header) is the same as the sidebar logo, so their bottom lines line up.
function TopBar({ role, user, onMenuClick, unreadCount = 0 }) {
  const menu = NAV[role];
  if (!menu) return null;

  const name = user?.fullName || menu.defaultName;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:h-header">
      <div className="flex items-center gap-3">
        {/* Opens the sidebar on phones and tablets */}
        <button type="button" onClick={onMenuClick} aria-label="Open menu" className="p-1 text-brand-purple lg:hidden">
          <Menu size={24} />
        </button>
        <div>
          <p className="text-sm text-brand-gray">Current Academic Period</p>
          <p className="text-base font-medium text-gray-900 lg:text-xl">{CURRENT_PERIOD}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Link to={menu.notificationsPath} aria-label="Notifications" className="relative text-brand-gray hover:text-brand-orange">
          <Bell size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-orange text-[10px] font-bold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {menu.accountInTopBar ? (
          // Admin: a menu with My Profile, Security and Logout
          <ProfileMenu role={role} menu={menu} name={name} />
        ) : (
          // Instructor: a link to the profile page
          <Link to={menu.profilePath} aria-label={`${name}, ${menu.roleLabel}: open profile`} className="flex items-center gap-3">
            <UserBadge name={name} roleLabel={menu.roleLabel} />
            <ChevronRight size={20} className="hidden text-brand-gray sm:block" />
          </Link>
        )}
      </div>
    </header>
  );
}

export default TopBar;
