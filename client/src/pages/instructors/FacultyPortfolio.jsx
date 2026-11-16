import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Folder, MoreVertical, MessageSquare, FileText, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import PlaceholderPage from '../../components/layout/PlaceholderPage';
import UploadModal from '../../components/documentActions/UploadModal';
import PreviewModal from '../../components/documentActions/PreviewModal';
import { fetchDocuments, fetchFacultySummary } from '../../api/documents';

// The Faculty Portfolio URL. Every card link is built from it.
const BASE_PATH = "/instructors/portfolio/faculty-portfolio";

// PDS SETTINGS: the PDS is ONE file per instructor, so there are no popup fields (metaFields is empty).
// key must match the requirement key in the database seed.
const PDS_REQUIREMENT = {
  key: 'FAC_A_PDS',
  label: 'Personal Data Sheet (PDS)',
  card: 'Faculty Profile',
  multiple: false,
  metaFields: [],
};

// CHANGE THIS LIST TO ADD OR RENAME A CARD
// accent = dot + underline color of the card (matches ReviewFacultyPortfolio)
const requirementCards = [
  {
    title: 'Educational Attainment',
    description: "Upload your transcript of records, diploma, or certificate of units earned for your bachelor's, master's, and doctoral degrees.",
    path: 'educational-attainment',
    accent: '#6aaa64',
  },
  {
    title: 'Service Records',
    description: 'Upload your official service records.',
    path: 'service-records',
    accent: '#6aaa64',
  },
  {
    title: 'Seminars and Workshops',
    description:
      'Upload certificates for seminars and workshops attended from August 2019 to the present. Add new records as you attend more.',
    path: 'seminars-and-workshops',
    accent: '#6aaa64',
  },
  {
    title: 'Achievements',
    description: 'Upload documents supporting your grants, awards, and certificates of commendation.',
    path: 'achievements',
    accent: '#6aaa64',
  },
  {
    title: 'Research',
    description:
      'Upload your research proposals and completed or published studies. Include the abstract and certificate of publication, when applicable.',
    path: 'research',
    accent: '#6aaa64',
  },
  {
    title: 'Extension Involvement',
    description:
      'Upload certificates or other evidence of extension involvement, including training designs for projects you lead.',
    path: 'extension-involvement',
    accent: '#6aaa64',
  },
  {
    title: 'Production',
    description:
      'Upload certificates for copyrighted instructional materials, patents, or approved utility model applications, including first- or second-stage certificates.',
    path: 'production',
    accent: '#6aaa64',
  },
  {
    title: 'Other Requirements',
    description: 'Upload proof of membership in your professional organizations, such as a membership certificate or form.',
    path: 'other-requirements',
    accent: '#6aaa64',
  },
];

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function normalizeSummary(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    approved: toCount(s.approved),
    pendingReview: toCount(s.pendingReview),
    rejected: toCount(s.rejected),
    draft: toCount(s.draft),
    required: toCount(s.required),
    totalFiles: toCount(s.totalFiles),
    commentCount: toCount(s.commentCount),
    previewed: s.previewed === true,
  };
}

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

function PortfolioCard({ card, summary, menuOpen, onToggleMenu, onCloseMenu }) {
  const approved = summary.approved || 0;
  const pending = summary.pendingReview || 0;
  const rejected = summary.rejected || 0;
  const files = summary.totalFiles ?? approved + pending + rejected;
  const comments = summary.comments ?? summary.commentCount ?? 0;
  const status = statusStyles[getCardStatus({ approved, pending, rejected })];
  const href = `${BASE_PATH}/${card.path}`;

  return (
    <div className="relative flex h-full min-w-0 flex-col rounded-xl bg-[#f5f5f5] px-4 pt-5 pb-4 sm:px-5 sm:pt-6 sm:pb-5 min-h-[220px]">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <Link to={href} className="group flex min-w-0 items-start gap-3 no-underline hover:no-underline">
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
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple transition cursor-pointer"
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
                Open requirement
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Accent underline */}
      <div className="mt-3 h-[3px] w-full rounded-full" style={{ backgroundColor: card.accent }} />

      {/* Description */}
      <Link
        to={href}
        className="mt-4 flex-1 !no-underline sm:mt-5"
        style={{ textDecoration: 'none' }}
      >
        <p className="break-words text-sm leading-snug text-gray-500 no-underline hover:no-underline sm:text-[15px]">
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

// One label/value line with a thin divider underneath (contact info)
function InfoRow({ label, children }) {
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-2 border-b border-gray-200 py-2.5 text-sm last:border-b-0 sm:grid-cols-[72px_minmax(0,1fr)]">
      <span className="text-gray-500">{label}</span>
      <span className="min-w-0 font-medium text-gray-900 [overflow-wrap:anywhere] break-words">{children}</span>
    </div>
  );
}

