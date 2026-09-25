import { LayoutDashboard, User, FolderOpen, Settings, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = "http://localhost:5000/api/auth";

const navItems = [
  { to: '/dashboard/instructor', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dashboard/instructor/profile', label: 'My Profile', icon: User },
  { to: '/dashboard/instructor/portfolio', label: 'Portfolio', icon: FolderOpen },
  { to: '/dashboard/instructor/settings', label: 'Settings', icon: Settings },
];

function InstructorSidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE}/logout`);
    } catch {
      // stateless JWT — logout still succeeds locally even if this call fails
    }
    localStorage.removeItem('token');
    localStorage.removeItem('instructor');
    navigate('/login');
  };

  return (
    <div className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col p-4">
      <div className="flex justify-center py-6">
        <img src="/cot_ornge.svg" alt="Logo" className="w-24" />
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard/instructor'}
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

export default InstructorSidebar;