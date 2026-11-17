import {
  AlertCircle,
  CheckSquare,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { formatDate } from '../../utils/formatDate';

const DOC_STATUS_BADGE = {
  approved: {
    label: 'Approved',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  pending_review: {
    label: 'Pending Review',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  rejected: {
    label: 'Needs Revision',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  draft: {
    label: 'Not submitted',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
};

function defaultFileName(doc) {
  const versions = doc?.versions || [];
  if (versions.length === 0) return '—';
  const current = versions.find((v) => v.n === doc.currentVersion);
  return current ? current.originalName : versions[versions.length - 1].originalName;
}

export default function FacultyEvidenceSection({
  records = [],
  loading = false,
  isAdmin = false,
  addLabel,
  onAdd,
  onView,
  onReplace,
  onDelete,
  getTitle,
  emptyTitle = 'No documents submitted yet',
  emptyHint = 'Click the button above to submit your first entry.',
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-brand-purple">Submitted Evidence</h2>
          <p className="mt-1 text-sm text-gray-400">
            {isAdmin
              ? 'Review submitted document evidence and provide feedback or approval.'
              : 'Uploaded documents on record for this requirement.'}
          </p>
        </div>

        {!isAdmin && onAdd && addLabel && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-brand-orange px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-orange-600 transition cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>{addLabel}</span>
          </button>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 size={22} className="animate-spin text-brand-purple mr-2" />
            <span className="text-sm">Loading documents...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
            <AlertCircle size={36} className="mb-2 text-gray-300" />
            <p className="text-base font-semibold text-gray-600">{emptyTitle}</p>
            <p className="text-xs mt-1 text-gray-400">
              {isAdmin
                ? 'The instructor has not uploaded any evidence for this requirement.'
                : emptyHint}
            </p>
          </div>
        ) : (
          records.map((doc) => {
            const title = getTitle
              ? getTitle(doc)
              : doc.meta?.title || doc.meta?.name || 'Untitled';
            const fileName = defaultFileName(doc);
            const dateText = doc.meta?.date ? formatDate(doc.meta.date) : null;
            const badge = DOC_STATUS_BADGE[doc.status] || {
              label: doc.status?.replace('_', ' ') || 'Submitted',
              className: 'bg-gray-50 text-gray-600 border-gray-200',
            };
            const remarks = doc.review?.comment || doc.comment;

            return (
              <div
                key={doc._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-gray-200 bg-gray-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-brand-purple shrink-0">
                    <FileText size={24} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 break-words">
                      {title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                      <span
                        className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {fileName && fileName !== '—' && (
                        <span className="truncate max-w-[260px]" title={fileName}>
                          {fileName}
                          {doc.currentVersion > 1 ? ` (v${doc.currentVersion})` : ''}
                        </span>
                      )}
                      {dateText && dateText !== '—' && <span>· {dateText}</span>}
                    </div>
                    {remarks && doc.status === 'rejected' && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium">
                        Admin Remarks: {remarks}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => onView(doc)}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-orange-600 transition cursor-pointer"
                    >
                      <CheckSquare size={16} />
                      <span>Review Document</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onView(doc)}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-opacity-90 transition cursor-pointer"
                      >
                        <Eye size={16} />
                        <span>View Document</span>
                      </button>
                      {doc.status !== 'approved' && (
                        <>
                          {onReplace && (
                            <button
                              type="button"
                              onClick={() => onReplace(doc)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                            >
                              <RefreshCw size={15} />
                              <span>Replace</span>
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(doc)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer"
                            >
                              <Trash2 size={16} />
                              <span>Delete</span>
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
