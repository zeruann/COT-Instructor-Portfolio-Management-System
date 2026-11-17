import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import AdminInstructorProfile from '../../pages/admin/AdminInstructorProfile';

const getDisplayName = (inst) => {
  if (!inst) return '';
  const p = inst.profile || {};
  const parts = [p.firstName, p.middleName, p.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return inst.fullName || inst.name || '';
};

/**
 * Displays an instructor's full profile inside a modal matching the Archive modal design.
 */
export default function InstructorProfileModal({
  instructor,
  instructorId: propInstructorId,
  onClose,
  onStatusUpdated,
}) {
  const targetId = propInstructorId || instructor?._id || instructor?.id || null;
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
    if (!targetId) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [targetId]);

  if (!targetId) return null;

  const displayName = getDisplayName(instructor);
  const subtitleParts = [instructor?.department, instructor?.email].filter(Boolean);

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
        className={`relative flex flex-col w-full max-w-7xl h-[90vh] rounded-2xl bg-[#f8f9fc] shadow-2xl border border-gray-200 overflow-hidden ${
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
              {displayName ? `${displayName} · Instructor Profile` : 'Instructor Profile'}
            </h2>
            {subtitleParts.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {subtitleParts.join(' • ')}
              </p>
            )}
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
          <AdminInstructorProfile
            instructorId={targetId}
            embedded
            onStatusUpdated={onStatusUpdated}
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-3.5 bg-white">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs sm:text-sm font-semibold text-gray-700 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
