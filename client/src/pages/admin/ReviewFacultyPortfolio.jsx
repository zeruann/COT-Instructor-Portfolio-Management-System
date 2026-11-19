// client/src/pages/admin/ReviewFacultyPortfolio.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  ArrowLeft,
  Folder,
  MoreVertical,
  MessageSquare,
  FileText,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { fetchFacultySummary, fetchDocuments } from '../../api/documents';
import PreviewModal from '../../components/documentActions/PreviewModal';
import StatusBadge from '../../components/documentActions/StatusBadge';
import { API_BASE } from '../../api/config';
import { hasFacultyRequirementAccess, readStoredUserRecord } from '../../config/adminPermissions';

// accent = dot + underline color of the card (matches the design reference)
const requirementCards = [
  {
    title: 'Educational Attainment',
    description: "TOR, Diploma or Certificate of Units Earned for your Bachelor's, Master's and PhD.",
    path: 'educational-attainment',
    accent: '#6aaa64',
  },
  {
    title: 'Service Records',
    description: 'Upload your service records.',
    path: 'service-records',
    accent: '#6aaa64',
  },
  {
    title: 'Seminars and Workshops',
    description:
      'List of seminars and workshops with certificates, from August 2019 to present. Add new ones as you attend.',
    path: 'seminars-and-workshops',
    accent: '#6aaa64',
  },
  {
    title: 'Achievements',
    description: 'Grants, Awards, Certification of Commendation.',
    path: 'achievements',
    accent: '#6aaa64',
  },
  {
    title: 'Research',
    description:
      'Research proposals and finished or published research, with certificate of publication and abstract.',
    path: 'research',
    accent: '#6aaa64',
  },
  {
    title: 'Extension Involvement',
    description:
      "Certificates of extension involvement, project leaders' training designs, or related proof.",
    path: 'extension-involvement',
    accent: '#6aaa64',
  },
  {
    title: 'Production',
    description:
      "Certificates of Copyrighted IM's, Patent or utility model approved application 1st or 2nd certificate.",
    path: 'production',
    accent: '#6aaa64',
  },
  {
    title: 'Professional Organization Membership',
    description: 'Sample copy of your professional membership form.',
    path: 'professional-organization-membership',
    accent: '#6aaa64',
  },
  {
    title: 'Passed Licensure Examinations',
    description: 'Sample copy of your PRC ID or licensure examination certificate.',
    path: 'passed-licensure-examinations',
    accent: '#6aaa64',
  },
  {
    title: 'IPCR',
    description: 'Photocopy of IPCR from 1st and 2nd semester of the current school year.',
    path: 'ipcr',
    accent: '#6aaa64',
  },
];

