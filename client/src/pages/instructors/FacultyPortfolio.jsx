import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PlaceholderPage from '../../components/layout/PlaceholderPage';
import { fetchFacultySummary } from '../../api/documents';

// The Faculty Portfolio URL. Every card link is built from it.
const BASE_PATH = "/instructors/portfolio/faculty-portfolio";


//CHANGE THIS LIST TO ADD OR RENAME A CARD
const requirementCards = [
  {
    title: 'Educational Attainment',
    description: "TOR, Diploma or Certificate of Units Earned for your Bachelor's, Master's and PhD.",
    path: 'educational-attainment',
  },
  { title: 'Service Records', description: 'Upload your service records.', path: 'service-records' },
  {
    title: 'Seminars and Workshops',
    description: 'List of seminars and workshops with certificates, from August 2019 to present.',
    path: 'seminars-and-workshops',
  },
  { title: 'Achievements', description: 'Grants, Awards, Certification of Commendation', path: 'achievements' },
  {
    title: 'Research',
    description: 'Research proposals and finished or published research, with certificate of publication and abstract.',
    path: 'research',
  },
  {
    title: 'Extension Involvement',
    description: "Certificates of extension involvement, project leaders' training designs, or related proof.",
    path: 'extension-involvement',
  },
  {
    title: 'Production',
    description: "Certificates of Copyrighted IM's, Patent or utility model approved application 1st or 2nd certificate.",
    path: 'production',
  },
  {
    title: 'Other Requirements',
    description: 'Professional organization membership, passed licensure examinations and IPCR.',
    path: 'other-requirements',
  },
];


// ---------------------------------------------------------------------------------------------
// CARD DATA (the numbers on each card)
//
// EXPECTED BACKEND SHAPE: one object per requirement, keyed by the card's `path`.
//   {
//     'service-records': {
//       approved, pendingReview, rejected, draft,   // number of documents/entries in each status
//       required,    // optional: how many documents are expected in total (use it for fixed lists)
//       totalFiles,  // number of uploaded files
//       commentCount,// number of reviewer comments
//       previewed,   // true once a reviewer has opened/previewed the documents. Comments only show then
//     },
//   }
// Everything below is written so a missing, null or malformed value can never break a card.
// ---------------------------------------------------------------------------------------------

// Turns anything the backend sends (undefined, null, "3", -1, NaN) into a safe whole number.
function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

// Always returns a complete, clean summary, even if `raw` is missing or not an object.
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
    previewed: s.previewed === true, // strictly true; the string "false" must not count
  };
}

// The badge on each card. "Completed" means every document is approved, nothing else.
// PLACEHOLDER rule: how "complete" is decided for a list (service records, seminars...) is still an
// open client question. For now: at least one document, and all of them approved.
function getCardState(summary) {
  const total = Math.max(summary.required, summary.approved + summary.pendingReview + summary.rejected + summary.draft);

  if (total > 0 && summary.approved === total) return { key: 'completed', label: 'Completed' };
  if (summary.rejected > 0) return { key: 'needsAction', label: 'Needs action' };
  if (summary.pendingReview > 0) return { key: 'inReview', label: 'In review' };
  if (total === 0) return { key: 'notStarted', label: 'Not started' };
  return { key: 'inProgress', label: 'In progress' };
}

// Full class names are written out (not built from pieces) so Tailwind can find them.
const BADGE_STYLE = {
  completed: 'bg-green-100 text-green-700',
  needsAction: 'bg-red-100 text-red-700',
  inReview: 'bg-amber-100 text-amber-700',
  inProgress: 'bg-amber-100 text-amber-700',
  notStarted: 'bg-gray-200 text-gray-500',
};
// The line under the title and its dot share one colour per state:
// green = completed, yellow = in progress or in review, purple = anything else.
const LINE_STYLE = {
  completed: 'border-green-500',
  inProgress: 'border-amber-400',
  inReview: 'border-amber-400',
  default: 'border-brand-purple',
};
const DOT_STYLE = {
  completed: 'bg-green-500',
  inProgress: 'bg-amber-400',
  inReview: 'bg-amber-400',
  default: 'bg-brand-purple',
};

const iconProps = {
  viewBox: '0 0 24 24',
  width: 14,
  height: 14,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

function RequirementCard({ card, summary }) {
  const state = getCardState(summary);
  const lineStyle = LINE_STYLE[state.key] ?? LINE_STYLE.default;
  const dotStyle = DOT_STYLE[state.key] ?? DOT_STYLE.default;

  return (
    <Link
      to={`${BASE_PATH}/${card.path}`}
      className="flex min-h-44 flex-col rounded-md bg-gray-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <h3
        className={`flex items-center gap-2 border-b-3 pb-2 text-base font-medium text-brand-purple ${lineStyle}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotStyle}`} aria-hidden="true" />
        {card.title}
      </h3>

      <p className="mt-3 flex-1 text-xs leading-5 text-brand-gray">{card.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-gray-500">
        <span className={`rounded px-2.5 py-1 font-medium ${BADGE_STYLE[state.key]}`}>{state.label}</span>

        {/* comments only show once a reviewer has previewed the documents */}
        {summary.previewed && (
          <span className="ml-auto inline-flex items-center gap-1">
            <svg {...iconProps}>
              <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
            </svg>
            {summary.commentCount} {summary.commentCount === 1 ? 'comment' : 'comments'}
          </span>
        )}

        <span className={`inline-flex items-center gap-1 ${summary.previewed ? '' : 'ml-auto'}`}>
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

function FacultyPortfolio() {
  const [summaries, setSummaries] = useState({});

  useEffect(() => {
    fetchFacultySummary()
      .then((data) => setSummaries(data || {}))
      .catch((err) => console.error('Failed to load faculty summaries:', err));
  }, []);

  return (
    <div className="space-y-5">
      <PlaceholderPage title="Faculty Portfolio" />

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
    
          {/* Left Column (Compliance */}
          <section className="col-span-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-indigo-900">Portfolio</h2>
            {/* ADD CONTENT HERE */}
            </section>

          {/* Right Column (Completion Status)*/}
          <section className="col-span-1 rounded-lg border border-gray-200 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center">
            <h2 className="text-lg font-semibold text-indigo-900">Completion Status</h2>
            {/* ADD CONTENT HERE */}
          </section>

      </div>


        {/* BOTTOM CARDS */}

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-medium text-brand-purple">Portfolio Content</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {requirementCards.map((card) => (
            <RequirementCard key={card.path} card={card} summary={normalizeSummary(summaries?.[card.path])} />
          ))}
        </div>
      </section>


    </div>
  );
}

export default FacultyPortfolio;