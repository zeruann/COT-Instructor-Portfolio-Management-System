// client/src/components/layout/ModeSwitchPasswordModal.jsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, X } from 'lucide-react';

function formatCountdown(seconds) {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
  return `${seconds}s`;
}

function censorEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const atIndex = email.indexOf('@');
  if (atIndex === -1) {
    if (email.length <= 4) return '••••';
    return `${email.slice(0, 2)}••••${email.slice(-2)}`;
  }
  const user = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  if (user.length <= 2) {
    return `${user[0] || ''}•${domain}`;
  }
  if (user.length <= 4) {
    return `${user[0]}••${user.slice(-1)}${domain}`;
  }
  const visibleStart = user.slice(0, 2);
  const visibleEnd = user.slice(-2);
  const maskedPart = '•'.repeat(Math.min(user.length - 4, 5));
  return `${visibleStart}${maskedPart}${visibleEnd}${domain}`;
}

function getInitials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'US'
  );
}

export default function ModeSwitchPasswordModal({
  open,
  targetRole = 'admin',
  user,
  onClose,
  onSuccess,
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (rateLimitSeconds <= 0) return undefined;
    const timer = setTimeout(
      () => setRateLimitSeconds((prev) => Math.max(0, prev - 1)),
      1000
    );
    return () => clearTimeout(timer);
  }, [rateLimitSeconds]);

  useEffect(() => {
    if (!open) return;
    setPassword('');
    setShowPassword(false);
    setError('');
    setImgError(false);
  }, [open, targetRole]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const isToAdmin = targetRole === 'admin';
  const title = isToAdmin ? 'Switch to Administrator' : 'Switch to Instructor';
  const displayName = user?.fullName || user?.name || 'User';
  const displayRole =
    user?.accountType === 'Administrator'
      ? 'Administrator'
      : user?.adminAccess?.enabled
        ? 'Instructor · Admin Access'
        : 'Instructor';
  const displayDept = user?.department || 'College of Technologies';
  const displayEmail = user?.email ? censorEmail(user.email) : '••••••@buksu.edu.ph';
  const avatarUrl = user?.profile?.photoUrl || user?.googlePhotoUrl || user?.photoUrl;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || rateLimitSeconds > 0) return;
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/switch-mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetRole, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          const retryAfter = Number(data.retryAfterSeconds) || 60;
          setRateLimitSeconds(retryAfter);
        }
        setError(data.message || 'Authentication failed.');
        return;
      }

      onSuccess?.(data);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[modalBackdropIn_150ms_ease-out_forwards]"
      onClick={() => !submitting && onClose?.()}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-gray-100 animate-[modalPanelIn_180ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => !submitting && onClose?.()}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pr-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-brand-orange border border-orange-200/80 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Re-enter your password to verify your identity.
            </p>
          </div>
        </div>

        {/* Profile & Censored Email Card (matches API Settings verification modal) */}
        <div className="mb-4 p-3.5 rounded-2xl bg-gray-50/90 border border-gray-200/80 text-left shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {avatarUrl && !imgError ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-11 h-11 rounded-full object-cover border-2 border-brand-orange/40 shadow-xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-brand-orange text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {getInitials(displayName)}
                </div>
              )}
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-400"
                title="Active Account"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-gray-900 truncate">{displayName}</h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-brand-orange border border-orange-200">
                  {displayRole}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">{displayDept}</p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-gray-200/70">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 shadow-2xs">
              <Mail size={14} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-700 truncate select-all">{displayEmail}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="switch-role-password" className="block text-xs font-semibold text-gray-600 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                id="switch-role-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="Enter your password"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-10 text-sm text-gray-800 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => !submitting && onClose?.()}
              disabled={submitting}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || rateLimitSeconds > 0}
              className="rounded-xl bg-brand-orange px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-orange-600 shadow-sm transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Verifying…'
                : rateLimitSeconds > 0
                  ? `Try again in ${formatCountdown(rateLimitSeconds)}`
                  : 'Confirm & Switch'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    window.document.body
  );
}
