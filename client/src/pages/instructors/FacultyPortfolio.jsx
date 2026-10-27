import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Folder, MoreVertical, MessageSquare, FileText, Eye } from 'lucide-react';
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
        <Link to={href} className="group flex min-w-0 items-start gap-3">
          <span
            className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: card.accent }}
          />
          <h3 className="min-w-0 break-words text-base font-semibold leading-tight text-gray-900 group-hover:underline sm:text-lg">
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

function FacultyPortfolio() {
  const navigate = useNavigate();
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

  // Load live faculty summaries for requirement cards
  useEffect(() => {
    fetchFacultySummary()
      .then((sum) => setSummaries(sum || {}))
      .catch((err) => console.warn('Could not load faculty summaries:', err));
  }, []);

  // PDS: the saved PDS (null if none yet) and whether its upload popup is open
  const [pdsDoc, setPdsDoc] = useState(null);
  const [pdsOpen, setPdsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Loads the instructor's PDS from the server
  const loadPds = async () => {
    try {
      const docs = await fetchDocuments({ requirementKey: PDS_REQUIREMENT.key });
      setPdsDoc(docs?.[0] || null);
    } catch (err) {
      console.warn('Could not load PDS:', err);
    }
  };

  useEffect(() => {
    loadPds();
  }, []);

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

  // Compute progress: total approved files over total files submitted/in-review
  const { totalApproved, totalSubmitted, completionPercent } = useMemo(() => {
    let approved = 0;
    let submitted = 0;

    Object.values(summaries || {}).forEach((s) => {
      const a = Number(s?.approved) || 0;
      const p = Number(s?.pendingReview) || 0;
      const r = Number(s?.rejected) || 0;
      const d = Number(s?.draft) || 0;
      approved += a;
      submitted += a + p + r + d;
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

  const cardRows = [requirementCards.slice(0, 4), requirementCards.slice(4)];

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
            {pdsDoc && (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="w-full px-4 py-2 text-xs font-semibold text-brand-purple bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl shadow-xs transition text-center cursor-pointer flex items-center justify-center gap-1.5"
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
              className="w-full px-4 py-2 text-xs font-semibold text-white bg-brand-purple hover:bg-[#494673] rounded-xl shadow-xs transition text-center cursor-pointer"
            >
              {pdsDoc ? 'Replace PDS' : 'Upload PDS'}
            </button>
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