// Status chip styles for each card
const statusStyles = {
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  review: { label: 'For review', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  rejected: { label: 'Needs revision', className: 'bg-red-50 text-red-700 border-red-200' },
  empty: { label: 'No documents', className: 'bg-gray-50 text-gray-600 border-gray-200' },
};

const getCardStatus = ({ approved, pending, rejected }) => {
  if (rejected > 0) return 'rejected';
  if (pending > 0) return 'review';
  if (approved > 0) return 'completed';
  return 'empty';
};

// Completion is computed from the real document statuses.
// Each requirement category is worth an equal share of 100%. Inside a category, the
// share is split by how many of its files are approved / pending / rejected.
// Categories with no files, or files that are not approved yet, add nothing to "percent".
const computeCompletion = (summaries) => {
  const categoryCount = requirementCards.length;
  let approvedShare = 0;
  let pendingShare = 0;
  let rejectedShare = 0;
  const counts = { approved: 0, pending: 0, rejected: 0 };

  requirementCards.forEach(({ path }) => {
    const s = summaries?.[path] || {};
    const approved = s.approved || 0;
    const pending = s.pendingReview || 0;
    const rejected = s.rejected || 0;
    const total = Math.max(s.totalFiles || 0, approved + pending + rejected);
    if (total === 0) return;

    approvedShare += approved / total;
    pendingShare += pending / total;
    rejectedShare += rejected / total;
    counts.approved += approved;
    counts.pending += pending;
    counts.rejected += rejected;
  });

  const toPct = (share) => (share / categoryCount) * 100;
  return {
    percent: Math.round(toPct(approvedShare)),
    approvedPct: toPct(approvedShare),
    pendingPct: toPct(pendingShare),
    rejectedPct: toPct(rejectedShare),
    counts,
  };
};

function PortfolioCard({
  card,
  summary,
  instructorId,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onSelectRequirement,
  compact = false,
  locked = false,
}) {
  const approved = summary.approved || 0;
  const pending = summary.pendingReview || 0;
  const rejected = summary.rejected || 0;
  const files = summary.totalFiles ?? approved + pending + rejected;
  const comments = summary.comments ?? summary.commentCount ?? 0;
  const status = statusStyles[getCardStatus({ approved, pending, rejected })];
  const href = `/admin/portfolio/faculty-portfolio/${card.path}?instructorId=${instructorId}`;

  const titleCls = compact
    ? 'min-w-0 break-words text-sm font-bold leading-snug text-gray-900 group-hover:text-brand-orange transition'
    : 'min-w-0 break-words text-base font-bold leading-snug text-gray-900 group-hover:text-brand-orange transition sm:text-[17px]';
  const descCls = compact
    ? 'break-words text-xs leading-relaxed text-gray-400'
    : 'break-words text-xs leading-relaxed text-gray-400 sm:text-sm';

  if (locked) {
    return (
      <div
        title="Locked — access not granted for this requirement"
        className={`relative flex h-full min-w-0 flex-col rounded-xl border border-gray-200 bg-gray-100/80 opacity-65 select-none cursor-not-allowed ${compact ? 'px-4 pt-4 pb-3.5 min-h-[165px]' : 'px-4 pt-5 pb-4 sm:px-5 sm:pt-6 sm:pb-5 min-h-[220px]'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" />
            <h3 className="min-w-0 break-words text-sm font-bold leading-snug text-gray-500 sm:text-base">
              {card.title}
            </h3>
          </div>
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500">
            <Lock size={14} />
          </span>
        </div>
        <div className="mt-3 h-[2px] w-full rounded-full bg-gray-300" />
        <p className="mt-3 flex-1 break-words text-xs leading-relaxed text-gray-400">
          {card.description}
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <Lock size={12} />
          <span>Access Locked</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex h-full min-w-0 flex-col rounded-xl bg-[#f5f5f5] ${compact ? 'px-4 pt-4 pb-3.5 min-h-[165px]' : 'px-4 pt-5 pb-4 sm:px-5 sm:pt-6 sm:pb-5 min-h-[220px]'
        }`}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        {onSelectRequirement ? (
          <button
            type="button"
            onClick={() => onSelectRequirement(card)}
            className="group flex min-w-0 items-start gap-2.5 text-left cursor-pointer"
          >
            <span
              className={`mt-1 ${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} shrink-0 rounded-full`}
              style={{ backgroundColor: card.accent }}
            />
            <h3 className={titleCls}>
              {card.title}
            </h3>
          </button>
        ) : (
          <Link to={href} className="group flex min-w-0 items-start gap-2.5">
            <span
              className={`mt-1 ${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} shrink-0 rounded-full`}
              style={{ backgroundColor: card.accent }}
            />
            <h3 className={titleCls}>
              {card.title}
            </h3>
          </Link>
        )}

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label={`${card.title} options`}
            aria-expanded={menuOpen}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple transition cursor-pointer"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {onSelectRequirement ? (
                <button
                  type="button"
                  onClick={() => {
                    onCloseMenu();
                    onSelectRequirement(card);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Open and review
                </button>
              ) : (
                <Link
                  to={href}
                  onClick={onCloseMenu}
                  className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Open and review
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Accent underline */}
      <div className="mt-3 h-[2px] w-full rounded-full" style={{ backgroundColor: card.accent }} />

      {/* Description */}
      {onSelectRequirement ? (
        <button
          type="button"
          onClick={() => onSelectRequirement(card)}
          className="mt-3 flex-1 text-left cursor-pointer"
        >
          <p className={descCls}>
            {card.description}
          </p>
        </button>
      ) : (
        <Link to={href} className="mt-3 flex-1">
          <p className={descCls}>
            {card.description}
          </p>
        </Link>
      )}

      {/* Footer */}
      <div className={`${compact ? 'mt-3 pt-2.5' : 'mt-5 pt-3'} flex items-center justify-between gap-2 text-xs text-gray-500`}>
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}
        >
          {status.label}
        </span>
        <div className={`flex items-center ${compact ? 'gap-2.5 text-[11px]' : 'gap-3 text-xs'} text-gray-400`}>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <MessageSquare size={compact ? 13 : 14} className="shrink-0" />
            {comments} {comments === 1 ? 'comment' : 'comments'}
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <FileText size={compact ? 13 : 14} className="shrink-0" />
            {files} {files === 1 ? 'file' : 'files'}
          </span>
        </div>
      </div>
    </div>
  );
}

function ContactRow({ label, value }) {
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-3 border-b border-gray-200 py-3 last:border-b-0 sm:grid-cols-[72px_minmax(0,1fr)] sm:py-3.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="min-w-0 text-sm font-medium text-gray-800 [overflow-wrap:anywhere]">
        {value || '—'}
      </span>
    </div>
  );
}


export default function ReviewFacultyPortfolio({
  instructorId: propInstructorId,
  embedded = false,
  onSelectRequirement,
} = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const instructorId = propInstructorId || searchParams.get('instructorId');

  const [instructors, setInstructors] = useState([]);
  // { [instructorId]: { [categoryPath]: { approved, pendingReview, rejected, ... } } }
  const [summariesById, setSummariesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [viewBy, setViewBy] = useState('all');
  const [displayMode, setDisplayMode] = useState('grid'); // 'grid' | 'table'
  const [viewVisible, setViewVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const [openMenu, setOpenMenu] = useState(null);
  const [pdsDoc, setPdsDoc] = useState(null);
  const [pdsPreviewOpen, setPdsPreviewOpen] = useState(false);

  const resetFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('all');
    setViewBy('all');
  };

  const switchDisplayMode = (mode) => {
    if (mode === displayMode) return;
    setDisplayMode(mode);
  };

  // Load list of instructors
  useEffect(() => {
    fetch(`${API_BASE}/instructors`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.instructors || [];
        setInstructors(list);
      })
      .catch((err) => console.error('Failed to load instructors:', err))
      .finally(() => setLoading(false));
  }, []);

  // Derive selected instructor from query param
  const selectedInstructor = useMemo(() => {
    if (!instructorId || instructors.length === 0) return null;
    return instructors.find((inst) => (inst._id || inst.id) === instructorId) || null;
  }, [instructorId, instructors]);

  // Load summary + PDS document for selected instructor
  const loadPdsDoc = (targetId) => {
    if (!targetId) {
      setPdsDoc(null);
      return Promise.resolve();
    }
    return fetchDocuments({ requirementKey: 'FAC_A_PDS', instructorId: targetId })
      .then((docs) => {
        setPdsDoc(Array.isArray(docs) ? docs[0] || null : null);
      })
      .catch((err) => {
        console.error('Failed to load instructor PDS:', err);
        setPdsDoc(null);
      });
  };

  useEffect(() => {
    let isCurrent = true;
    if (instructorId) {
      fetchFacultySummary(instructorId)
        .then((sum) => {
          if (isCurrent) setSummariesById((prev) => ({ ...prev, [instructorId]: sum || {} }));
        })
        .catch((err) => console.error('Failed to load portfolio summaries:', err));
      fetchDocuments({ requirementKey: 'FAC_A_PDS', instructorId })
        .then((docs) => {
          if (isCurrent) setPdsDoc(Array.isArray(docs) ? docs[0] || null : null);
        })
        .catch((err) => console.error('Failed to load instructor PDS:', err));
    } else {
      setPdsDoc(null);
    }
    return () => {
      isCurrent = false;
    };
  }, [instructorId]);

  // On the instructor list, load every instructor's summary so each card shows a live
  // completion value. Runs again whenever the admin returns to the list, so approvals
  // made on the review pages are reflected.
  useEffect(() => {
    if (instructorId || instructors.length === 0) return undefined;
    let isCurrent = true;

    Promise.allSettled(
      instructors.map((inst) => {
        const id = inst._id || inst.id;
        return fetchFacultySummary(id).then((sum) => [id, sum || {}]);
      }),
    ).then((results) => {
      if (!isCurrent) return;
      const next = {};
      results.forEach((r) => {
        if (r.status === 'fulfilled') next[r.value[0]] = r.value[1];
      });
      setSummariesById((prev) => ({ ...prev, ...next }));
    });

    return () => {
      isCurrent = false;
    };
  }, [instructorId, instructors]);

  // Close the card menu when clicking elsewhere
  useEffect(() => {
    if (!openMenu) return undefined;
    const close = () => setOpenMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenu]);

  const selectInstructor = (inst) => {
    setSearchParams({ instructorId: inst._id || inst.id });
  };

  const clearSelection = () => {
    setSearchParams({});
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, departmentFilter, viewBy]);

  const departments = [
    ...new Set(instructors.map((i) => i.department).filter(Boolean)),
  ].sort();


  // Completion for an instructor, based on their approved / pending / rejected documents.
  // Returns null until their summary has loaded (unless the API already sends a number).
  const getCompletion = (inst) => {
    const summary = summariesById[inst._id || inst.id];
    if (summary) return computeCompletion(summary);

    const apiPercent =
      typeof inst.completionPercentage === 'number'
        ? inst.completionPercentage
        : inst.completionRate;
    if (typeof apiPercent === 'number') {
      return {
        percent: apiPercent,
        approvedPct: apiPercent,
        pendingPct: 0,
        rejectedPct: 0,
        counts: null,
      };
    }
    return null;
  };

  const viewByOptions = [
    { value: 'all', label: 'All' },
    { value: 'last_updated', label: 'Last Updated' },
    { value: 'name_asc', label: 'Name (A to Z)' },
    { value: 'name_desc', label: 'Name (Z to A)' },
    { value: 'completion_high', label: 'Highest Completion' },
    { value: 'completion_low', label: 'Lowest Completion' },
  ];

  // Prioritise profile first/last name over the root fullName which may be stale
  const getDisplayName = (inst) => {
    const p = inst?.profile || {};
    const parts = [p.firstName, p.middleName, p.lastName].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    return inst?.fullName || '';
  };

  const filteredInstructors = useMemo(() => {
    const query = searchQuery.toLowerCase();

    const result = instructors.filter((inst) => {
      const name = getDisplayName(inst);
      const email = inst.email || '';
      const matchSearch = name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
      const matchDept = departmentFilter === 'all' || inst.department === departmentFilter;

      return matchSearch && matchDept;
    });

    return result.sort((a, b) => {
      if (viewBy === 'last_updated') {
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return dateB - dateA;
      }
      if (viewBy === 'name_asc') {
        return getDisplayName(a).localeCompare(getDisplayName(b));
      }
      if (viewBy === 'name_desc') {
        return getDisplayName(b).localeCompare(getDisplayName(a));
      }
      if (viewBy === 'completion_high') {
        const pctA = getCompletion(a)?.percent ?? -1;
        const pctB = getCompletion(b)?.percent ?? -1;
        return pctB - pctA;
      }
      if (viewBy === 'completion_low') {
        const pctA = getCompletion(a)?.percent ?? 999;
        const pctB = getCompletion(b)?.percent ?? 999;
        return pctA - pctB;
      }
      return 0;
    });
  }, [instructors, searchQuery, departmentFilter, viewBy, summariesById]);

  // Auto-fit grid: columns are added/removed based on the space actually available
  // (works regardless of sidebar width), and cards never get narrower than 300px.
  const instructorGridClass =
    'grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4 sm:gap-6';

  const totalPages = Math.ceil(filteredInstructors.length / pageSize) || 1;
  const paginatedInstructors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInstructors.slice(start, start + pageSize);
  }, [filteredInstructors, currentPage, pageSize]);

  // ───────────────────────── Selected instructor view ─────────────────────────
  if (selectedInstructor) {
    const id = selectedInstructor._id || selectedInstructor.id;
    const profile = selectedInstructor.profile || {};
    const rank = profile.rank || profile.position || 'Assistant Professor IV';
    const department = selectedInstructor.department || 'IT Department';
    const phone = selectedInstructor.phone || profile.phone || profile.contactNumber;
    const address = selectedInstructor.address || profile.address;
    const pdsUrl = profile.pdsUrl || selectedInstructor.pdsUrl;
    const education = Array.isArray(profile.education)
      ? profile.education
      : Array.isArray(selectedInstructor.education)
        ? selectedInstructor.education
        : [];
    const instructorSummaries = summariesById[id] || {};
    const completion = getCompletion(selectedInstructor) || computeCompletion({});
    const {
      percent = 0,
      approvedPct = 0,
      pendingPct = 0,
      rejectedPct = 0,
      counts,
    } = completion;
    const uploaded = counts ? counts.approved + counts.pending + counts.rejected : 0;

    const completionMessage =
      percent >= 100
        ? 'Your portfolio has been verified and approved!'
        : counts?.rejected > 0
          ? 'Some documents need revision.'
          : counts?.pending > 0
            ? 'Some documents are waiting for review.'
            : 'No documents have been approved yet.';

    const legend = [
      { color: '#d1d5db', label: 'Documents uploaded', value: uploaded },
      { color: '#6aaa64', label: 'Approved', value: counts?.approved },
      { color: '#f0a93b', label: 'Pending review', value: counts?.pending },
      { color: '#ef6c35', label: 'Rejected', value: counts?.rejected },
    ];

    const cardRows = [
      requirementCards.slice(0, 4),
      requirementCards.slice(4, 8),
      requirementCards.slice(8),
    ].filter((r) => r.length > 0);

    return (
      <div className="min-w-0 space-y-4 sm:space-y-6">
        {/* Page title */}
        {!embedded && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearSelection}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-brand-purple text-brand-purple transition hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
              title="Back to all instructors"
              aria-label="Back to all instructors"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="min-w-0 text-xl font-bold text-brand-purple sm:text-2xl">
              Faculty Portfolio Review
            </h1>
          </div>
        )}

        {embedded ? (
          /* TOP ROW (embedded modal): matches Class Portfolio Compliance Summary + Portfolio Completion */
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs">
              <h2 className="text-sm sm:text-base font-bold text-gray-800">
                Compliance Summary
              </h2>

              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-200 flex">
                {approvedPct > 0 && (
                  <div style={{ width: `${approvedPct}%` }} className="h-full bg-[#5cab5f]" />
                )}
                {pendingPct > 0 && (
                  <div style={{ width: `${pendingPct}%` }} className="h-full bg-[#f5a30f]" />
                )}
                {rejectedPct > 0 && (
                  <div style={{ width: `${rejectedPct}%` }} className="h-full bg-[#ef4444]" />
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#5cab5f]" />
                  ({counts?.approved ?? 0}) Approved
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f5a30f]" />
                  ({counts?.pending ?? 0}) Pending Review
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                  ({counts?.rejected ?? 0}) Rejected
                </span>
                <span className="flex items-center gap-1.5 font-medium text-gray-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                  Not Yet Submitted
                </span>
              </div>

              <p className="mt-2.5 text-xs text-gray-400">
                {counts?.approved ?? 0} of {uploaded} submitted documents are currently approved.
              </p>
            </section>

            <section className="flex flex-col justify-between items-center text-center rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs">
              <span className="text-xs sm:text-sm font-semibold text-brand-purple">
                Portfolio Completion
              </span>
              <div className="my-auto py-1.5">
                <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${percent > 0 ? 'text-[#5cab5f]' : 'text-gray-400'}`}>
                  {percent}%
                </span>
                <p className="mt-1.5 text-xs font-normal text-gray-400">
                  {percent >= 100
                    ? 'Portfolio fully verified and completed.'
                    : percent > 0
                      ? 'Portfolio is in progress.'
                      : 'No submissions approved yet.'}
                </p>
              </div>
            </section>
          </div>
        ) : (
          /* Profile + completion: side by side only when there is really room (2xl), stacked otherwise */
          <div className="grid grid-cols-1 gap-4 sm:gap-6 2xl:grid-cols-[minmax(0,1fr)_520px]">
            {/* Profile card (container: layout reacts to the card's own width) */}
            <div className="@container min-w-0">
              <div className="flex h-full min-w-0 flex-col rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 @2xl:flex-row">
                {/* Identity */}
                <div className="flex min-w-0 flex-col items-center gap-4 border-b border-gray-200 pb-5 text-center @md:flex-row @md:text-left @2xl:shrink-0 @2xl:border-b-0 @2xl:border-r @2xl:pb-0 @2xl:pr-6">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-50 @md:h-28 @md:w-28">
                    {profile.photoUrl ? (
                      <img
                        src={profile.photoUrl}
                        alt={getDisplayName(selectedInstructor)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fb923c"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-12 w-12 sm:h-14 sm:w-14"
                        aria-hidden="true"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    )}
                  </div>

                  <div className="min-w-0 w-full @md:w-auto @md:max-w-[220px]">
                    <h2 className="break-words text-lg font-semibold leading-tight text-gray-900 sm:text-xl">
                      {getDisplayName(selectedInstructor)}
                    </h2>
                    <p className="mt-1 break-words text-sm text-gray-500">{rank}</p>
                    <p className="break-words text-sm text-gray-500">{department}</p>

                    {!hasFacultyRequirementAccess(readStoredUserRecord(), 'FAC_A_PDS') ? (
                      <button
                        type="button"
                        disabled
                        title="Locked — PDS access not granted"
                        className="mt-3 inline-flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-6 py-2 text-sm font-medium text-gray-400"
                      >
                        <Lock size={14} />
                        <span>PDS Locked</span>
                      </button>
                    ) : pdsDoc ? (
                      <div className="mt-3 space-y-2">
                        <button
                          type="button"
                          onClick={() => setPdsPreviewOpen(true)}
                          className="w-full cursor-pointer rounded-md border border-brand-purple bg-purple-50 px-6 py-2 text-center text-sm font-semibold text-brand-purple transition hover:bg-purple-100"
                        >
                          See PDS
                        </button>
                        <div className="flex justify-center">
                          <StatusBadge status={pdsDoc.status} />
                        </div>
                      </div>
                    ) : pdsUrl ? (
                      <a
                        href={pdsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 block w-full rounded-md border border-gray-300 px-6 py-2 text-center text-sm text-gray-600 transition hover:bg-gray-50"
                      >
                        See PDS
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title="No PDS uploaded yet"
                        className="mt-3 w-full cursor-not-allowed rounded-md border border-gray-300 px-6 py-2 text-sm text-gray-400"
                      >
                        See PDS
                      </button>
                    )}
                  </div>
                </div>

                {/* Contact + educational background */}
                <div className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] gap-x-10 gap-y-6 pt-5 @2xl:pl-8 @2xl:pt-0">
                  <div className="min-w-0">
                    <h3 className="mb-1 border-b border-gray-200 pb-3 text-base font-semibold text-gray-800">
                      Contact Information
                    </h3>
                    <ContactRow label="Email" value={selectedInstructor.email} />
                    <ContactRow label="Phone" value={phone} />
                    <ContactRow label="Address" value={address} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="mb-1 border-b border-gray-200 pb-3 text-base font-semibold text-gray-800">
                      Educational Background
                    </h3>
                    {education.length > 0 ? (
                      <ul>
                        {education.map((edu, i) => (
                          <li
                            key={`${edu.degree}-${i}`}
                            className="border-b border-gray-200 py-3 last:border-b-0"
                          >
                            <p className="break-words text-sm font-semibold text-gray-800">{edu.degree}</p>
                            <p className="break-words text-xs text-gray-400">
                              {[edu.school || edu.institution, edu.year].filter(Boolean).join(' · ')}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="py-3 text-sm text-gray-400">No educational background provided.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Completion status card (also a container) */}
            <div className="@container min-w-0">
              <div className="flex h-full min-w-0 flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
                <h2 className="text-lg font-medium text-brand-purple sm:text-2xl">Completion Status</h2>

                <div className="flex flex-1 flex-col gap-5 @md:flex-row @md:items-center">
                  <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                    <p className="text-5xl font-extrabold leading-none text-[#6aaa64] sm:text-6xl @md:text-7xl">
                      {percent}%
                    </p>
                    <p className="mt-4 text-sm leading-snug text-gray-400">{completionMessage}</p>
                  </div>

                  <ul className="w-full shrink-0 divide-y divide-gray-100 border-t border-gray-200 pt-2 @md:flex @md:w-56 @md:flex-col @md:justify-center @md:self-stretch @md:border-l @md:border-t-0 @md:pl-6 @md:pt-0">
                    {legend.map((item) => (
                      <li
                        key={item.label}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm text-gray-500"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span className="font-semibold tabular-nums text-gray-800">{item.value ?? '—'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio content */}
        <section className={`min-w-0 rounded-2xl border border-gray-200 bg-white ${embedded ? 'p-4 sm:p-5 shadow-xs' : 'p-4 sm:p-6'}`}>
          <div className={`${embedded ? 'mb-4' : 'mb-4 sm:mb-5'} flex items-center gap-2.5`}>
            <span className={`flex ${embedded ? 'h-8 w-8' : 'h-10 w-10'} shrink-0 items-center justify-center rounded-lg bg-[#efeef8] text-brand-purple`}>
              <Folder size={embedded ? 17 : 20} />
            </span>
            <h2 className={`min-w-0 ${embedded ? 'text-base sm:text-lg font-bold' : 'text-xl sm:text-2xl font-medium'} text-brand-purple`}>
              {embedded ? 'Faculty Requirements Checklist' : 'Portfolio Content'}
            </h2>
          </div>

          {embedded ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {requirementCards.map((card) => {
                const locked = !hasFacultyRequirementAccess(readStoredUserRecord(), card.path);
                return (
                  <PortfolioCard
                    key={card.path}
                    card={card}
                    summary={instructorSummaries[card.path] || {}}
                    instructorId={id}
                    menuOpen={openMenu === card.path}
                    onToggleMenu={(e) => {
                      e.stopPropagation();
                      setOpenMenu(openMenu === card.path ? null : card.path);
                    }}
                    onCloseMenu={() => setOpenMenu(null)}
                    onSelectRequirement={onSelectRequirement}
                    compact
                    locked={locked}
                  />
                );
              })}
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {cardRows.map((row, rowIndex) => (
                <div key={rowIndex}>
                  {rowIndex > 0 && <hr className="mb-4 border-gray-200 sm:mb-6" />}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
                    {row.map((card) => {
                      const locked = !hasFacultyRequirementAccess(readStoredUserRecord(), card.path);
                      return (
                        <PortfolioCard
                          key={card.path}
                          card={card}
                          summary={instructorSummaries[card.path] || {}}
                          instructorId={id}
                          menuOpen={openMenu === card.path}
                          onToggleMenu={(e) => {
                            e.stopPropagation();
                            setOpenMenu(openMenu === card.path ? null : card.path);
                          }}
                          onCloseMenu={() => setOpenMenu(null)}
                          onSelectRequirement={onSelectRequirement}
                          locked={locked}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <PreviewModal
          isOpen={pdsPreviewOpen}
          onClose={() => setPdsPreviewOpen(false)}
          document={pdsDoc}
          isAdmin
          onReviewSuccess={() => loadPdsDoc(id)}
        />
      </div>
    );
  }

  // ───────────────────────── Instructor Selection Screen ─────────────────────────
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-xl font-bold text-brand-purple sm:text-2xl">Faculty Portfolio</h1>
        <p className="mt-1 text-sm font-medium text-gray-500">
          Review instructor submitted requirement documents
        </p>
      </div>

      {/* Search, Department, View by */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search instructor by name or email.."
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-10 text-sm text-gray-700 placeholder-gray-400 shadow-2xs transition focus:border-brand-orange focus:outline-none"
          />
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Department Filter */}
        <div className="relative shrink-0 sm:w-52 lg:w-60">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full cursor-pointer appearance-none truncate rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-9 text-sm text-gray-700 shadow-2xs transition focus:border-brand-orange focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* View by */}
        <div className="relative shrink-0 sm:w-36 lg:w-44">
          <select
            value={viewBy}
            onChange={(e) => setViewBy(e.target.value)}
            aria-label="View by"
            className="w-full cursor-pointer appearance-none truncate rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-9 text-sm text-gray-700 shadow-2xs transition focus:border-brand-orange focus:outline-none"
          >
            <option value="all">View by</option>
            {viewByOptions.filter((o) => o.value !== 'all').map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Cards vs Table Switcher */}
        <div className="flex items-center shrink-0 rounded-xl border border-gray-200 bg-white p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => switchDisplayMode('grid')}
            title="Grid view"
            aria-label="Grid view"
            className={`rounded-lg p-2 transition cursor-pointer ${displayMode === 'grid'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-gray-400 hover:text-gray-700'
              }`}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            type="button"
            onClick={() => switchDisplayMode('table')}
            title="Table view"
            aria-label="Table view"
            className={`rounded-lg p-2 transition cursor-pointer ${displayMode === 'table'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-gray-400 hover:text-gray-700'
              }`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Cards Grid or Table View */}
      {loading ? (
        <div className={instructorGridClass}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:gap-5 sm:p-5"
            >
              <div className="h-20 w-20 shrink-0 rounded-full bg-gray-200 sm:h-24 sm:w-24" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
                <div className="h-3 w-2/3 rounded bg-gray-200" />
                <div className="mt-2 h-2 w-full rounded bg-gray-200" />
                <div className="mt-3 h-8 w-full rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredInstructors.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-2xs sm:p-12">
          <p className="text-base font-semibold text-gray-700">No instructors found</p>
          <p className="mt-1 text-xs text-gray-400">
            Try adjusting your search query or department filter.
          </p>
          {(searchQuery || departmentFilter !== 'all' || viewBy !== 'all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex items-center rounded-lg bg-purple-50 px-4 py-2 text-xs font-semibold text-brand-purple transition hover:bg-purple-100"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : displayMode === 'table' ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-600">
                  <th className="pb-3 pr-4 pl-2">LOG ID</th>
                  <th className="pb-3 px-4">INSTRUCTOR</th>
                  <th className="pb-3 px-4">DEPARTMENT</th>
                  <th className="pb-3 px-4 min-w-[280px]">COMPLETION STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {paginatedInstructors.map((inst) => {
                  const id = inst._id || inst.id;
                  const name = getDisplayName(inst) || 'Instructor';
                  const email = inst.email || '';
                  const department = inst.department || 'IT Department';
                  const photoUrl = inst.profile?.photoUrl || inst.googlePhotoUrl;
                  const completion = getCompletion(inst);
                  const percent = completion?.percent;
                  const displayId = inst.instructorId || inst.employeeId || id.slice(-8).toUpperCase();

                  return (
                    <tr
                      key={id}
                      onClick={() => selectInstructor(inst)}
                      className="group cursor-pointer hover:bg-gray-50/70 transition-colors duration-150"
                    >
                      {/* LOG ID / INSTRUCTOR ID */}
                      <td className="py-4 pr-4 text-[14px] font-medium text-gray-700 whitespace-nowrap">
                        {displayId}
                      </td>

                      {/* INSTRUCTOR (Avatar + Name [16px] + Email [14px]) */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0 overflow-hidden border border-orange-100">
                            {photoUrl ? (
                              <img src={photoUrl} alt={name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#fb923c"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-5 w-5"
                                aria-hidden="true"
                              >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[16px] font-semibold text-gray-800 leading-tight group-hover:text-brand-orange transition-colors truncate">
                              {name}
                            </p>
                            <p className="text-[14px] text-gray-400 leading-tight truncate mt-0.5">{email}</p>
                          </div>
                        </div>
                      </td>

                      {/* DEPARTMENT (Exact View Instructors styling) */}
                      <td className="py-4 px-4 text-gray-500 text-[14px] whitespace-nowrap">
                        {department || '—'}
                      </td>

                      {/* COMPLETION STATUS (Progress bar with rate beside it) */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3 w-full max-w-[280px]">
                          {/* Progress Bar (Increased height to h-2.5) */}
                          <div className="flex-1 flex h-2.5 overflow-hidden rounded-full bg-gray-100">
                            {completion?.approvedPct > 0 && (
                              <div
                                style={{ width: `${completion.approvedPct}%` }}
                                className="bg-[#10b981] transition-all duration-300"
                                title={`Approved: ${Math.round(completion.approvedPct)}%`}
                              />
                            )}
                            {completion?.pendingPct > 0 && (
                              <div
                                style={{ width: `${completion.pendingPct}%` }}
                                className="bg-amber-400 transition-all duration-300"
                                title={`Pending: ${Math.round(completion.pendingPct)}%`}
                              />
                            )}
                            {completion?.rejectedPct > 0 && (
                              <div
                                style={{ width: `${completion.rejectedPct}%` }}
                                className="bg-red-400 transition-all duration-300"
                                title={`Rejected: ${Math.round(completion.rejectedPct)}%`}
                              />
                            )}
                            {(!percent || percent === 0) &&
                              (!completion?.pendingPct && !completion?.rejectedPct) && (
                                <div className="w-full bg-gray-200" />
                              )}
                          </div>

                          {/* Rate beside progress bar */}
                          <span className="shrink-0 text-xs font-bold text-[#10b981] min-w-[34px] text-right">
                            {percent != null ? `${percent}%` : '0%'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={instructorGridClass}>
          {paginatedInstructors.map((inst) => {
            const id = inst._id || inst.id;
            const name = getDisplayName(inst) || 'Instructor';
            const rank =
              inst.profile?.rank || inst.profile?.position || 'Assistant Professor IV';
            const department = inst.department || 'IT Department';
            const photoUrl = inst.profile?.photoUrl;
            const completion = getCompletion(inst);
            const percent = completion?.percent;

            return (
              <div
                key={id}
                onClick={() => selectInstructor(inst)}
                className="group flex min-w-0 cursor-pointer items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs transition-all hover:border-orange-300 hover:shadow-md sm:gap-5 sm:p-5"
              >
                {/* Left: Avatar */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-50 sm:h-24 sm:w-24">
                  {photoUrl ? (
                    <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fb923c"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-10 w-10 sm:h-12 sm:w-12"
                      aria-hidden="true"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>

                {/* Right: Info + Progress + View button */}
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="min-w-0">
                    <h3
                      title={name}
                      className="truncate text-base font-bold leading-snug text-gray-900 transition-colors group-hover:text-brand-orange"
                    >
                      {name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs font-normal text-gray-400">{rank}</p>
                    <p className="truncate text-xs font-normal text-gray-400">{department}</p>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-semibold text-[#2e2a72]">
                        Completion Status
                      </span>
                      <span className="shrink-0 font-bold text-[#10b981]">
                        {percent != null ? `${percent}%` : '—'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      {completion?.approvedPct > 0 && (
                        <div
                          style={{ width: `${completion.approvedPct}%` }}
                          className="bg-[#10b981] transition-all duration-300"
                          title={`Approved: ${Math.round(completion.approvedPct)}%`}
                        />
                      )}
                      {completion?.pendingPct > 0 && (
                        <div
                          style={{ width: `${completion.pendingPct}%` }}
                          className="bg-amber-400 transition-all duration-300"
                          title={`Pending: ${Math.round(completion.pendingPct)}%`}
                        />
                      )}
                      {completion?.rejectedPct > 0 && (
                        <div
                          style={{ width: `${completion.rejectedPct}%` }}
                          className="bg-red-400 transition-all duration-300"
                          title={`Rejected: ${Math.round(completion.rejectedPct)}%`}
                        />
                      )}
                      {(!percent || percent === 0) && (!completion?.pendingPct && !completion?.rejectedPct) && (
                        <div className="w-full bg-gray-200" />
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectInstructor(inst);
                    }}
                    className="mt-3.5 w-full rounded-lg bg-brand-orange py-2 text-center text-xs font-bold uppercase tracking-wider text-white shadow-2xs transition hover:bg-orange-600 hover:shadow active:bg-orange-700"
                  >
                    VIEW
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && filteredInstructors.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100 text-[13px] text-gray-500">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredInstructors.length)} of{' '}
            {filteredInstructors.length} instructors
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 inline" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium border transition cursor-pointer ${p === currentPage
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 inline" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}