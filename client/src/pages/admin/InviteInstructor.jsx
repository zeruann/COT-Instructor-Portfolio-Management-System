import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
  Mail,
  Ban,
  RotateCcw,
  User,
  CircleAlert,
  CircleCheck,
  TriangleAlert,
  X,
} from 'lucide-react';

const statusStyles = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Accepted: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Expired: 'bg-gray-100 text-gray-600',
  Cancelled: 'bg-slate-100 text-slate-500',
};

const DEPARTMENTS = [
  'Electronics Technology',
  'Automotive Technology',
  'Food Technology',
  'IT Department',
];

/* ------------------------------------------------------------------ */
/*  Modal system                                                       */
/*  A single coded (non-native) modal that renders in three flavors:   */
/*  info / error toasts-as-modal, and a destructive confirm dialog.    */
/*  No window.alert / window.confirm anywhere in this file.            */
/* ------------------------------------------------------------------ */

const MODAL_STYLES = {
  error: {
    icon: CircleAlert,
    ring: 'ring-red-100',
    iconWrap: 'bg-red-50 text-red-500',
    accent: 'bg-red-500',
  },
  warning: {
    icon: TriangleAlert,
    ring: 'ring-amber-100',
    iconWrap: 'bg-amber-50 text-amber-500',
    accent: 'bg-amber-500',
  },
  success: {
    icon: CircleCheck,
    ring: 'ring-emerald-100',
    iconWrap: 'bg-emerald-50 text-emerald-500',
    accent: 'bg-emerald-500',
  },
};

function AppModal({ modal, onClose }) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
            className="absolute right-4 top-4 text-gray-300 hover:text-gray-500 transition-colors"
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
              onClick={onClose}
              className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {modal.cancelLabel || 'Cancel'}
            </button>
            <button
              onClick={() => {
                modal.onConfirm?.();
                onClose();
              }}
              className="flex-1 rounded-full bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-200 hover:bg-red-600 transition-colors"
            >
              {modal.confirmLabel || 'Delete'}
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className={`w-full rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${style.accent}`}
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

function useAppModal() {
  const [modal, setModal] = useState(null);

  const close = useCallback(() => setModal(null), []);

  const notify = useCallback((tone, title, message) => {
    setModal({ kind: 'notify', tone, title, message });
  }, []);

  const confirm = useCallback(({ title, message, confirmLabel, cancelLabel, onConfirm }) => {
    setModal({ kind: 'confirm', tone: 'warning', title, message, confirmLabel, cancelLabel, onConfirm });
  }, []);

  return { modal, close, notify, confirm };
}

/* ------------------------------------------------------------------ */

