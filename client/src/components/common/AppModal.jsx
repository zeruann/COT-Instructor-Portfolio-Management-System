import { useState, useCallback, useEffect } from 'react';
import { CircleAlert, TriangleAlert, CircleCheck, X } from 'lucide-react';

const MODAL_STYLES = {
  error: {
    icon: CircleAlert,
    ring: 'ring-red-100',
    iconWrap: 'bg-red-50 text-red-500',
    accent: 'bg-red-500',
    btnClass: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200',
  },
  warning: {
    icon: TriangleAlert,
    ring: 'ring-amber-100',
    iconWrap: 'bg-amber-50 text-amber-500',
    accent: 'bg-amber-500',
    btnClass: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200',
  },
  success: {
    icon: CircleCheck,
    ring: 'ring-emerald-100',
    iconWrap: 'bg-emerald-50 text-emerald-500',
    accent: 'bg-emerald-500',
    btnClass: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200',
  },
  approve: {
    icon: CircleCheck,
    ring: 'ring-emerald-100',
    iconWrap: 'bg-emerald-50 text-emerald-600',
    accent: 'bg-emerald-500',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200',
  },
};

export function AppModal({ modal, onClose }) {
  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, onClose]);

  if (!modal) return null;

  const isConfirm = modal.kind === 'confirm';
  const style = MODAL_STYLES[modal.tone] || MODAL_STYLES.error;
  const Icon = style.icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-modal-title"
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-[fadeIn_.15s_ease-out]"
        onClick={isConfirm ? undefined : onClose}
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-sm rounded-[28px] bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] ring-1 ${style.ring} p-6 animate-[modalIn_.18s_cubic-bezier(0.16,1,0.3,1)]`}
      >
        <div className={`absolute inset-x-6 top-0 h-1 rounded-full ${style.accent}`} />

        {!isConfirm && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}

        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${style.iconWrap}`}>
          <Icon size={24} strokeWidth={2} />
        </div>

        <h3 id="app-modal-title" className="text-base font-semibold text-gray-900 mb-1.5">
          {modal.title}
        </h3>
        <p className="text-sm leading-relaxed text-gray-500 mb-6">{modal.message}</p>

        {isConfirm ? (
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {modal.cancelLabel || 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => {
                modal.onConfirm?.();
                onClose();
              }}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                modal.tone === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200'
                  : modal.tone === 'warning' || modal.tone === 'error' || !modal.tone
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200'
                  : 'bg-brand-orange hover:bg-orange-600 text-white shadow-lg shadow-orange-200'
              }`}
            >
              {modal.confirmLabel || 'Confirm'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className={`w-full rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer ${style.accent}`}
          >
            {modal.confirmLabel || 'Got it'}
          </button>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(8px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

export function useAppModal() {
  const [modal, setModal] = useState(null);

  const close = useCallback(() => setModal(null), []);

  const notify = useCallback((tone, title, message) => {
    setModal({ kind: 'notify', tone, title, message });
  }, []);

  const confirm = useCallback(({ title, message, tone = 'warning', confirmLabel, cancelLabel, onConfirm }) => {
    setModal({ kind: 'confirm', tone, title, message, confirmLabel, cancelLabel, onConfirm });
  }, []);

  return { modal, close, notify, confirm };
}

export default AppModal;
