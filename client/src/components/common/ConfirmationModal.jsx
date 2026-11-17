import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Archive, RotateCcw, Trash2, HelpCircle } from 'lucide-react';
import { useAnimatedModal } from '../../hooks/useAnimatedModal';

const VARIANT_CONFIGS = {
  danger: {
    icon: Trash2,
    ring: 'ring-red-100',
    accent: 'bg-red-500',
    iconBg: 'bg-red-50 text-red-500',
    confirmBtn: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200',
  },
  warning: {
    icon: Archive,
    ring: 'ring-amber-100',
    accent: 'bg-amber-500',
    iconBg: 'bg-amber-50 text-amber-500',
    confirmBtn: 'bg-brand-orange hover:bg-orange-600 text-white shadow-lg shadow-orange-200',
  },
  success: {
    icon: RotateCcw,
    ring: 'ring-emerald-100',
    accent: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 text-emerald-500',
    confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200',
  },
  info: {
    icon: HelpCircle,
    ring: 'ring-purple-100',
    accent: 'bg-brand-purple',
    iconBg: 'bg-purple-50 text-brand-purple',
    confirmBtn: 'bg-brand-purple hover:opacity-95 text-white shadow-lg shadow-purple-200',
  },
};

export default function ConfirmationModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const { rendered, backdropAnim, panelAnim } = useAnimatedModal(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, loading, onCancel]);

  if (!rendered) return null;

  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.warning;
  const IconComponent = config.icon;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className={`absolute inset-0 bg-gray-900/40 ${backdropAnim}`}
        onClick={() => !loading && onCancel()}
      />
      <div
        className={`relative w-full max-w-sm rounded-[28px] bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] ring-1 ${config.ring} p-6 ${panelAnim}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`absolute inset-x-6 top-0 h-1 rounded-full ${config.accent}`} />

        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${config.iconBg}`}>
          <IconComponent size={24} strokeWidth={2} />
        </div>

        <h3 id="confirm-modal-title" className="text-base font-semibold text-gray-900 mb-1.5">
          {title}
        </h3>
        {message && (
          <p className="text-sm leading-relaxed text-gray-500 mb-6">
            {message}
          </p>
        )}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 ${config.confirmBtn}`}
          >
            {loading ? 'Please wait...' : confirmLabel}
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