function InviteInstructor() {
  const [form, setForm] = useState({ fullName: '', email: '', department: '' });
  const [invitations, setInvitations] = useState([]);
  // Ids currently mid-request (blocks rapid double-clicks while waiting on the server)
  const [resendingIds, setResendingIds] = useState(() => new Set());
  // Ids that have already had one resend go out in this session
  const { modal, close, notify, confirm } = useAppModal();

  useEffect(() => {
    fetch('/api/invitations')
      .then((res) => res.json())
      .then((data) => setInvitations(data))
      .catch((err) => console.error('Failed to load invitations:', err));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSend = async () => {
    if (!form.fullName || !form.email || !form.department) {
      notify('error', 'Missing information', 'Fill in the instructor’s name, email, and department before sending the invitation.');
      return;
    }
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        notify('error', 'Invitation not sent', data.message || 'The server couldn’t process this invitation. Try again.');
        return;
      }

      setInvitations([data, ...invitations]);
      setForm({ fullName: '', email: '', department: '' });
      notify('success', 'Invitation sent', `${data.fullName || form.fullName} will receive an email to join as an instructor.`);
    } catch (err) {
      console.error('Failed to send invitation:', err);
      notify('error', 'Something went wrong', 'We couldn’t reach the server. Check your connection and try again.');
    }
  };

  const handleCancel = () => {
    setForm({ fullName: '', email: '', department: '' });
  };

const handleResend = async (id) => {
  // A request for this id is already in flight - ignore rapid repeat clicks.
  if (resendingIds.has(id)) return;

  setResendingIds((prev) => new Set(prev).add(id));

  try {
    const res = await fetch(`/api/invitations/${id}/resend`, { method: 'PATCH' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      notify('error', 'Resend failed', data.message || 'This invitation couldn’t be resent. Try again.');
      return;
    }
    const updated = await res.json();
    setInvitations((prev) => prev.map((inv) => (inv._id === id ? updated : inv)));
    notify('success', 'Invitation resent', 'A fresh invitation email is on its way.');
  } catch (err) {
    console.error('Failed to resend invitation:', err);
    notify('error', 'Something went wrong', 'We couldn’t reach the server. Check your connection and try again.');
  } finally {
    setResendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }
};

  const cancelInvitation = async (id) => {
  try {
    const res = await fetch(`/api/invitations/${id}/cancel`, { method: 'PATCH' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      notify('error', 'Cancel failed', data.message || 'This invitation couldn’t be cancelled. Try again.');
      return;
    }
    const updated = await res.json();
    setInvitations((prev) => prev.map((inv) => (inv._id === id ? updated : inv)));
    notify('success', 'Invitation cancelled', 'The invitation link no longer works. You can send a new one to the correct email.');
  } catch (err) {
    console.error('Failed to cancel invitation:', err);
    notify('error', 'Something went wrong', 'We couldn’t reach the server. Check your connection and try again.');
  }
};

const handleCancelInvitation = (inv) => {
  const who = inv.fullName || inv.email;

  confirm({
    title: 'Cancel this invitation?',
    message: `${who} will no longer be able to accept this invitation. The record stays in your list as Cancelled.`,
    confirmLabel: 'Cancel invitation',
    cancelLabel: 'Keep it',
    onConfirm: () => cancelInvitation(inv._id),
  });
};

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 bg-[#F8F9FB] min-h-screen p-8">
        <Header />

        {/* Invite Form */}
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-6 mb-6 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-orange-50 p-2.5 rounded-xl">
              <Mail className="text-orange-500" size={20} />
            </div>
            <h2 className="font-semibold text-lg text-gray-800">Invite New Instructor</h2>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm text-gray-500 block mb-1.5">Full Name</label>
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Enter full name"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500 block mb-1.5">Email Address</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="instructor@university.edu"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500 block mb-1.5">Department</label>
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="border border-gray-200 rounded-full px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full px-6 py-2.5 text-sm font-semibold shadow-lg shadow-orange-200 transition-all"
            >
              Send Invitation
            </button>
          </div>
        </div>

        {/* Recent Invitations Table */}
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-6 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg text-gray-800">Recent Invitations</h2>
            <a href="#" className="text-orange-500 text-sm font-medium hover:underline">
              View All
            </a>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-100">
                <th className="py-3 font-medium">Instructor</th>
                <th className="py-3 font-medium">Department</th>
                <th className="py-3 font-medium">Date Sent</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-16">
                    <Mail className="mx-auto text-gray-300 mb-3" size={32} />
                    <p className="text-gray-400 text-sm">No invitations sent yet.</p>
                    <p className="text-gray-300 text-xs mt-1">
                      Invite your first instructor to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => {
                  const isResending = resendingIds.has(inv._id);

                  return (
                    <tr key={inv._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center">
                          <User className="text-orange-400" size={18} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{inv.fullName}</p>
                          <p className="text-gray-400 text-xs">{inv.email}</p>
                        </div>
                      </td>
                      <td className="text-gray-600">{inv.department}</td>
                      <td className="text-gray-600">{new Date(inv.dateSent).toLocaleDateString()}</td>
                      <td>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[inv.status]}`}
                        >
                          {inv.status?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          {inv.status === 'Accepted' && (
                          inv.accountStatus === 'Active' ? (
                            <a href="#" className="text-blue-500 text-xs font-medium hover:underline">
                              View Profile
                            </a>
                          ) : (
                            <span className="text-xs font-medium text-gray-400">Setting up…</span>
                          )
                        )}

                          {(inv.status === 'Rejected' || inv.status === 'Expired') && (
                            <button
                              onClick={() => handleResend(inv._id)}
                              disabled={isResending}
                              className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                                isResending ? 'text-orange-300 cursor-wait' : 'text-orange-500 hover:underline'
                              }`}
                            >
                              <RotateCcw size={13} className={isResending ? 'animate-spin' : ''} />
                              {isResending ? 'Sending…' : 'Resend'}
                            </button>
                          )}


                          {inv.status === 'Pending' && (
                            <button
                              onClick={() => handleCancelInvitation(inv)}
                              className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Ban size={13} />
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AppModal modal={modal} onClose={close} />
    </div>
  );
}

export default InviteInstructor;