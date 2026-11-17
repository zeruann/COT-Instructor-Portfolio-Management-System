import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ConfirmLogoutModal from '../components/ConfirmLogoutModal';
import { API_BASE as API_URL } from '../api/config';

const API_BASE = `${API_URL}/auth`;

// What logout does for each role.
const LOGOUT = {
  admin: { keysToRemove: ['token', 'instructor', 'admin', 'user'], callApi: true },
  instructor: { keysToRemove: ['token', 'instructor', 'user'], callApi: true },
};

// Shared by every Logout button.
//   askToLogout() opens the "Are you sure?" window.
//   logoutModal is that window. Put it anywhere in your JSX: {logoutModal}
export default function useLogout(role) {
  const navigate = useNavigate();
  const [asking, setAsking] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    const settings = LOGOUT[role] || LOGOUT.instructor;

    setLoggingOut(true);
    if (settings.callApi) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(
          `${API_BASE}/logout`,
          {},
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
      } catch {
        // The token is stateless, so logging out still works here even if this call fails.
      }
    }
    settings.keysToRemove.forEach((key) => localStorage.removeItem(key));
    setLoggingOut(false);
    setAsking(false);
    navigate('/login');
  }

  const logoutModal = (
    <ConfirmLogoutModal
      open={asking}
      loading={loggingOut}
      onConfirm={logout}
      onCancel={() => setAsking(false)}
    />
  );

  return { askToLogout: () => setAsking(true), logoutModal };
}
