// client/src/pages/admin/ReviewFacultyPortfolio.jsx
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  ArrowLeft,
  Folder,
  MoreVertical,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { fetchFacultySummary } from '../../api/documents';

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
    accent: '#f0a93b',
  },
  {
    title: 'Seminars and Workshops',
    description:
      'List of seminars and workshops with certificates, from August 2019 to present. Add new ones as you attend.',
    path: 'seminars-and-workshops',
    accent: '#4b4687',
  },
  {
    title: 'Achievements',
    description: 'Grants, Awards, Certification of Commendation.',
    path: 'achievements',
    accent: '#ef6c35',
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
    title: 'Professional Organization',
    description: 'Sample copy of your professional membership form.',
    path: 'other-requirements',
    accent: '#6aaa64',
  },
];

// Status chip styles for each card
const statusStyles = {
  completed: { label: 'Completed', className: 'bg-[#dcefd6] text-[#5d9a54]' },
  review: { label: 'For review', className: 'bg-amber-100 text-amber-700' },
  rejected: { label: 'Needs revision', className: 'bg-red-100 text-red-600' },
  empty: { label: 'No documents', className: 'bg-gray-200 text-gray-500' },
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

function PortfolioCard({ card, summary, instructorId, menuOpen, onToggleMenu, onCloseMenu }) {
  const approved = summary.approved || 0;
  const pending = summary.pendingReview || 0;
  const rejected = summary.rejected || 0;
  const files = summary.totalFiles ?? approved + pending + rejected;
  const comments = summary.comments ?? summary.commentCount ?? 0;
  const status = statusStyles[getCardStatus({ approved, pending, rejected })];
  const href = `/admin/portfolio/faculty-portfolio/${card.path}?instructorId=${instructorId}`;

  return (
    <div className="relative flex h-full min-w-0 flex-col rounded-xl bg-[#f5f5f5] px-4 pt-5 pb-4 sm:px-5 sm:pt-6 sm:pb-5 min-h-[220px]">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <Link to={href} className="group flex min-w-0 items-start gap-3">
          <span
            className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: card.accent }}
          />
          <h3 className="min-w-0 break-words text-base font-semibold leading-tight text-gray-900 sm:text-lg">
            {card.title}
          </h3>
        </Link>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label={`${card.title} options`}
            aria-expanded={menuOpen}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple transition"
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-10 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <Link
                to={href}
                onClick={onCloseMenu}
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Open and review
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Accent underline */}
      <div className="mt-3 h-[3px] w-full rounded-full" style={{ backgroundColor: card.accent }} />

      {/* Description */}
      <Link to={href} className="mt-4 flex-1 sm:mt-5">
        <p className="break-words text-sm leading-snug text-gray-500 sm:text-[15px]">
          {card.description}
        </p>
      </Link>

      {/* Footer: wraps instead of overlapping on narrow cards */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:mt-5">
        <span
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium sm:text-sm ${status.className}`}
        >
          {status.label}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 sm:text-sm">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <MessageSquare size={15} className="shrink-0" />
            {comments} {comments === 1 ? 'comment' : 'comments'}
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <FileText size={15} className="shrink-0" />
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


export default function ReviewFacultyPortfolio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const instructorId = searchParams.get('instructorId');

  const [instructors, setInstructors] = useState([]);
  // { [instructorId]: { [categoryPath]: { approved, pendingReview, rejected, ... } } }
  const [summariesById, setSummariesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [viewBy, setViewBy] = useState('all');
  const [openMenu, setOpenMenu] = useState(null);

  // Load list of instructors
  useEffect(() => {
    fetch('http://localhost:5000/api/instructors')
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

  // Load summary for selected instructor
  useEffect(() => {
    let isCurrent = true;
    if (instructorId) {
      fetchFacultySummary(instructorId)
        .then((sum) => {
          if (isCurrent) setSummariesById((prev) => ({ ...prev, [instructorId]: sum || {} }));
        })
        .catch((err) => console.error('Failed to load portfolio summaries:', err));
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
      // Show instructors only; exclude Administrators
      if (inst.accountType === 'Administrator') return false;

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
      const percent = completion.percent;
      const { counts } = completion;
      const uploaded = counts ? counts.approved + counts.pending + counts.rejected : null;

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

      // Two rows of four cards, separated by a divider (matches the prototype)
      const cardRows = [requirementCards.slice(0, 4), requirementCards.slice(4)];

      return (
        <div className="min-w-0 space-y-4 sm:space-y-6">
          {/* Page title */}
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
            <h1 className="min-w-0 text-2xl font-semibold text-brand-purple sm:text-3xl">
              Faculty Portfolio Review
            </h1>
          </div>

    {/* Profile + completion: side by side only when there is really room (2xl), stacked otherwise */}
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

              {pdsUrl ? (
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

      {/* Portfolio content */}
      <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-3 sm:mb-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#efeef8] text-brand-purple">
            <Folder size={20} />
          </span>
          <h2 className="min-w-0 text-xl font-medium text-brand-purple sm:text-2xl">
            Portfolio Content
          </h2>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {cardRows.map((row, rowIndex) => (
            <div key={rowIndex}>
              {rowIndex > 0 && <hr className="mb-4 border-gray-200 sm:mb-6" />}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
                {row.map((card) => (
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
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
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
  <div className="relative shrink-0 sm:w-44 lg:w-48">
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
</div>

      {/* Cards Grid */}
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
              onClick={() => {
                setSearchQuery('');
                setDepartmentFilter('all');
                setViewBy('all');
              }}
              className="mt-4 inline-flex items-center rounded-lg bg-purple-50 px-4 py-2 text-xs font-semibold text-brand-purple transition hover:bg-purple-100"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className={instructorGridClass}>
          {filteredInstructors.map((inst) => {
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
    </div>
  );
}