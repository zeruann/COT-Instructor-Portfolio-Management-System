import { useState } from 'react';
import { LayoutDashboard, UserPlus, Users, User, FolderOpen, Settings, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import cotLogo from '../assets/COT-Orange.png';
import ConfirmLogoutModal from './ConfirmLogoutModal';

const API_BASE = 'http://localhost:5000/api/auth';

const ROLE_CONFIG = {
  admin: {
    logo: cotLogo,
    navItems: [
      { to: '/admin/AdminDashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/invite-instructor', label: 'Invite Instructor', icon: UserPlus },
      { to: '/admin/instructors', label: 'Instructors', icon: Users },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
    storageKeys: ['token'],
    callLogoutApi: false,
  },
  instructor: {
    logo: '/cot_ornge.svg',
    navItems: [
      { to: '/instructors/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/instructors/profile', label: 'My Profile', icon: User },
      { to: '/instructors/portfolio', label: 'Portfolio', icon: FolderOpen },
      { to: '/instructors/settings', label: 'Settings', icon: Settings },
    ],
    storageKeys: ['token', 'instructor'],
    callLogoutApi: true,
  },
};

function Sidebar({ role }) {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const config = ROLE_CONFIG[role];
  if (!config) return null; // unknown role: render nothing

  const { logo, navItems, storageKeys, callLogoutApi } = config;

  const handleLogout = async () => {
    setLoggingOut(true);
    if (callLogoutApi) {
      try {
        await axios.post(`${API_BASE}/logout`);
      } catch {
        // stateless JWT — logout still succeeds locally even if this call fails
      }
    }
    storageKeys.forEach((key) => localStorage.removeItem(key));
    setLoggingOut(false);
    setShowLogoutModal(false);
    navigate('/login');
  };

  return (
    <div className="w-64 h-screen sticky top-0 shrink-0 overflow-y-auto bg-white border-r border-gray-100 flex flex-col p-4">
      <div className="flex justify-center py-6">
        <img src={logo} alt="Logo" className="w-24" />
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'text-gray-500 hover:bg-orange-50 hover:text-orange-600'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-100">
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <ConfirmLogoutModal
        open={showLogoutModal}
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}

export default Sidebar;