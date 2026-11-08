import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Folder,
  LayoutGrid,
  List,
  MoreVertical,
  MessageSquare,
  FileText,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { fetchClassById } from '../../api/classes';
import { CLASS_REQUIREMENT_CARDS } from '../instructors/ViewClassPortfolio';

const statusStyles = {
  completed: { label: 'Completed', className: 'bg-[#dcefd6] text-[#5d9a54]' },
  review: { label: 'For review', className: 'bg-amber-100 text-amber-700' },
  rejected: { label: 'Needs revision', className: 'bg-red-100 text-red-600' },
  empty: { label: 'No documents', className: 'bg-gray-200 text-gray-500' },
};

function RequirementCard({ card, basePath, summary = {} }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const comments = summary.comments ?? 0;
  const files = summary.totalFiles ?? 0;

  let status = statusStyles.empty;
  if (summary.rejected > 0) {
    status = statusStyles.rejected;
  } else if (summary.pendingReview > 0) {
    status = statusStyles.review;
  } else if (summary.approved > 0) {
    status = statusStyles.completed;
  }

  const href = `${basePath}/${card.path}`;

  return (
    <div className="relative flex h-full min-w-0 flex-col rounded-xl bg-[#f5f5f5] px-4 pt-5 pb-4 sm:px-5 sm:pt-6 sm:pb-5 min-h-[220px]">
      <div className="flex items-start justify-between gap-2">
        <Link to={href} className="group flex min-w-0 items-start gap-2.5">
          <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#5cab5f]" />
          <h3 className="min-w-0 break-words text-base font-bold leading-snug text-gray-900 group-hover:text-brand-orange transition sm:text-[17px]">
            {card.title}
          </h3>
        </Link>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition cursor-pointer"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <Link
                to={href}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium"
              >
                Review requirement
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 h-[2px] w-full rounded-full bg-[#5cab5f]" />

      <Link to={href} className="mt-4 flex-1">
        <p className="break-words text-xs leading-relaxed text-gray-400 sm:text-sm">
          {card.description}
        </p>
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-2 pt-2">
        <span className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ${status.className}`}>
          {status.label}
        </span>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <MessageSquare size={14} className="shrink-0" />
            {comments} comments
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <FileText size={14} className="shrink-0" />
            {files} files
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AdminViewClassPortfolio() {
  const { id } = useParams();
  const [viewMode, setViewMode] = useState('grid');
  const [classData, setClassData] = useState(null);
  const [requirementSummary, setRequirementSummary] = useState({});
  const [counts, setCounts] = useState({
    approved: 0,
    pendingReview: 0,
    rejected: 0,
    notSubmitted: 0,
  });
  const [completionPercent, setCompletionPercent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchClassById(id);
        if (data?.class) {
          setClassData(data.class);
          if (data.requirementSummary) {
            setRequirementSummary(data.requirementSummary);
          }
          if (data.counts) {
            setCounts({
              approved: data.counts.approved ?? 0,
              pendingReview: data.counts.pendingReview ?? 0,
              rejected: data.counts.rejected ?? 0,
              notSubmitted: data.counts.notSubmitted ?? 0,
            });
          }
          if (typeof data.completionPercent === 'number') {
            setCompletionPercent(data.completionPercent);
          }
        }
      } catch (err) {
        console.warn('Failed to load class details from backend:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const instructorId = classData?.ownerId?._id || classData?.ownerId;
  const backToReviewUrl = instructorId
    ? `/admin/review/class-portfolio?instructorId=${instructorId}`
    : '/admin/review/class-portfolio';

  const subjectCode = classData?.subject?.code || 'Subject';
  const sectionCode = classData?.section?.code || classData?.section?.name || 'Section';
  const program = classData?.section?.name || classData?.section?.code || 'BSIT';
  const academicYear = classData?.academicPeriod?.schoolYear || '2026-2027';
  const semester = classData?.academicPeriod?.semester
    ? `${classData.academicPeriod.semester} Semester`
    : '1st Semester';

  const headingTitle = `${subjectCode} · ${sectionCode}`;
  const headingSubtitle = `${program}: A.Y. ${academicYear}, ${semester}`;
  const basePath = `/admin/class-portfolio/${id}`;

  const totalSegmentCount = counts.approved + counts.pendingReview + counts.rejected + counts.notSubmitted || 6;
  const approvedPct = (counts.approved / totalSegmentCount) * 100;
  const pendingPct = (counts.pendingReview / totalSegmentCount) * 100;
  const rejectedPct = (counts.rejected / totalSegmentCount) * 100;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Heading */}
      <div>
        <div className="flex items-center gap-3">
          <Link
            to={backToReviewUrl}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-brand-purple text-brand-purple hover:opacity-70 transition cursor-pointer"
            aria-label="Back to Classes"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#2e2a72] tracking-tight">
              {headingTitle}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-gray-500">
              {headingSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* TOP ROW: COMPLIANCE & COMPLETION STATUS */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        {/* Compliance Card */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
          <h2 className="text-lg font-bold text-gray-800">Compliance Summary</h2>

          {/* Segmented Progress Bar */}
          <div className="mt-4 h-3.5 w-full overflow-hidden rounded-full bg-gray-200 flex">
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

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-500">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-[#5cab5f]" />
              ({counts.approved}) Approved
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f5a30f]" />
              ({counts.pendingReview}) Pending Review
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
              ({counts.rejected}) Rejected
            </span>
            <span className="flex items-center gap-1.5 font-medium text-gray-400">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              Not Yet Submitted
            </span>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            {counts.approved} of {counts.approved + counts.pendingReview + counts.rejected} submitted documents are currently approved.
          </p>
        </section>

        {/* Completion Status Card */}
        <section className="flex flex-col justify-between items-center text-center rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
          <span className="text-sm font-semibold text-brand-purple sm:text-base">
            Portfolio Completion
          </span>
          <div className="my-auto py-2">
            <span className={`text-5xl font-extrabold tracking-tight ${completionPercent > 0 ? 'text-[#5cab5f]' : 'text-gray-400'}`}>
              {completionPercent}%
            </span>
            <p className="mt-2 text-xs font-normal text-gray-400">
              {completionPercent >= 100
                ? 'Portfolio fully verified and completed.'
                : completionPercent > 0
                  ? 'Portfolio is in progress.'
                  : 'No submissions approved yet.'}
            </p>
          </div>
        </section>
      </div>

      {/* BOTTOM SECTION: CLASS PORTFOLIO CONTENT */}
      <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#efeef8] text-brand-purple">
              <Folder size={20} />
            </span>
            <h2 className="text-xl font-bold text-brand-purple tracking-tight sm:text-2xl">
              Class Requirements Checklist
            </h2>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-brand-purple/10 text-brand-purple'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-brand-purple/10 text-brand-purple'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={24} className="animate-spin text-brand-purple mr-2" />
            <span>Loading requirements...</span>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col space-y-3'
            }
          >
            {CLASS_REQUIREMENT_CARDS.map((card) => (
              <RequirementCard
                key={card.path}
                card={card}
                basePath={basePath}
                summary={requirementSummary[card.key] || {}}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

