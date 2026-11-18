import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import AdminProfile from '../../pages/admin/AdminProfile';
import InstructorSecurity from '../../pages/instructors/InstructorSecurity';

const MODAL_META = {
  profile: {
    title: 'My Profile',
    subtitle: 'View and manage your administrator profile and contact details.',
  },
  security: {
    title: 'Security & Password',
    subtitle: 'Manage your account credentials and security preferences.',
  },
};

/**
 * Displays the Admin Profile or Security view inside a modal matching
 * InstructorProfileModal / Archive modal design and animations.
 */
export default function AdminAccountModal({ mode, onClose }) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose?.();
    }, 150);
  };

  useEffect(() => {
    if (!mode) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode]);

  if (!mode) return null;

  const meta = MODAL_META[mode] || MODAL_META.profile;

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-5 ${
        isClosing
          ? 'animate-[modalBackdropOut_150ms_ease-in_forwards]'
          : 'animate-[modalBackdropIn_150ms_ease-out_forwards]'
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative flex flex-col w-full ${
          mode === 'profile' ? 'max-w-7xl h-[90vh]' : 'max-w-5xl max-h-[90vh]'
        } rounded-2xl bg-[#f8f9fc] shadow-2xl border border-gray-200 overflow-hidden ${
          isClosing
            ? 'animate-[modalPanelOut_150ms_ease-in_forwards]'
            : 'animate-[modalPanelIn_180ms_cubic-bezier(0.16,1,0.3,1)_forwards]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4 bg-white">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-[#2e2a72] truncate">
              {meta.title}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {meta.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'profile' ? (
            <AdminProfile embedded />
          ) : (
            <InstructorSecurity embedded />
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 bg-white">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