function FacultyPortfolio() {
  const navigate = useNavigate();
  const location = useLocation();
  const [summaries, setSummaries] = useState({});
  const [instructorData, setInstructorData] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  // Close the card menu when clicking elsewhere
  useEffect(() => {
    if (!openMenu) return undefined;
    const close = () => setOpenMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenu]);

  // PDS: the saved PDS (null if none yet) and whether its upload popup is open
  const [pdsDoc, setPdsDoc] = useState(null);
  const [pdsOpen, setPdsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showOverview, setShowOverview] = useState(true);

  // Loads the instructor's PDS from the server
  const loadPds = async () => {
    try {
      const docs = await fetchDocuments({ requirementKey: PDS_REQUIREMENT.key });
      setPdsDoc(docs?.[0] || null);
    } catch (err) {
      console.warn('Could not load PDS:', err);
    }
  };

  // Loads card summaries and progress from the server
  const loadSummary = async () => {
    try {
      const data = await fetchFacultySummary();
      if (data) setSummaries(data);
    } catch (err) {
      console.warn('Could not load faculty summary:', err);
    }
  };

  // Re-fetch every time the user lands on (or returns to) this page
  useEffect(() => {
    loadPds();
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  useEffect(() => {
    // Fetch user profile info
    fetch('/api/profile/me', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setInstructorData(data);
      })
      .catch((err) => console.warn('Could not load profile header:', err));
  }, []);

  // Compute completion exactly matching ReviewFacultyPortfolio (category-weighted)
  const completion = useMemo(() => {
    return computeCompletion(summaries || {});
  }, [summaries]);

  const completionPercent = completion.percent;
  const { counts } = completion;
  const uploaded = counts ? counts.approved + counts.pending + counts.rejected : 0;

  const completionMessage =
    completionPercent >= 100
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

  const profile = instructorData?.profile || {};
  const profileFullName = [profile.firstName, profile.middleName, profile.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const fullName = profileFullName || instructorData?.fullName || 'Instructor';
  const department = instructorData?.department || 'IT Department';
  const position = profile.position || profile.rank || 'Faculty Member';
  const email = instructorData?.email || '—';
  const phone = profile.contactNumber || '—';
  const address = profile.address || '—';
  const educationList = Array.isArray(profile.education) ? profile.education : [];

  const cardRows = [requirementCards.slice(0, 4), requirementCards.slice(4)];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PlaceholderPage title="Faculty Portfolio" />

        <button
          type="button"
          onClick={() => setShowOverview((prev) => !prev)}
          aria-expanded={showOverview}
          className={`inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer shadow-2xs ${
            showOverview
              ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              : 'bg-brand-orange text-white hover:bg-orange-600 shadow-sm'
          }`}
        >
          {showOverview ? (
            <>
              <ChevronUp size={16} className="text-gray-500 transition-transform duration-300" />
              <span>Hide Profile & Status</span>
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              <span>Show Profile & Status</span>
            </>
          )}
        </button>
      </div>

      {/* TOP CARDS COLLAPSIBLE WRAPPER */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          showOverview
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 2xl:grid-cols-[minmax(0,1fr)_520px]">
            {/* Left Column: Faculty Profile Summary Card */}
            <section className="@container min-w-0">
              <div className="flex h-full min-w-0 flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 @xl:flex-row @xl:items-start">
                {/* Avatar and Basic Role */}
                <div className="flex w-full shrink-0 flex-col items-center text-center @xl:w-44">
                  <div className="mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-amber-300 sm:h-28 sm:w-28">
                    {profile.photoUrl ? (
                      <img src={profile.photoUrl} alt={fullName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-amber-800">
                        {fullName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-semibold text-gray-900 sm:text-lg">{fullName}</h2>
                  <p className="text-xs text-gray-500 sm:text-sm">{department}</p>
                  <p className="text-xs text-gray-500 sm:text-sm">{position}</p>
                </div>

                {/* Profile Details (divided) */}
                <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch border-t border-gray-100 pt-4 @xl:border-t-0 @xl:border-l @xl:border-gray-200 @xl:pl-6 @xl:pt-0">
                  <div>
                    <InfoRow label="Email">{email}</InfoRow>
                    <InfoRow label="Phone">{phone}</InfoRow>
                    <InfoRow label="Address">{address}</InfoRow>
                  </div>

                  {/* Educational Attainment block */}
                  <div className="mt-4 border-t border-gray-200 pt-3">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Educational Attainment
                    </span>
                    {educationList.length > 0 ? (
                      <ul className="mt-2 divide-y divide-gray-100 text-sm">
                        {educationList.map((item, idx) => (
                          <li key={idx} className="py-2.5 first:pt-1 last:pb-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-semibold text-gray-900">{item.degree || 'Degree'}</span>
                              <span className="text-xs text-gray-400">{item.year || ''}</span>
                            </div>
                            <div className="text-xs text-gray-500">{item.institution || ''}</div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="py-2.5 text-sm italic text-gray-400">No education details recorded yet.</p>
                    )}
                  </div>
                </div>

                {/* Actions: Edit Profile & PDS */}
                <div className="flex w-full shrink-0 flex-col justify-start gap-2.5 border-t border-gray-100 pt-4 sm:flex-row @xl:w-36 @xl:flex-col @xl:border-t-0 @xl:pt-0">
                  <button
                    type="button"
                    onClick={() => navigate('/instructors/profile')}
                    className="w-full cursor-pointer rounded-lg bg-brand-orange px-4 py-2 text-center text-xs font-semibold text-white transition hover:bg-orange-600 sm:text-sm"
                  >
                    Edit Profile
                  </button>
                  {pdsDoc && (
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-center text-xs font-semibold text-brand-purple shadow-xs transition hover:bg-purple-100 sm:text-sm"
                    >
                      <Eye size={14} />
                      View PDS
                    </button>
                  )}
                  {/* PDS button: "Upload PDS" when none, "Replace PDS" after. Always enabled, so the
                      instructor can reupload at any time (the server keeps the old file as a version). */}
                  <button
                    type="button"
                    onClick={() => setPdsOpen(true)}
                    className="w-full cursor-pointer rounded-lg bg-brand-purple px-4 py-2 text-center text-xs font-semibold text-white transition hover:bg-[#494673] sm:text-sm"
                  >
                    {pdsDoc ? 'Replace PDS' : 'Upload PDS'}
                  </button>
                </div>
              </div>
            </section>

            {/* Right Column: Completion Status Progress Card matching ReviewFacultyPortfolio */}
            <section className="@container min-w-0">
              <div className="flex h-full min-w-0 flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
                <h2 className="text-lg font-medium text-brand-purple sm:text-2xl">Completion Status</h2>

                <div className="flex flex-1 flex-col gap-5 @md:flex-row @md:items-center">
                  <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                    <p className="text-5xl font-extrabold leading-none text-[#6aaa64] sm:text-6xl @md:text-7xl">
                      {completionPercent}%
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
            </section>
          </div>
        </div>
      </div>

      {/* BOTTOM CARDS */}
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
                    summary={summaries?.[card.path] || {}}
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

      {/* PDS upload popup: file picker only (Add or Replace) */}
      <UploadModal
        isOpen={pdsOpen}
        onClose={() => setPdsOpen(false)}
        requirement={PDS_REQUIREMENT}
        existingDoc={pdsDoc}
        onSuccess={() => loadPds()}
      />

      {/* PDS preview modal */}
      <PreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        document={pdsDoc}
        onEdit={() => {
          setPreviewOpen(false);
          setPdsOpen(true);
        }}
      />
    </div>
  );
}

export default FacultyPortfolio;
