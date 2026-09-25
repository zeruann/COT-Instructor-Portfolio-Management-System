// client/src/components/Sidebar.jsx
import { LayoutDashboard, UserPlus, Users, Settings, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import cotLogo from '../assets/COT-Orange.png';

const navItems = [
  { to: '/admin/AdminDashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/invite-instructor', label: 'Invite Instructor', icon: UserPlus },
  { to: '/admin/instructors', label: 'Instructors', icon: Users },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Adjust to however this app tracks the session (token key, auth context, etc.)
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col p-4">
      <div className="flex justify-center py-6">
        <img src={cotLogo} alt="Logo" className="w-30"/>
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
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;