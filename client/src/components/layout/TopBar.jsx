import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, ChevronLeft, Menu } from 'lucide-react';
import { NAV } from '../../config/navigation';
import UserBadge from './UserBadge';
import ProfileMenu from './ProfileMenu';

// The bar at the top of every page.
function TopBar({
  role,
  user,
  onMenuClick,
  unreadCount = 0,
  isCollapsed = false,
  onToggleCollapse,
}) {
  const menu = NAV[role];
  const [currentPeriodText, setCurrentPeriodText] = useState('Loading period...');

  const fetchCurrentPeriod = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/academic-periods/current', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentPeriodText(data.formatted || 'No Active Period');
      } else {
        setCurrentPeriodText('No Active Period');
      }
    } catch (err) {
      console.warn('Could not fetch active academic period:', err);
      setCurrentPeriodText('No Active Period');
    }
  }, []);

  useEffect(() => {
    fetchCurrentPeriod();

    const handlePeriodUpdate = () => {
      fetchCurrentPeriod();
    };

    window.addEventListener('academic-period-updated', handlePeriodUpdate);
    return () => window.removeEventListener('academic-period-updated', handlePeriodUpdate);
  }, [fetchCurrentPeriod]);

  if (!menu) return null;

  const name = user?.fullName || menu.defaultName;
  const avatarUrl = user?.profile?.photoUrl || user?.googlePhotoUrl || user?.photoUrl;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:h-header">
      <div className="flex items-center gap-3">
        {/* Opens the sidebar on phones and tablets */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="p-1 text-brand-purple lg:hidden cursor-pointer"
        >
          <Menu size={24} />
        </button>

        {/* Chevron collapse toggle button placed between sidebar and header content on desktop */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50/80 text-gray-500 hover:bg-orange-50 hover:text-brand-orange hover:border-orange-200 transition-all cursor-pointer shadow-2xs mr-1"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        <div>
          <p className="text-sm text-brand-gray mt-[5px]">Current Academic Period</p>
          <p className="text-base font-medium text-gray-900 lg:text-[17px]">{currentPeriodText}</p>
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
          <ProfileMenu role={role} menu={menu} name={name} avatarUrl={avatarUrl} />
        ) : (
          <Link to={menu.profilePath} aria-label={`${name}, ${menu.roleLabel}: open profile`} className="flex items-center gap-3">
            <UserBadge name={name} roleLabel={menu.roleLabel} avatarUrl={avatarUrl} />
            <ChevronRight size={20} className="hidden text-brand-gray sm:block" />
          </Link>
        )}
      </div>
    </header>
  );
}

export default TopBar;