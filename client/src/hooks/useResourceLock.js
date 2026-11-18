import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../api/config';

const RENEW_INTERVAL_MS = 15 * 1000; // Renew lock every 15s (server TTL is 45s)

/**
 * Acquires and maintains a pessimistic lock on a backend resource while the
 * component/modal is active. Automatically releases on unmount or disable.
 *
 * If another user holds the lock, `lockedByOther` is true so the caller can
 * disable action buttons and display who holds the lock. It keeps polling
 * every 15s and automatically acquires the lock once the other user leaves.
 */
export function useResourceLock(resourceKey, { enabled = true } = {}) {
  const [lockedByOther, setLockedByOther] = useState(false);
  const [lockedByName, setLockedByName] = useState('');
  const [checking, setChecking] = useState(false);
  const holdsLockRef = useRef(false);

  useEffect(() => {
    if (!enabled || !resourceKey) {
      setLockedByOther(false);
      setLockedByName('');
      setChecking(false);
      holdsLockRef.current = false;
      return undefined;
    }

    let cancelled = false;
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const headers = { Authorization: `Bearer ${token}` };

    const acquire = async (showSpinner = false) => {
      try {
        if (showSpinner) setChecking(true);
        const res = await axios.post(
          `${API_BASE}/locks/acquire`,
          { resourceKey },
          { headers }
        );
        if (cancelled) return;
        const acquired = Boolean(res.data?.acquired);
        holdsLockRef.current = acquired;
        setLockedByOther(!acquired);
        setLockedByName(!acquired ? res.data?.lockedByName || 'another administrator' : '');
      } catch (err) {
        if (!cancelled) {
          console.warn('Resource lock check failed:', err?.message);
        }
      } finally {
        if (!cancelled && showSpinner) setChecking(false);
      }
    };

    acquire(true);
    const interval = setInterval(() => acquire(false), RENEW_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (holdsLockRef.current) {
        holdsLockRef.current = false;
        axios
          .post(`${API_BASE}/locks/release`, { resourceKey }, { headers })
          .catch(() => {});
      }
    };
  }, [resourceKey, enabled]);

  return { lockedByOther, lockedByName, checking };
}

