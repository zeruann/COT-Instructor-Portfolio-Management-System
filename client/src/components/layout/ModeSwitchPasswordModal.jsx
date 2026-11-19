// client/src/components/layout/ModeSwitchPasswordModal.jsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, Lock, ShieldCheck, X } from 'lucide-react';

export default function ModeSwitchPasswordModal({ open, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPassword('');
    setShowPassword(false);
    setError('');
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
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
        body: JSON.stringify({ targetRole: 'admin', password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
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
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 animate-[modalBackdropIn_150ms_ease-out_forwards]"
      onClick={() => !submitting && onClose?.()}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 animate-[modalPanelIn_180ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => !submitting && onClose?.()}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#efeef8] text-[#2e2a72] shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#2e2a72]">Switch to Administrator Mode</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Re-enter your password to verify your identity.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="switch-admin-password" className="block text-xs font-semibold text-gray-600 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                id="switch-admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="Enter your password"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-10 text-sm text-gray-800 focus:border-[#2e2a72] focus:outline-none focus:ring-2 focus:ring-[#2e2a72]/20"
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
              disabled={submitting}
              className="rounded-xl bg-[#2e2a72] px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#231f5c] transition cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Verifying…' : 'Confirm & Switch'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    window.document.body
  );
}

