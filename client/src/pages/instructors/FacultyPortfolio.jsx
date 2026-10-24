import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import PlaceholderPage from '../../components/layout/PlaceholderPage';
import UploadModal from '../../components/documentActions/UploadModal';
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

//CHANGE THIS LIST TO ADD OR RENAME A CARD
const requirementCards = [
  {
    title: 'Educational Attainment',
    description: "TOR, Diploma or Certificate of Units Earned for your Bachelor's, Master's and PhD.",
    path: 'educational-attainment',
    accent: '#6aaa64',
  },
  { title: 'Service Records', description: 'Upload your service records.', path: 'service-records', accent: '#f0a93b' },
  {
    title: 'Seminars and Workshops',
    description: 'List of seminars and workshops with certificates, from August 2019 to present.',
    path: 'seminars-and-workshops',
    accent: '#4b4687',
  },
  { title: 'Achievements', description: 'Grants, Awards, Certification of Commendation', path: 'achievements', accent: '#ef6c35' },
  {
    title: 'Research',
    description: 'Research proposals and finished or published research, with certificate of publication and abstract.',
    path: 'research',
    accent: '#6aaa64',
  },
  {
    title: 'Extension Involvement',
    description: "Certificates of extension involvement, project leaders' training designs, or related proof.",
    path: 'extension-involvement',
    accent: '#6aaa64',
  },
  {
    title: 'Production',
    description: "Certificates of Copyrighted IM's, Patent or utility model approved application 1st or 2nd certificate.",
    path: 'production',
    accent: '#6aaa64',
  },
  {
    title: 'Other Requirements',
    description: 'Professional organization membership, passed licensure examinations and IPCR.',
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

function getCardState(summary) {
  const total = Math.max(summary.required, summary.approved + summary.pendingReview + summary.rejected + summary.draft);

  if (total > 0 && summary.approved === total) return { key: 'completed', label: 'Completed' };
  if (summary.rejected > 0) return { key: 'needsAction', label: 'Needs revision' };
  if (summary.pendingReview > 0) return { key: 'inReview', label: 'For review' };
  if (total === 0) return { key: 'notStarted', label: 'No documents' };
  return { key: 'inProgress', label: 'In progress' };
}

// Status pill (soft tinted background, same hue as the card accent)
const BADGE_STYLE = {
  completed: 'bg-[#dcefd6] text-[#5d9a54]',
  needsAction: 'bg-red-100 text-red-600',
  inReview: 'bg-amber-100 text-amber-700',
  inProgress: 'bg-orange-100 text-orange-600',
  notStarted: 'bg-gray-200 text-gray-500',
};

// Thick underline under the card title
const LINE_STYLE = {
  completed: 'bg-green-500',
  needsAction: 'bg-red-400',
  inReview: 'bg-amber-400',
  inProgress: 'bg-orange-400',
  notStarted: 'bg-gray-300',
};

const DOT_STYLE = {
  completed: 'bg-green-500',
  needsAction: 'bg-red-500',
  inReview: 'bg-amber-500',
  inProgress: 'bg-orange-500',
  notStarted: 'bg-gray-400',
};

const iconProps = {
  viewBox: '0 0 24 24',
  width: 15,
  height: 15,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

function RequirementCard({ card, summary }) {
  const state = getCardState(summary);

  return (
    <Link
      to={`${BASE_PATH}/${card.path}`}
      className="group flex min-h-52 flex-col rounded-xl bg-[#f5f5f5] p-5 transition hover:bg-[#efefef]"
    >
      {/* Title row + kebab menu */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2.5 text-[17px] font-medium leading-snug text-gray-900">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_STYLE[state.key]}`} aria-hidden="true" />
          {card.title}
        </h3>
        <button
          type="button"
          aria-label={`More options for ${card.title}`}
          onClick={(e) => {
            // Don't navigate when the menu button is clicked. Hook up your menu here.
            e.preventDefault();
            e.stopPropagation();
          }}
          className="shrink-0 rounded p-1 text-gray-700 hover:bg-gray-200"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
          </svg>
        </button>
      </div>

      {/* Status-colored underline */}
      <div className={`mt-3 h-[3px] w-full rounded-full ${LINE_STYLE[state.key]}`} aria-hidden="true" />

      <p className="mt-4 flex-1 text-[15px] leading-snug text-gray-500">{card.description}</p>

      {/* Footer: status pill, comments, files */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-gray-500">
        <span className={`rounded-md px-3 py-1 font-medium ${BADGE_STYLE[state.key]}`}>{state.label}</span>

        {summary.previewed && (
          <span className="ml-auto inline-flex items-center gap-1.5">
            <svg {...iconProps}>
              <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
            </svg>
            {summary.commentCount} {summary.commentCount === 1 ? 'comment' : 'comments'}
          </span>
        )}

        <span className={`inline-flex items-center gap-1.5 ${summary.previewed ? '' : 'ml-auto'}`}>
          <svg {...iconProps}>
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" />
          </svg>
          {summary.totalFiles} {summary.totalFiles === 1 ? 'file' : 'files'}
        </span>
      </div>
    </Link>
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
  const [summaries, setSummaries] = useState({});
  const [instructorData, setInstructorData] = useState(null);

  // PDS: the saved PDS (null if none yet) and whether its upload popup is open
  const [pdsDoc, setPdsDoc] = useState(null);
  const [pdsOpen, setPdsOpen] = useState(false);

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

  const location = useLocation();

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


  return (
    <div className="space-y-5">
      <PlaceholderPage title="Faculty Portfolio" />

      {/* TOP CARDS */}
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
              <h3 className="break-words text-lg font-semibold leading-snug text-gray-900">{fullName}</h3>
              <p className="mt-0.5 break-words text-xs text-gray-500">{position}</p>
              <p className="break-words text-xs text-gray-500">{department}</p>
            </div>

            {/* Middle Details: Contact Information & Educational Background */}
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-6 border-t border-gray-200 pt-5 @md:grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] @xl:border-l @xl:border-t-0 @xl:pl-6 @xl:pt-0">
              {/* Contact Information */}
              <div className="min-w-0">
                <h4 className="mb-1 border-b border-gray-200 pb-2 text-base font-medium text-gray-900">
                  Contact information
                </h4>
                <InfoRow label="Email">{email}</InfoRow>
                <InfoRow label="Phone">{phone}</InfoRow>
                <InfoRow label="Address">{address}</InfoRow>
              </div>

              {/* Educational Background */}
              <div className="min-w-0">
                <h4 className="mb-1 border-b border-gray-200 pb-2 text-base font-medium text-gray-900">
                  Educational background
                </h4>
                {educationList.length > 0 ? (
                  educationList.slice(0, 2).map((edu, idx) => (
                    <div key={idx} className="border-b border-gray-200 py-2.5 last:border-b-0">
                      <p className="break-words text-sm font-medium text-gray-900">{edu.degree || edu.level || 'Degree'}</p>
                      <p className="break-words text-xs text-gray-500">
                        {edu.school || 'University'}
                        {edu.yearGraduated ? ` · ${edu.yearGraduated}` : ''}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="py-2.5 text-sm italic text-gray-400">No education details recorded yet.</p>
                )}
              </div>
            </div>

            {/* Actions: Edit Profile & PDS */}
            <div className="flex w-full shrink-0 flex-col justify-start gap-3 border-t border-gray-100 pt-4 sm:flex-row @xl:w-36 @xl:flex-col @xl:border-t-0 @xl:pt-0">
              <button
                type="button"
                onClick={() => navigate('/instructors/profile')}
                className="w-full cursor-pointer rounded-lg bg-brand-orange px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-orange-600 sm:text-base"
              >
                Edit Profile
              </button>
              {/* PDS button: "Upload PDS" when none, "Replace PDS" after. Always enabled, so the
                  instructor can reupload at any time (the server keeps the old file as a version). */}
              <button
                type="button"
                onClick={() => setPdsOpen(true)}
                className="w-full cursor-pointer rounded-lg bg-brand-purple px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#494673] sm:text-base"
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

      {/* BOTTOM CARDS */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f0eff7]">
            <svg className="h-5 w-5 text-brand-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </span>
          <h2 className="text-2xl font-medium text-brand-purple">Portfolio Content</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {requirementCards.map((card) => (
            <RequirementCard
              key={card.path}
              card={card}
              summary={normalizeSummary(summaries?.[card.path])}
            />
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
    </div>
  );
}

export default FacultyPortfolio;