import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Archive, RotateCcw, Trash2, HelpCircle } from 'lucide-react';

const VARIANT_CONFIGS = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-50 text-red-600',
    confirmBtn: 'bg-red-600 text-white hover:bg-red-700',
  },
  warning: {
    icon: Archive,
    iconBg: 'bg-amber-50 text-amber-600',
    confirmBtn: 'bg-brand-orange text-white hover:bg-opacity-95',
  },
  success: {
    icon: RotateCcw,
    iconBg: 'bg-green-50 text-green-600',
    confirmBtn: 'bg-brand-purple text-white hover:bg-opacity-95',
  },
  info: {
    icon: HelpCircle,
    iconBg: 'bg-purple-50 text-brand-purple',
    confirmBtn: 'bg-brand-purple text-white hover:bg-opacity-95',
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
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.warning;
  const IconComponent = config.icon;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 transition-opacity animate-in fade-in"
      onClick={() => !loading && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${config.iconBg}`}>
          <IconComponent size={22} />
        </div>

        <h2 id="confirm-modal-title" className="text-center text-lg font-semibold text-gray-800">
          {title}
        </h2>
        {message && (
          <p className="mt-1.5 text-center text-sm text-gray-500">
            {message}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${config.confirmBtn}`}
          >
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

