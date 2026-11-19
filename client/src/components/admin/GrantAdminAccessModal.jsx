// client/src/components/admin/GrantAdminAccessModal.jsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mail, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import AdminAccessDropdowns from './AdminAccessDropdowns';
import { EMPTY_ADMIN_ACCESS } from '../../config/adminPermissions';

export default function GrantAdminAccessModal({
  open,
  instructor,
  displayName,
  onClose,
  onSaved,
  onNotify,
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accessState, setAccessState] = useState(EMPTY_ADMIN_ACCESS);

  const alreadyEnabled = Boolean(instructor?.adminAccess?.enabled);

  useEffect(() => {
    if (!open || !instructor) return;
    if (instructor.adminAccess?.enabled) {
      setAccessState({
        enabled: true,
        scope: instructor.adminAccess.scope || 'limited',
        pages: instructor.adminAccess.pages || [],
        documents: {
          faculty: instructor.adminAccess.documents?.faculty || [],
          class: instructor.adminAccess.documents?.class || [],
        },
      });
    } else {
      setAccessState(EMPTY_ADMIN_ACCESS);
    }
  }, [open, instructor]);

  const handleClose = () => {
    if (isClosing || saving) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose?.();
    }, 150);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, saving]);

  if (!open || !instructor) return null;

  const targetId = instructor._id || instructor.id;
  const resolvedName = displayName || instructor.fullName || instructor.email || 'Instructor';

  const submitAccess = async (payload) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/instructors/${targetId}/admin-access`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update administrator access.');
      }

      onSaved?.(data.instructor);
      const emailNote = data.emailSent
        ? ` An email notification has been sent to ${instructor.email}.`
        : '';
      onNotify?.(
        'success',
        payload.enabled ? 'Administrator Access Saved' : 'Administrator Access Revoked',
        `${data.summary}.${emailNote}`
      );
      setIsClosing(true);
      setTimeout(() => {
        setIsClosing(false);
        onClose?.();
      }, 150);
    } catch (err) {
      onNotify?.('error', 'Update Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvite = () => {
    if (!accessState.enabled) {
      onNotify?.(
        'error',
        'Select Access Level',
        'Choose Full Administrator Access or at least one Limited Access permission before sending the invitation.'
      );
      return;
    }
    submitAccess(accessState);
  };

  const handleRevoke = () => {
    submitAccess(EMPTY_ADMIN_ACCESS);
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-3 sm:p-5 ${isClosing
        ? 'animate-[modalBackdropOut_150ms_ease-in_forwards]'
        : 'animate-[modalBackdropIn_150ms_ease-out_forwards]'
        }`}
      onClick={handleClose}
    >
      <div
        className={`relative flex flex-col w-full max-w-7xl h-[90vh] rounded-2xl bg-[#f8f9fc] shadow-2xl border border-gray-200 overflow-hidden ${isClosing
          ? 'animate-[modalPanelOut_150ms_ease-in_forwards]'
          : 'animate-[modalPanelIn_180ms_cubic-bezier(0.16,1,0.3,1)_forwards]'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-[#efeef8] p-2 rounded-xl shrink-0">
              <ShieldCheck className="text-[#2e2a72]" size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-[#2e2a72] truncate">
                Invite as Administrator · {resolvedName}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {instructor.email} • Grant full or limited administrator access and send an email notification.
              </p>
            </div>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {alreadyEnabled && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-xs sm:text-sm text-indigo-900">
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={16} className="shrink-0 text-[#2e2a72]" />
                <span>
                  This instructor currently has{' '}
                  <strong>
                    {instructor.adminAccess.scope === 'full' ? 'Full' : 'Limited'} Administrator
                  </strong>{' '}
                  access. Updating will notify them via email and in-app notification.
                </span>
              </div>
            </div>
          )}

          <AdminAccessDropdowns value={accessState} onChange={setAccessState} />
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-6 py-3.5 bg-white">
          <div>
            {alreadyEnabled && (
              <button
                type="button"
                onClick={handleRevoke}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Updating…' : 'Revoke Admin Access'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs sm:text-sm font-semibold text-gray-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendInvite}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-xs sm:text-sm font-semibold text-white shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <Mail size={15} />
              <span>{saving ? 'Sending…' : alreadyEnabled ? 'Save & Send Notification' : 'Send Invitation'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    window.document.body
  );
}

