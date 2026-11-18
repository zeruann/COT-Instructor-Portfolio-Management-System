// client/src/components/ProtectedRoute.jsx
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../api/config';

const HEARTBEAT_INTERVAL_MS = 60 * 1000;
let lastHeartbeatAt = 0;

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;

    const sendHeartbeat = (force = false) => {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) return;
      const now = Date.now();
      if (!force && now - lastHeartbeatAt < HEARTBEAT_INTERVAL_MS) return;
      lastHeartbeatAt = now;
      axios
        .post(
          `${API_BASE}/auth/heartbeat`,
          {},
          { headers: { Authorization: `Bearer ${currentToken}` } }
        )
        .catch(() => {
          // Ignore transient network errors
        });
    };

    sendHeartbeat(false);
    const interval = setInterval(() => sendHeartbeat(true), HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
