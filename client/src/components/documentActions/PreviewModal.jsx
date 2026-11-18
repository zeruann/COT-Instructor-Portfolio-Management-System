// client/src/components/documentActions/PreviewModal.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Loader2,
  Calendar,
  Table,
  Lock,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { formatDate } from '../../utils/formatDate';
import { getDocumentFileUrl, downloadDocumentFile, reviewDocument } from '../../api/documents';
import { useResourceLock } from '../../hooks/useResourceLock';
import StatusBadge from './StatusBadge';
import AppModal, { useAppModal } from '../common/AppModal';

// Helper for Excel column headers: 0 -> A, 1 -> B, 25 -> Z, 26 -> AA...
function getColLabel(index) {
  let label = '';
  let num = index;
  while (num >= 0) {
    label = String.fromCharCode((num % 26) + 65) + label;
    num = Math.floor(num / 26) - 1;
  }
  return label;
}

// Rejection reasons are capped so notifications and history stay readable.
const MAX_REJECT_COMMENT_WORDS = 100;

const countWords = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0);

export default function PreviewModal({
  isOpen,
  onClose,
  document,
  isAdmin = false,
  onReviewSuccess,
}) {
  const { modal, close: closeModal, confirm: showConfirm } = useAppModal();
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { lockedByOther, lockedByName } = useResourceLock(
    document?._id ? `document:${document._id}` : null,
    { enabled: Boolean(isOpen && isAdmin && document?._id) }
  );

  // Excel state
  const [excelWorkbook, setExcelWorkbook] = useState(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState('');

  // Word state
  const [wordHtml, setWordHtml] = useState('');
  const [wordLoading, setWordLoading] = useState(false);
  const [wordError, setWordError] = useState('');

  // Active/latest version
  const currentVersion =
    document?.versions?.find((v) => v.n === document.currentVersion) ||
    document?.versions?.[document?.versions?.length - 1];

  const fileUrl = document ? getDocumentFileUrl(document._id, currentVersion?.n) : '';
  const mimeType = currentVersion?.mimeType || '';
  const fileName = currentVersion?.originalName || '';
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';

  const isPdf = mimeType.includes('pdf') || fileExt === 'pdf';
  const isImage = mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(fileExt);
  const isExcel = ['xlsx', 'xls', 'csv'].includes(fileExt) || mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv';
  const isWord = ['docx'].includes(fileExt) || mimeType.includes('wordprocessingml') || mimeType.includes('officedocument.word');

  // Load Excel data
  useEffect(() => {
    if (!isOpen || !document || !isExcel) {
      setExcelWorkbook(null);
      return;
    }

    let cancelled = false;
    setExcelLoading(true);
    setExcelError('');

    downloadDocumentFile(document._id, currentVersion?.n)
      .then(async (blob) => {
        if (cancelled) return;
        const buffer = await blob.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        if (!cancelled) {
          setExcelWorkbook(wb);
          setActiveSheetIndex(0);
          setExcelLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to parse Excel file:', err);
          setExcelError('Unable to preview this spreadsheet in-browser.');
          setExcelLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, document?._id, currentVersion?.n, isExcel]);

  // Load Word (.docx) data
  useEffect(() => {
    if (!isOpen || !document || !isWord) {
      setWordHtml('');
      return;
    }

    let cancelled = false;
    setWordLoading(true);
    setWordError('');

    downloadDocumentFile(document._id, currentVersion?.n)
      .then(async (blob) => {
        if (cancelled) return;
        const buffer = await blob.arrayBuffer();
        const res = await mammoth.convertToHtml({ arrayBuffer: buffer });
        if (!cancelled) {
          setWordHtml(res.value || '<p class="text-gray-400 italic">This document has no readable text content.</p>');
          setWordLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to parse Word document:', err);
          setWordError('Unable to convert Word document for in-browser preview.');
          setWordLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, document?._id, currentVersion?.n, isWord]);

  if (!isOpen || !document) return null;

  const handleApproveClick = () => {
    const docName =
      document?.versions?.[document.versions.length - 1]?.originalName ||
      document?.meta?.name ||
      document?.meta?.title ||
      'this document';

    showConfirm({
      tone: 'approve',
      title: 'Approve Document?',
      message: `Are you sure you want to approve "${docName}"?`,
      confirmLabel: 'Approve',
      cancelLabel: 'Cancel',
      onConfirm: () => handleReview('approved'),
    });
  };

  const handleReview = async (decision) => {
    if (lockedByOther) {
      setError(`This document is currently being reviewed by ${lockedByName}.`);
      return;
    }
    if (decision === 'rejected' && !comment.trim()) {
      setError('Please provide a reason for rejection.');
      return;
    }

    if (decision === 'rejected' && countWords(comment) > MAX_REJECT_COMMENT_WORDS) {
      setError(`The reason for rejection must be ${MAX_REJECT_COMMENT_WORDS} words or fewer.`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await reviewDocument(document._id, {
        decision,
        comment: comment.trim(),
        expectedVersion: document.__v,
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

  // Still used as the accessible name of the preview (iframe / image).
  const title = document.meta?.name || document.meta?.organization || document.requirementKey;
  const reviewData = currentVersion?.review;

  // The Download button. Used in the footer (instructor and admin).
  const downloadButton = (
    <a
      href={fileUrl}
      download={currentVersion?.originalName}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
      title="Download or open in new tab"
    >
      <Download className="w-3.5 h-3.5" />
      Download
    </a>
  );

  // Compute current sheet rows for Excel preview
  let sheetRows = [];
  let sheetName = '';
  if (excelWorkbook && excelWorkbook.SheetNames?.length > 0) {
    sheetName = excelWorkbook.SheetNames[activeSheetIndex] || excelWorkbook.SheetNames[0];
    const sheet = excelWorkbook.Sheets[sheetName];
    if (sheet) {
      sheetRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    }
  }
  const maxCols = sheetRows.reduce((max, r) => Math.max(max, Array.isArray(r) ? r.length : 0), 0);

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/60 animate-[modalBackdropIn_150ms_ease-out_forwards]" />
      <div className="relative w-full max-w-5xl h-[92vh] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-[modalPanelIn_180ms_cubic-bezier(0.16,1,0.3,1)_forwards]">
        {/* Header
            Row 1: Document Preview + Status ............ X
            Row 2: File Name: ...   Date Uploaded: ... */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="text-base font-bold text-gray-800">Document Preview</h3>

              <StatusBadge status={document.status} />

              {/* Word or excel file status badge */}
              {/* {isExcel && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Table size={12} /> Excel Sheet
                </span>
              )}
              {isWord && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <FileText size={12} /> Word Document
                </span>
              )} */}


            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-gray-400 mt-1.5">
            <span className="flex items-center gap-1 min-w-0">
              <span className="font-medium text-gray-500 shrink-0">File Name:</span>
              <span className="truncate" title={currentVersion?.originalName}>
                {currentVersion?.originalName}
              </span>
            </span>

            {document.submittedAt && (
              <span className="flex items-center gap-1 shrink-0">
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-medium text-gray-500">Date Uploaded:</span>
                {formatDate(document.submittedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Viewer Content Area */}
        <div className="flex-1 bg-gray-100 relative overflow-hidden flex flex-col">
          {/* 1. PDF Viewer */}
          {isPdf ? (
            <iframe
              src={fileUrl}
              title={title}
              className="w-full h-full border-0"
            />
          ) : /* 2. Image Viewer */ isImage ? (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={fileUrl}
                alt={title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-md"
              />
            </div>
          ) : /* 3. Excel Spreadsheet Viewer */ isExcel ? (
            <div className="w-full h-full flex flex-col bg-white overflow-hidden">
              {excelLoading ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  <p className="text-xs">Loading spreadsheet contents…</p>
                </div>
              ) : excelError ? (
                <div className="flex flex-col items-center justify-center flex-1 p-8 text-center m-auto">
                  <Table className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-xs text-red-600 mb-3">{excelError}</p>
                  {downloadButton}
                </div>
              ) : (
                <>
                  {/* Sheet Tabs Bar */}
                  {excelWorkbook?.SheetNames?.length > 1 && (
                    <div className="flex items-center gap-1 px-4 py-2 bg-gray-100 border-b border-gray-200 overflow-x-auto text-xs shrink-0">
                      <span className="text-gray-400 font-medium mr-2">Sheets:</span>
                      {excelWorkbook.SheetNames.map((name, idx) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setActiveSheetIndex(idx)}
                          className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${activeSheetIndex === idx
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
                            }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Excel Grid */}
                  <div className="flex-1 overflow-auto p-4 bg-gray-50/50">
                    {sheetRows.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-xs text-gray-400 italic">
                        The active sheet contains no rows.
                      </div>
                    ) : (
                      <div className="inline-block min-w-full align-middle border border-gray-300 rounded shadow-xs overflow-hidden bg-white">
                        <table className="border-collapse text-xs font-mono text-gray-800 bg-white">
                          <thead>
                            <tr className="bg-gray-100 text-gray-600 font-semibold select-none">
                              <th className="border border-gray-300 px-2.5 py-1.5 text-center bg-gray-200 w-10 shrink-0">
                                #
                              </th>
                              {Array.from({ length: maxCols }).map((_, cIdx) => (
                                <th
                                  key={cIdx}
                                  className="border border-gray-300 px-3 py-1.5 text-center min-w-[90px] font-semibold"
                                >
                                  {getColLabel(cIdx)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sheetRows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-blue-50/40">
                                <td className="border border-gray-300 px-2 py-1 text-center bg-gray-100 text-gray-500 font-medium select-none">
                                  {rIdx + 1}
                                </td>
                                {Array.from({ length: maxCols }).map((_, cIdx) => {
                                  const cellVal = row?.[cIdx];
                                  const display =
                                    cellVal !== undefined && cellVal !== null ? String(cellVal) : '';
                                  return (
                                    <td
                                      key={cIdx}
                                      className="border border-gray-200 px-3 py-1.5 whitespace-pre min-w-[90px] align-top text-gray-800"
                                    >
                                      {display}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : /* 4. Word (.docx) Document Viewer */ isWord ? (
            <div className="flex-1 overflow-auto bg-gray-200/80 p-4 sm:p-8 flex justify-center">
              {wordLoading ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
                  <p className="text-xs">Converting Word document for preview…</p>
                </div>
              ) : wordError ? (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl shadow-xs m-auto">
                  <FileText className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-xs text-red-600 mb-3">{wordError}</p>
                  {downloadButton}
                </div>
              ) : (
                <div
                  className="bg-white rounded-lg shadow-md border border-gray-200/80 p-8 sm:p-12 w-full max-w-3xl min-h-[700px] text-gray-900 text-sm leading-relaxed docx-preview-content"
                  dangerouslySetInnerHTML={{ __html: wordHtml }}
                />
              )}
            </div>
          ) : (
            /* 5. Unsupported Document Fallback */
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 text-brand-purple flex items-center justify-center mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-semibold text-gray-800">{currentVersion?.originalName}</h4>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Direct in-browser preview is not available for this specific file format.
                Please download the file to view its full contents.
              </p>
              <div className="mt-4">{downloadButton}</div>
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
              {lockedByOther && (
                <div className="flex items-center gap-2 mb-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                  <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Locked:</strong> Currently being reviewed by <strong>{lockedByName}</strong>. Review buttons are disabled until they finish.
                  </span>
                </div>
              )}
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
                      disabled={lockedByOther}
                      className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-400 disabled:opacity-60"
                    />
                    <div
                      className={`mt-1 text-right text-[11px] font-medium ${
                        countWords(comment) > MAX_REJECT_COMMENT_WORDS
                          ? 'text-red-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {countWords(comment)} / {MAX_REJECT_COMMENT_WORDS} words
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRejecting(false);
                        setComment('');
                        setError('');
                      }}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview('rejected')}
                      disabled={submitting || lockedByOther || countWords(comment) > MAX_REJECT_COMMENT_WORDS}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {submitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRejecting(true)}
                      disabled={submitting || lockedByOther || document.status === 'rejected'}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject Document
                    </button>
                    <button
                      type="button"
                      onClick={handleApproveClick}
                      disabled={submitting || lockedByOther || document.status === 'approved'}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
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
            /* Instructor footer: just the Download button, on the right */
            <div className="flex items-center justify-end">
              {downloadButton}
            </div>
          )}
        </div>
      </div>

      <AppModal modal={modal} onClose={closeModal} />
    </div>,
    // `document` here is the file record prop, so use window.document for the portal target.
    window.document.body
  );
}