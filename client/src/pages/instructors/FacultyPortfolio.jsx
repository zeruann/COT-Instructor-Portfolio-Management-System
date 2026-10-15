import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PlaceholderPage from '../../components/layout/PlaceholderPage';
import { fetchFacultySummary, fetchRequirement, fetchDocuments } from '../../api/documents';
import UploadModal from '../../components/documentActions/UploadModal';
import PreviewModal from '../../components/documentActions/PreviewModal';
import { Eye, UploadCloud } from 'lucide-react';

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

function getCardState(summary) {
  const total = Math.max(summary.required, summary.approved + summary.pendingReview + summary.rejected + summary.draft);

  if (total > 0 && summary.approved === total) return { key: 'completed', label: 'Completed' };
  if (summary.rejected > 0) return { key: 'needsAction', label: 'Needs action' };
  if (summary.pendingReview > 0) return { key: 'inReview', label: 'In review' };
  if (total === 0) return { key: 'notStarted', label: 'Not started' };
  return { key: 'inProgress', label: 'In progress' };
}

const BADGE_STYLE = {
  completed: 'bg-green-100 text-green-700',
  needsAction: 'bg-red-100 text-red-700',
  inReview: 'bg-amber-100 text-amber-700',
  inProgress: 'bg-amber-100 text-amber-700',
  notStarted: 'bg-gray-200 text-gray-500',
};

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
      className="flex min-h-44 flex-col rounded-xl bg-gray-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md border border-gray-100"
    >
      <h3
        className={`flex items-center gap-2 border-b-2 pb-2 text-sm font-semibold text-brand-purple ${lineStyle}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotStyle}`} aria-hidden="true" />
        {card.title}
      </h3>

      <p className="mt-3 flex-1 text-xs leading-5 text-gray-500">{card.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-gray-500">
        <span className={`rounded-md px-2 py-0.5 font-medium ${BADGE_STYLE[state.key]}`}>{state.label}</span>

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
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState({});
  const [instructorData, setInstructorData] = useState(null);
  const [pdsModalOpen, setPdsModalOpen] = useState(false);
  const [pdsPreviewOpen, setPdsPreviewOpen] = useState(false);
  const [pdsDoc, setPdsDoc] = useState(null);
  const [pdsRequirement, setPdsRequirement] = useState(null);

  const loadSummaries = () => {
    fetchFacultySummary()
      .then((data) => setSummaries(data || {}))
      .catch((err) => console.error('Failed to load faculty summaries:', err));
  };

  const loadPdsDoc = () => {
    fetchDocuments({ requirementKey: 'FAC_A_PDS' })
      .then((docs) => {
        if (Array.isArray(docs) && docs.length > 0) {
          setPdsDoc(docs[0]);
        } else {
          setPdsDoc(null);
        }
      })
      .catch((err) => console.warn('Could not load PDS document:', err));
  };

  useEffect(() => {
    loadSummaries();
    loadPdsDoc();

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

    // Fetch PDS requirement details for UploadModal
    fetchRequirement('FAC_A_PDS')
      .then((req) => setPdsRequirement(req))
      .catch(() => {
        setPdsRequirement({
          key: 'FAC_A_PDS',
          card: 'Faculty Profile (Updated PDS)',
          label: 'Updated PDS (Personal Data Sheet)',
          multiple: false,
        });
      });
  }, []);

  // Compute progress: total approved files over total files submitted/in-review
  const { totalApproved, totalSubmitted, completionPercent } = useMemo(() => {
    let approved = 0;
    let submitted = 0;

    Object.values(summaries || {}).forEach((s) => {
      const norm = normalizeSummary(s);
      approved += norm.approved;
      submitted += norm.approved + norm.pendingReview + norm.rejected + norm.draft;
    });

    const percent = submitted > 0 ? Math.round((approved / submitted) * 100) : 0;
    return {
      totalApproved: approved,
      totalSubmitted: submitted,
      completionPercent: percent,
    };
  }, [summaries]);

  const profile = instructorData?.profile || {};
  const fullName = instructorData?.fullName || 'Instructor';
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
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        {/* Left Column: Faculty Profile Summary Card */}
        <section className="col-span-1 lg:col-span-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar and Basic Role */}
          <div className="flex flex-col items-center text-center shrink-0 w-44">
            <div className="w-24 h-24 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center overflow-hidden shadow-xs mb-3">
              {profile.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-amber-700">
                  {fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-gray-900 leading-snug">{fullName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{position}</p>
            <p className="text-xs font-medium text-brand-purple mt-0.5">{department}</p>
          </div>

          {/* Middle Details: Contact Information & Educational Background */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 w-full">
            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Contact information
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">Email</span>
                  <span className="text-gray-800 font-medium break-all">{email}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Phone</span>
                  <span className="text-gray-800 font-medium">{phone}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Address</span>
                  <span className="text-gray-800 font-medium">{address}</span>
                </div>
              </div>
            </div>

            {/* Educational Background */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Educational background
              </h4>
              <div className="space-y-2.5 text-xs">
                {educationList.length > 0 ? (
                  educationList.slice(0, 2).map((edu, idx) => (
                    <div key={idx}>
                      <p className="font-semibold text-gray-800">
                        {edu.degree || edu.level || 'Degree'}
                      </p>
                      <p className="text-gray-400 text-[11px]">
                        {edu.school || 'University'}{edu.yearGraduated ? ` • ${edu.yearGraduated}` : ''}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-xs italic">No education details recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions: Edit Profile & Updated PDS / View PDS Buttons */}
          <div className="flex flex-col gap-2.5 shrink-0 w-full sm:w-auto md:w-36 self-stretch justify-start">
            <button
              type="button"
              onClick={() => navigate('/instructors/profile')}
              className="w-full px-4 py-2 text-xs font-semibold text-white bg-brand-orange hover:bg-orange-600 rounded-xl shadow-xs transition text-center cursor-pointer"
            >
              Edit Profile
            </button>
            {pdsDoc ? (
              <button
                type="button"
                onClick={() => setPdsPreviewOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-purple hover:bg-[#494673] rounded-xl shadow-xs transition text-center cursor-pointer"
                title="View uploaded Personal Data Sheet"
              >
                <Eye className="w-3.5 h-3.5" />
                View PDS
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPdsModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-purple hover:bg-[#494673] rounded-xl shadow-xs transition text-center cursor-pointer"
                title="Upload Personal Data Sheet"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload PDS
              </button>
            )}
          </div>
        </section>

        {/* Right Column: Completion Status Progress Card */}
        <section className="col-span-1 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs flex flex-col items-center justify-center text-center">
          <h3 className="text-sm font-semibold text-gray-600">Completion Status</h3>
          <p className="mt-2 text-6xl font-extrabold tracking-tight text-[#48b560]">
            {completionPercent}%
          </p>
          <p className="mt-3 text-xs text-gray-500 max-w-[200px] leading-relaxed">
            {completionPercent === 100
              ? 'Your portfolio has been verified and approved!'
              : totalSubmitted === 0
              ? 'No files submitted yet.'
              : `${totalApproved} of ${totalSubmitted} files approved.`}
          </p>
        </section>
      </div>

      {/* BOTTOM CARDS */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-brand-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h2 className="text-base font-bold text-gray-800">Portfolio Content</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {requirementCards.map((card) => (
            <RequirementCard
              key={card.path}
              card={card}
              summary={normalizeSummary(summaries?.[card.path])}
            />
          ))}
        </div>
      </section>

      {/* Upload PDS Modal */}
      {pdsModalOpen && (
        <UploadModal
          isOpen={pdsModalOpen}
          onClose={() => setPdsModalOpen(false)}
          onSuccess={() => {
            setPdsModalOpen(false);
            loadSummaries();
            loadPdsDoc();
          }}
          existingDoc={pdsDoc}
          requirement={
            pdsRequirement || {
              key: 'FAC_A_PDS',
              card: 'Faculty Profile (Updated PDS)',
              label: 'Updated PDS (Personal Data Sheet)',
              multiple: false,
            }
          }
        />
      )}

      {/* Preview PDS Modal with Edit / Re-upload button */}
      {pdsPreviewOpen && pdsDoc && (
        <PreviewModal
          isOpen={pdsPreviewOpen}
          onClose={() => setPdsPreviewOpen(false)}
          document={pdsDoc}
          isAdmin={false}
          onEdit={() => {
            setPdsPreviewOpen(false);
            setPdsModalOpen(true);
          }}
        />
      )}
    </div>
  );
}

export default FacultyPortfolio;