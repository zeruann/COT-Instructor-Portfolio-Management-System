import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAnimatedModal } from '../../hooks/useAnimatedModal';
import {
  Mail,
  Ban,
  RotateCcw,
  User,
  CircleAlert,
  CircleCheck,
  TriangleAlert,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  UserPlus,
} from 'lucide-react';
import { formatDate } from '../../utils/formatDate';

const INVITE_PAGE_SIZE = 8;

const statusStyles = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
  Expired: 'bg-gray-50 text-gray-600 border-gray-200',
  Cancelled: 'bg-gray-50 text-gray-600 border-gray-200',
};

const DEPARTMENTS = [
  'Electronics Technology',
  'Automotive Technology',
  'Food Technology',
  'IT Department',
];

const VIEW_BY_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name (A to Z)' },
  { value: 'name_desc', label: 'Name (Z to A)' },
  { value: 'status_accepted', label: 'Status: Accepted' },
  { value: 'status_pending', label: 'Status: Pending' },
  { value: 'status_expired', label: 'Status: Expired' },
  { value: 'status_rejected', label: 'Status: Rejected' },
  { value: 'status_cancelled', label: 'Status: Cancelled' },
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
  const { rendered, backdropAnim, panelAnim } = useAnimatedModal(Boolean(modal));
  const [lastModal, setLastModal] = useState(modal);

  useEffect(() => {
    if (modal) setLastModal(modal);
  }, [modal]);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, onClose]);

  const activeModal = modal || lastModal;
  if (!rendered || !activeModal) return null;

  const isConfirm = activeModal.kind === 'confirm';
  const style = MODAL_STYLES[activeModal.tone] || MODAL_STYLES.error;
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
        className={`absolute inset-0 bg-gray-900/40 ${backdropAnim}`}
        onClick={isConfirm ? undefined : onClose}
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-sm rounded-[28px] bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] ring-1 ${style.ring} p-6 ${panelAnim}`}
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
          {activeModal.title}
        </h3>
        <p className="text-sm leading-relaxed text-gray-500 mb-6">{activeModal.message}</p>

        {isConfirm ? (
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {activeModal.cancelLabel || 'Cancel'}
            </button>
            <button
              onClick={() => {
                activeModal.onConfirm?.();
                onClose();
              }}
              className="flex-1 rounded-full bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-200 hover:bg-red-600 transition-colors"
            >
              {activeModal.confirmLabel || 'Delete'}
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className={`w-full rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${style.accent}`}
          >
            {activeModal.confirmLabel || 'Got it'}
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

const EMPTY_FORM = { firstName: '', middleName: '', lastName: '', email: '', department: '' };

const inputClass =
  'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all';

// Falls back to fullName so old records still display
const getDisplayName = (inv) => {
  const p = inv.profile || {};
  if (p.firstName || p.lastName) {
    return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
  }
  return inv.fullName || inv.email;
};

/**
 * Derive academic school year (e.g. "2026-2027") for an invitation
 */
function getInvitationSchoolYear(inv, periods = []) {
  if (inv.schoolYear) return inv.schoolYear;
  const rawDate = inv.dateSent || inv.createdAt;
  if (!rawDate) return '';
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return '';

  // Check if date falls within a configured AcademicPeriod
  for (const p of periods) {
    if (p.startDate && p.endDate) {
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      if (d >= start && d <= end && p.schoolYear) {
        return p.schoolYear;
      }
    }
  }

  // Fallback to standard academic year calculation (June–May / Aug–Jul)
  const year = d.getFullYear();
  const month = d.getMonth(); // 0 = Jan, 5 = Jun
  return month < 5 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
}

function InviteInstructor() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [invitations, setInvitations] = useState([]);
  const [academicPeriods, setAcademicPeriods] = useState([]);
  const [isSending, setIsSending] = useState(false);
  // Ids currently mid-request (blocks rapid double-clicks while waiting on the server)
  const [resendingIds, setResendingIds] = useState(() => new Set());
  const { modal, close, notify, confirm } = useAppModal();
  const [invitePage, setInvitePage] = useState(1);
  const [tableVisible, setTableVisible] = useState(true);

  // Smooth collapse/expand state for Invite Card
  const [showInviteCard, setShowInviteCard] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolYearFilter, setSchoolYearFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [viewBy, setViewBy] = useState('newest');

  useEffect(() => {
    fetch('/api/invitations')
      .then((res) => res.json())
      .then((data) => setInvitations(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load invitations:', err));

    const token = localStorage.getItem('token');
    fetch('/api/academic-periods?includeArchived=true', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.periods && Array.isArray(data.periods)) {
          setAcademicPeriods(data.periods);
        }
      })
      .catch(() => { });
  }, []);

  // Build available School Year options from academic periods + invitations
  const schoolYearOptions = useMemo(() => {
    const years = new Set();
    academicPeriods.forEach((p) => {
      if (p.schoolYear) years.add(p.schoolYear);
    });
    invitations.forEach((inv) => {
      const sy = getInvitationSchoolYear(inv, academicPeriods);
      if (sy) years.add(sy);
    });
    if (years.size === 0) {
      years.add('2026-2027');
      years.add('2025-2026');
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [academicPeriods, invitations]);

  // Build available Department options
  const departmentOptions = useMemo(() => {
    const depts = new Set(DEPARTMENTS);
    invitations.forEach((inv) => {
      if (inv.department) depts.add(inv.department);
    });
    return Array.from(depts).sort();
  }, [invitations]);

  // Filter and sort invitations
  const filteredInvitations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = invitations.filter((inv) => {
      const name = getDisplayName(inv).toLowerCase();
      const email = (inv.email || '').toLowerCase();
      const matchSearch = !q || name.includes(q) || email.includes(q);

      const matchDept =
        departmentFilter === 'all' || inv.department === departmentFilter;

      const invSy = getInvitationSchoolYear(inv, academicPeriods);
      const matchSy = schoolYearFilter === 'all' || invSy === schoolYearFilter;

      if (viewBy.startsWith('status_')) {
        const targetStatus = viewBy.replace('status_', '');
        if ((inv.status || '').toLowerCase() !== targetStatus) return false;
      }

      return matchSearch && matchDept && matchSy;
    });

    return list.sort((a, b) => {
      if (viewBy === 'name_asc') {
        return getDisplayName(a).localeCompare(getDisplayName(b));
      }
      if (viewBy === 'name_desc') {
        return getDisplayName(b).localeCompare(getDisplayName(a));
      }
      const dateA = new Date(a.dateSent || a.createdAt || 0).getTime();
      const dateB = new Date(b.dateSent || b.createdAt || 0).getTime();
      if (viewBy === 'oldest') {
        return dateA - dateB;
      }
      // default 'newest' or status filter
      return dateB - dateA;
    });
  }, [invitations, searchQuery, departmentFilter, schoolYearFilter, viewBy, academicPeriods]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setInvitePage(1);
  }, [searchQuery, departmentFilter, schoolYearFilter, viewBy]);

  // Fade table on page or filter change
  const isFirstPageRender = useRef(true);
  useEffect(() => {
    if (isFirstPageRender.current) {
      isFirstPageRender.current = false;
      return;
    }
    setTableVisible(false);
    const t = setTimeout(() => setTableVisible(true), 180);
    return () => clearTimeout(t);
  }, [invitePage, searchQuery, departmentFilter, schoolYearFilter, viewBy]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSend = async () => {
    if (isSending) return;
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.department) {
      notify(
        'error',
        'Missing information',
        'Fill in the instructor’s first name, last name, email, and department before sending the invitation.'
      );
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        notify(
          'error',
          'Invitation not sent',
          data.message || 'The server couldn’t process this invitation. Try again.'
        );
        return;
      }

      setInvitations((current) => [data, ...current]);
      setForm(EMPTY_FORM);
      notify(
        'success',
        'Invitation sent',
        `${getDisplayName(data)} will receive an email to join as an instructor.`
      );
    } catch (err) {
      console.error('Failed to send invitation:', err);
      notify(
        'error',
        'Something went wrong',
        'We couldn’t reach the server. Check your connection and try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => setForm(EMPTY_FORM);

  const handleResend = async (id) => {
    if (resendingIds.has(id)) return;

    setResendingIds((prev) => new Set(prev).add(id));

    try {
      const res = await fetch(`/api/invitations/${id}/resend`, { method: 'PATCH' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        notify(
          'error',
          'Resend failed',
          data.message || 'This invitation couldn’t be resent. Try again.'
        );
        return;
      }
      const updated = await res.json();
      setInvitations((prev) => prev.map((inv) => (inv._id === id ? updated : inv)));
      notify('success', 'Invitation resent', 'A fresh invitation email is on its way.');
    } catch (err) {
      console.error('Failed to resend invitation:', err);
      notify(
        'error',
        'Something went wrong',
        'We couldn’t reach the server. Check your connection and try again.'
      );
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
        notify(
          'error',
          'Cancel failed',
          data.message || 'This invitation couldn’t be cancelled. Try again.'
        );
        return;
      }
      const updated = await res.json();
      setInvitations((prev) => prev.map((inv) => (inv._id === id ? updated : inv)));
      notify(
        'success',
        'Invitation cancelled',
        'The invitation link no longer works. You can send a new one to the correct email.'
      );
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
      notify(
        'error',
        'Something went wrong',
        'We couldn’t reach the server. Check your connection and try again.'
      );
    }
  };

  const handleCancelInvitation = (inv) => {
    const who = getDisplayName(inv);

    confirm({
      title: 'Cancel this invitation?',
      message: `${who} will no longer be able to accept this invitation. The record stays in your list as Cancelled.`,
      confirmLabel: 'Cancel invitation',
      cancelLabel: 'Keep it',
      onConfirm: () => cancelInvitation(inv._id),
    });
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    schoolYearFilter !== 'all' ||
    departmentFilter !== 'all' ||
    viewBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setSchoolYearFilter('all');
    setDepartmentFilter('all');
    setViewBy('newest');
  };

  const totalPages = Math.ceil(filteredInvitations.length / INVITE_PAGE_SIZE);

  return (
    <>
      {/* PAGE HEADER + TOGGLE INVITE CARD BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-brand-purple sm:text-2xl">
            Invite Instructors
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Send email invitations to new faculty members and track their onboarding status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowInviteCard((prev) => !prev)}
          aria-expanded={showInviteCard}
          className={`inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer shadow-2xs ${showInviteCard
            ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            : 'bg-brand-orange text-white hover:bg-orange-600 shadow-sm'
            }`}
        >
          {showInviteCard ? (
            <>
              <ChevronUp size={16} className="text-gray-500 transition-transform duration-300" />
              <span>Hide Invite Card</span>
            </>
          ) : (
            <>
              <UserPlus size={16} />
              <span>Show Invite Card</span>
            </>
          )}
        </button>
      </div>

      {/* Smooth Animated Collapsible Invite Card */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${showInviteCard
          ? 'grid-rows-[1fr] opacity-100 mb-6'
          : 'grid-rows-[0fr] opacity-0 mb-0 pointer-events-none'
          }`}
      >
        <div className="overflow-hidden">
          <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-6 border border-gray-100">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-orange-50 p-2.5 rounded-xl">
                  <Mail className="text-orange-500" size={20} />
                </div>
                <h2 className="font-semibold text-lg text-gray-800">Invite New Instructor</h2>
              </div>

              <button
                type="button"
                onClick={() => setShowInviteCard(false)}
                title="Hide invite form"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <ChevronUp size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1.5">First Name</label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1.5">
                  Middle Name <span className="text-gray-300">(optional)</span>
                </label>
                <input
                  name="middleName"
                  value={form.middleName}
                  onChange={handleChange}
                  placeholder="Middle name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1.5">Last Name</label>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm text-gray-500 block mb-1.5">Email Address</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="instructor@university.edu"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1.5">Department</label>
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className={`${inputClass} text-gray-500`}
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
                className="border border-gray-200 rounded-full px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={isSending}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:cursor-wait disabled:opacity-60 text-white rounded-full px-6 py-2.5 text-sm font-semibold shadow-lg shadow-orange-200 transition-all cursor-pointer"
              >
                {isSending ? 'Sending…' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR: Search | School Year | Department | View By */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search instructor by name or email.."
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-10 text-sm text-gray-700 placeholder-gray-400 shadow-2xs transition focus:border-brand-orange focus:outline-none"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          )}
        </div>

        {/* School Year Filter */}
        <div className="relative shrink-0 sm:w-44 lg:w-48">
          <select
            value={schoolYearFilter}
            onChange={(e) => setSchoolYearFilter(e.target.value)}
            aria-label="Filter by School Year"
            className="w-full cursor-pointer appearance-none truncate rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-9 text-sm text-gray-700 shadow-2xs transition focus:border-brand-orange focus:outline-none"
          >
            <option value="all">All School Years</option>
            {schoolYearOptions.map((sy) => (
              <option key={sy} value={sy}>
                S.Y. {sy}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Department Filter */}
        <div className="relative shrink-0 sm:w-48 lg:w-56">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by Department"
            className="w-full cursor-pointer appearance-none truncate rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-9 text-sm text-gray-700 shadow-2xs transition focus:border-brand-orange focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* View By / Order By */}
        <div className="relative shrink-0 sm:w-44 lg:w-48">
          <select
            value={viewBy}
            onChange={(e) => setViewBy(e.target.value)}
            aria-label="View by / Order by"
            className="w-full cursor-pointer appearance-none truncate rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-9 text-sm text-gray-700 shadow-2xs transition focus:border-brand-orange focus:outline-none"
          >
            {VIEW_BY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Recent Invitations Table */}
      <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-6 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-shadow">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-semibold text-lg text-gray-800">Recent Invitations</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredInvitations.length}{' '}
              {hasActiveFilters ? 'matching' : 'total'} invitation
              {filteredInvitations.length !== 1 ? 's' : ''}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-brand-orange hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
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
            <tbody
              className={`transition-opacity duration-300 ${tableVisible ? 'opacity-100' : 'opacity-0'
                }`}
            >
              {filteredInvitations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-16">
                    <Mail className="mx-auto text-gray-300 mb-3" size={32} />
                    <p className="text-gray-400 text-sm">
                      {hasActiveFilters
                        ? 'No invitations match your filters.'
                        : 'No invitations sent yet.'}
                    </p>
                    <p className="text-gray-300 text-xs mt-1">
                      {hasActiveFilters
                        ? 'Try adjusting your search or filter selections.'
                        : 'Invite your first instructor to get started.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvitations
                  .slice((invitePage - 1) * INVITE_PAGE_SIZE, invitePage * INVITE_PAGE_SIZE)
                  .map((inv) => {
                    const isResending = resendingIds.has(inv._id);
                    const name = getDisplayName(inv);
                    const photo = inv.profile?.photoUrl || inv.googlePhotoUrl;
                    const canViewProfile =
                      inv.status === 'Accepted' && inv.accountStatus === 'Active';

                    return (
                      <tr
                        key={inv._id}
                        onClick={() => {
                          if (canViewProfile) navigate(`/admin/instructors/${inv._id}`);
                        }}
                        className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors duration-150 ${canViewProfile ? 'cursor-pointer' : ''
                          }`}
                      >
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0 overflow-hidden border border-orange-100">
                              {photo ? (
                                <img
                                  src={photo}
                                  alt={name}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback =
                                      e.currentTarget.parentElement?.querySelector('svg');
                                    if (fallback) fallback.style.display = 'block';
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              ) : null}
                              <User
                                style={{ display: photo ? 'none' : 'block' }}
                                className="text-orange-400"
                                size={18}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 truncate">{name}</p>
                              <p className="text-gray-400 text-xs truncate">{inv.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-gray-600 pr-4">{inv.department}</td>
                        <td className="text-gray-600 pr-4">{formatDate(inv.dateSent)}</td>
                        <td className="pr-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[inv.status] || 'bg-gray-50 text-gray-600 border-gray-200'
                              }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            {inv.status === 'Accepted' &&
                              (inv.accountStatus === 'Active' ? (
                                <Link
                                  to={`/admin/instructors/${inv._id}`}
                                  className="text-blue-500 text-xs font-medium hover:underline"
                                >
                                  View Profile
                                </Link>
                              ) : (
                                <span className="text-xs font-medium text-gray-400">
                                  Setting up…
                                </span>
                              ))}

                            {(inv.status === 'Rejected' || inv.status === 'Expired') && (
                              <button
                                onClick={() => handleResend(inv._id)}
                                disabled={isResending}
                                className={`flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${isResending
                                  ? 'text-orange-300 cursor-wait'
                                  : 'text-orange-500 hover:underline'
                                  }`}
                              >
                                <RotateCcw
                                  size={13}
                                  className={isResending ? 'animate-spin' : ''}
                                />
                                {isResending ? 'Sending…' : 'Resend'}
                              </button>
                            )}

                            {inv.status === 'Pending' && (
                              <button
                                onClick={() => handleCancelInvitation(inv)}
                                className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
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

        {/* PAGINATION */}
        {filteredInvitations.length > INVITE_PAGE_SIZE && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 text-[13px] text-gray-500">
            <span>
              Showing {(invitePage - 1) * INVITE_PAGE_SIZE + 1}–
              {Math.min(invitePage * INVITE_PAGE_SIZE, filteredInvitations.length)} of{' '}
              {filteredInvitations.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={invitePage <= 1}
                onClick={() => setInvitePage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-4 h-4 inline" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setInvitePage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium border transition ${p === invitePage
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={invitePage >= totalPages}
                onClick={() => setInvitePage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight className="w-4 h-4 inline" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AppModal modal={modal} onClose={close} />
    </>
  );
}

export default InviteInstructor;
