// client/src/components/documentActions/PreviewModal.jsx
import { useState } from 'react';
import {
  X,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Clock,
  Loader2,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { formatDate } from '../../utils/formatDate';
import { getDocumentFileUrl, reviewDocument } from '../../api/documents';
import StatusBadge from './StatusBadge';

export default function PreviewModal({
  isOpen,
  onClose,
  document,
  isAdmin = false,
  onReviewSuccess,
  onEdit,
}) {
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !document) return null;

  // Active/latest version
  const currentVersion =
    document.versions?.find((v) => v.n === document.currentVersion) ||
    document.versions?.[document.versions?.length - 1];

  const fileUrl = getDocumentFileUrl(document._id, currentVersion?.n);
  const mimeType = currentVersion?.mimeType || '';
  const isPdf = mimeType.includes('pdf');
  const isImage = mimeType.startsWith('image/');

  const handleReview = async (decision) => {
    if (decision === 'rejected' && !comment.trim()) {
      setError('Please provide a reason for rejection.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await reviewDocument(document._id, {
        decision,
        comment: comment.trim(),
      });

      if (onReviewSuccess) {
        onReviewSuccess(res.document);
      }
      onClose();
    } catch (err) {
      console.error('Review submission failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const title = document.meta?.name || document.meta?.organization || document.requirementKey;
  const reviewData = currentVersion?.review;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl h-[92vh] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-gray-800 truncate" title={title}>
                {title}
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                v{document.currentVersion || 1}
              </span>
              <StatusBadge status={document.status} />
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
              <span className="truncate">{currentVersion?.originalName}</span>
              {document.submittedAt && (
                <span className="flex items-center gap-1 shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(document.submittedAt)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAdmin && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(document)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-orange hover:bg-orange-600 rounded-xl transition shadow-xs"
                title="Edit / Re-upload a new version"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Edit / Re-upload
              </button>
            )}
            <a
              href={fileUrl}
              download={currentVersion?.originalName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              title="Download or open in new tab"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Content Area */}
        <div className="flex-1 bg-gray-100 relative overflow-hidden flex flex-col">
          {isPdf ? (
            <iframe
              src={fileUrl}
              title={title}
              className="w-full h-full border-0"
            />
          ) : isImage ? (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={fileUrl}
                alt={title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-md"
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 text-brand-purple flex items-center justify-center mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-semibold text-gray-800">{currentVersion?.originalName}</h4>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Direct in-browser preview is not supported for this document type (e.g. DOCX).
                Please download the file to view its full contents.
              </p>
              <a
                href={fileUrl}
                download={currentVersion?.originalName}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-brand-purple rounded-xl shadow-xs hover:bg-opacity-90 transition"
              >
                <Download className="w-4 h-4" /> Download File
              </a>
            </div>
          )}
        </div>

        {/* Footer Info / Review Actions */}
        <div className="px-6 py-4 bg-white border-t border-gray-100">
          {error && (
            <div className="flex items-center gap-2 mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* If the document was previously rejected, display reviewer feedback banner */}
          {document.status === 'rejected' && reviewData?.comment && (
            <div className="mb-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Reviewer Feedback:
              </div>
              <p className="text-xs text-red-600 mt-1 leading-relaxed pl-5.5">
                {reviewData.comment}
              </p>
            </div>
          )}

          {/* Admin Review Controls */}
          {isAdmin ? (
            <div>
              {rejecting ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Reason for Rejection <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Explain what needs to be corrected or re-uploaded..."
                      className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-400"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRejecting(false);
                        setComment('');
                        setError('');
                      }}
                      disabled={submitting}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview('rejected')}
                      disabled={submitting || !comment.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 transition"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Administrator Review: verify this document against requirements.
                  </span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRejecting(true)}
                      disabled={submitting || document.status === 'rejected'}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-xl disabled:opacity-50 transition"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview('approved')}
                      disabled={submitting || document.status === 'approved'}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl disabled:opacity-50 transition"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve Document
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Instructor status note */
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" />
                Current Status:{' '}
                <strong className="text-gray-700 capitalize">
                  {document.status?.replace('_', ' ')}
                </strong>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition"
              >
                Close Preview
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
