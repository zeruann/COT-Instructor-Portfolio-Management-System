import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
  Mail,
  Trash2,
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

function AdminDashboard() {
  const [form, setForm] = useState({ fullName: '', email: '', department: '' });
  const [invitations, setInvitations] = useState([]);
  // Ids currently mid-request (blocks rapid double-clicks while waiting on the server)
  const [resendingIds, setResendingIds] = useState(() => new Set());
  // Ids that have already had one resend go out in this session
  const [resentIds, setResentIds] = useState(() => new Set());
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
    // Already sent once for this invitation - further clicks are no-ops.
    if (resentIds.has(id)) {
      notify('warning', 'Already resent', 'This invitation has already been resent once. Wait for the instructor to respond before trying again.');
      return;
    }
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
      setResentIds((prev) => new Set(prev).add(id));
      notify('success', 'Invitation resent', 'A fresh invitation email is on its way. You won’t be able to resend this one again.');
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

  const deleteInvitation = async (id) => {
    try {
      const res = await fetch(`/api/invitations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        notify('error', 'Delete failed', data.message || 'This invitation couldn’t be deleted. Try again.');
        return;
      }
      setInvitations((prev) => prev.filter((inv) => inv._id !== id));
    } catch (err) {
      console.error('Failed to delete invitation:', err);
      notify('error', 'Something went wrong', 'We couldn’t reach the server. Check your connection and try again.');
    }
  };

  const handleDelete = (inv) => {
    const who = inv.fullName || inv.email;

    confirm({
      title: 'Delete this invitation?',
      message: `This removes the declined invitation for ${who}. You can invite this email again afterward.`,
      confirmLabel: 'Delete invitation',
      onConfirm: () => deleteInvitation(inv._id),
    });
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 bg-[#F8F9FB] min-h-screen p-8">
        <Header />

        {/* Invite Form */}
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-6 mb- hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-shadow">
          <div className="flex items-center gap-3 mb-">
            <div className="bg-orange-50 p-2.5 rounded-xl">
              <Mail className="text-orange-500" size={20} />
            </div>
            <h2 className="font-semibold text-lg text-gray-800">ADMIN DASHBOARD</h2>
          </div>

        </div>

      </div>

      <AppModal modal={modal} onClose={close} />
    </div>
  );
}

export default AdminDashboard;