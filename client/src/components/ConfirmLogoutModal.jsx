import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut } from 'lucide-react';
import { useAnimatedModal } from '../hooks/useAnimatedModal';

function ConfirmLogoutModal({ open, onConfirm, onCancel, loading = false }) {
  const { rendered, backdropAnim, panelAnim } = useAnimatedModal(open);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, loading, onCancel]);

  if (!rendered) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
    >
      {/* Scrim */}
      <div
        className={`absolute inset-0 bg-gray-900/40 ${backdropAnim}`}
        onClick={() => !loading && onCancel()}
      />

      {/* Card styling identical to AppModal */}
      <div
        className={`relative w-full max-w-sm rounded-[28px] bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] ring-1 ring-red-100 p-6 ${panelAnim}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div className="absolute inset-x-6 top-0 h-1 rounded-full bg-red-500" />

        {/* Squircle icon container */}
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-red-50 text-red-500">
          <LogOut size={24} strokeWidth={2} />
        </div>

        <h3 id="logout-title" className="text-base font-semibold text-gray-900 mb-1.5">
          Log out?
        </h3>
        <p className="text-sm leading-relaxed text-gray-500 mb-6">
          Are you sure you want to log out of your account?
        </p>

        {/* Action buttons with rounded-full pill styling */}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-full bg-red-500 hover:bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(8px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}

export default ConfirmLogoutModal;
