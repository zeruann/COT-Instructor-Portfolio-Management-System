import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  FileText,
  AlertCircle,
  CheckCircle2,
  Eye,
  CheckSquare,
  Lock,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import UploadModal from '../../components/documentActions/UploadModal';
import PreviewModal from '../../components/documentActions/PreviewModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import AppModal, { useAppModal } from '../../components/common/AppModal';
import ComplianceCard from '../../components/portfolio/ComplianceCard';
import CompletionStatusCard from '../../components/portfolio/CompletionStatusCard';
import { CLASS_REQUIREMENT_CARDS } from './ViewClassPortfolio';
import { fetchClassById } from '../../api/classes';
import { fetchDocuments, deleteDocument } from '../../api/documents';

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
};

function getHeaderStatus(documents) {
  if (!documents || documents.length === 0) {
    return {
      label: 'Not Yet Submitted',
      className: 'bg-gray-50 text-gray-600 border-gray-200',
    };
  }
  if (documents.some((d) => d.status === 'rejected')) {
    return DOC_STATUS_BADGE.rejected;
  }
  if (documents.some((d) => d.status === 'pending_review')) {
    return DOC_STATUS_BADGE.pending_review;
  }
  if (documents.every((d) => d.status === 'approved')) {
    return DOC_STATUS_BADGE.approved;
  }
  return DOC_STATUS_BADGE.pending_review;
}

function getFileName(doc) {
  const current = doc?.versions?.find((v) => v.n === doc.currentVersion);
  return current?.originalName || doc?.versions?.[doc.versions.length - 1]?.originalName || 'Submitted Document';
}

function summarizeDocuments(documents) {
  const counts = {
    approved: 0,
    pendingReview: 0,
    rejected: 0,
    notSubmitted: 0,
  };
  documents.forEach((doc) => {
    if (doc.status === 'approved') counts.approved += 1;
    else if (doc.status === 'rejected') counts.rejected += 1;
    else if (doc.status === 'pending_review') counts.pendingReview += 1;
    else counts.notSubmitted += 1;
  });
  const total = documents.length;
  const percent = total > 0 ? Math.round((counts.approved / total) * 100) : 0;
  return { counts, total, percent };
}

function EvidenceListSection({
  documents,
  requirementKey,
  isAdmin,
  isArchived,
  isCompact,
  canUpload,
  isILR,
  onUploadClick,
  onPreview,
  onReplace,
  onDelete,
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white ${isCompact ? 'p-4 sm:p-5' : 'p-6 sm:p-8'
        } shadow-xs`}
    >
      <div
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 ${isCompact ? 'pb-3.5' : 'pb-5'
          }`}
      >
        <div>
          <h2
            className={`${isCompact ? 'text-sm sm:text-base' : 'text-xl'
              } font-bold text-brand-purple`}
          >
            Submitted Evidence
          </h2>
          <p className={`mt-1 ${isCompact ? 'text-xs' : 'text-sm'} text-gray-400`}>
            {isAdmin
              ? 'Review submitted document evidence and provide feedback or approval.'
              : isILR
                ? 'Uploaded Instructional Load Report on record (shared across your classes this semester).'
                : 'Uploaded documents on record for this requirement.'}
          </p>
        </div>

        {canUpload && (
          <button
            type="button"
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-brand-orange px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-orange-600 transition cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>
              {isILR && documents.length > 0 ? 'Replace Document' : 'Upload Document'}
            </span>
          </button>
        )}
      </div>

      <div className={`${isCompact ? 'mt-4' : 'mt-6'} space-y-3`}>
        {documents.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center ${isCompact ? 'py-10' : 'py-12'
              } text-center text-gray-400`}
          >
            <AlertCircle size={isCompact ? 30 : 36} className="mb-2 text-gray-300" />
            <p className={`${isCompact ? 'text-sm' : 'text-base'} font-semibold text-gray-600`}>
              No document submitted yet
            </p>
            <p className="text-xs mt-1 text-gray-400">
              {isAdmin
                ? 'The instructor has not uploaded any evidence for this requirement.'
                : 'Click "Upload Document" above to submit evidence for this requirement.'}
            </p>
          </div>
        ) : (
          documents.map((doc) => {
            const fileName = getFileName(doc);
            const badge = DOC_STATUS_BADGE[doc.status] || {
              label: doc.status?.replace('_', ' ') || 'Submitted',
              className: 'bg-gray-50 text-gray-600 border-gray-200',
            };
            const remarks = doc.review?.comment || doc.comment;

            return (
              <div
                key={doc._id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isCompact ? 'p-4' : 'p-5'
                  } rounded-xl border border-gray-200 bg-gray-50`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex ${isCompact ? 'h-10 w-10' : 'h-12 w-12'
                      } items-center justify-center rounded-lg bg-purple-100 text-brand-purple shrink-0`}
                  >
                    <FileText size={isCompact ? 20 : 24} />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className={`${isCompact ? 'text-sm' : 'text-sm sm:text-base'
                        } font-bold text-gray-900 break-all`}
                    >
                      {fileName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                      <span
                        className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {doc.submittedAt && (
                        <span>Submitted {new Date(doc.submittedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    {remarks && doc.status === 'rejected' && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium">
                        Admin Remarks: {remarks}
                      </p>
                    )}
                    {requirementKey === 'CLASS_A_LOAD_REPORT' && (
                      <p className="mt-1 text-xs text-brand-purple font-medium">
                        This load report is automatically shared across all your class portfolios for this semester.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => onPreview(doc)}
                      className={`inline-flex items-center gap-2 rounded-xl bg-brand-orange ${isCompact ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm'
                        } font-semibold text-white shadow-xs hover:bg-orange-600 transition cursor-pointer`}
                    >
                      <CheckSquare size={isCompact ? 14 : 16} />
                      <span>Review Document</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onPreview(doc)}
                        className={`inline-flex items-center gap-2 rounded-xl bg-brand-purple ${isCompact ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm'
                          } font-semibold text-white shadow-xs hover:bg-opacity-90 transition cursor-pointer`}
                      >
                        <Eye size={isCompact ? 14 : 16} />
                        <span>View Document</span>
                      </button>
                      {!isArchived && doc.status !== 'approved' && (
                        <>
                          {onReplace && (
                            <button
                              type="button"
                              onClick={() => onReplace(doc)}
                              className={`inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white ${isCompact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
                                } font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer`}
                            >
                              <RefreshCw size={isCompact ? 14 : 15} />
                              <span>Replace</span>
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(doc)}
                              className={`inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 ${isCompact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
                                } font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer`}
                            >
                              <Trash2 size={isCompact ? 14 : 16} />
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

export default function ClassRequirementUpload({
  reqConfig,
  classData: propClassData,
  onDone,
  classId: propClassId,
  reqPath: propReqPath,
  isAdminOverride,
  embedded = false,
  onBack,
}) {
  const isCompact = embedded || Boolean(onBack);
  const params = useParams();
  const { pathname } = useLocation();
  const isAdmin = isAdminOverride ?? pathname.startsWith('/admin');
  const classId = propClassId || params.id;
  const reqPath = propReqPath || params.reqPath;

  const resolvedReq = reqConfig || CLASS_REQUIREMENT_CARDS.find((r) => r.path === reqPath) || {
    key: `CLASS_${reqPath?.toUpperCase().replace(/-/g, '_')}`,
    ref: 'A 1.0',
    title: 'A 1.0 Instructional Load Report',
    description: 'Instructional Load Report',
    path: reqPath,
  };

  const isILR = resolvedReq.key === 'CLASS_A_LOAD_REPORT';

  const [classData, setClassData] = useState(propClassData || null);
  const [documents, setDocuments] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replacingDoc, setReplacingDoc] = useState(null);
  const [ilrConfirmOpen, setIlrConfirmOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteTargetDoc, setDeleteTargetDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { modal, close: closeModal, notify } = useAppModal();

  const loadClassAndDocs = async () => {
    try {
      if (classId && !classData) {
        const cData = await fetchClassById(classId);
        if (cData?.class) {
          setClassData(cData.class);
        }
      }

      const docs = await fetchDocuments({
        requirementKey: resolvedReq.key,
        classId,
      });

      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.warn('Failed to fetch class requirement docs:', err);
    }
  };

  useEffect(() => {
    loadClassAndDocs();
  }, [classId, resolvedReq.key]);

  const handleDeleteDoc = async () => {
    if (!deleteTargetDoc?._id) return;
    try {
      setDeleting(true);
      await deleteDocument(deleteTargetDoc._id);
      setDeleteTargetDoc(null);
      notify('success', 'Document Deleted', 'The document has been removed successfully.');
      await loadClassAndDocs();
      if (onDone) onDone();
    } catch (err) {
      console.error('Delete error:', err);
      setDeleteTargetDoc(null);
      notify('error', 'Delete Failed', err.response?.data?.message || 'Failed to delete document.');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenUploadModal = () => {
    if (isILR && documents.length > 0) {
      setIlrConfirmOpen(true);
      return;
    }
    setReplacingDoc(null);
    setUploadOpen(true);
  };

  const handleReplaceClick = (doc) => {
    if (isILR) {
      setIlrConfirmOpen(true);
      return;
    }
    setReplacingDoc(doc);
    setUploadOpen(true);
  };

  const handleConfirmIlrReplace = () => {
    setIlrConfirmOpen(false);
    setReplacingDoc(documents[0] || null);
    setUploadOpen(true);
  };

  const headerStatus = getHeaderStatus(documents);
  const { counts, total, percent } = summarizeDocuments(documents);

  const complianceMessage =
    total === 0
      ? 'No documents submitted yet. Upload a file to get started.'
      : counts.approved === total
        ? 'All submitted documents have been approved.'
        : `${counts.approved} of ${total} ${total === 1 ? 'document' : 'documents'} approved.`;

  const completionMessage =
    percent === 100
      ? 'Your requirements have been verified and approved!'
      : total === 0
        ? 'No documents submitted yet.'
        : `${counts.approved} of ${total} ${total === 1 ? 'document' : 'documents'} approved.`;

  const backPath = isAdmin
    ? `/admin/class-portfolio/${classId}`
    : `/instructors/class-portfolio/${classId}`;

  const isArchived = Boolean(
    classData?.archivedAt ||
    classData?.academicPeriod?.isArchived ||
    classData?.academicPeriod?.status === 'Archived'
  );

  const ilrApproved = isILR && documents.some((d) => d.status === 'approved');
  const canUpload = !isAdmin && !isArchived && !ilrApproved;

  const modalRequirement = {
    key: resolvedReq.key,
    label: resolvedReq.title,
    card: classData ? `${classData.subject?.code} · ${classData.section?.code}` : 'Class Portfolio',
    multiple: !isILR,
    classIds: [classId],
    academicPeriodId: classData?.academicPeriod?._id || classData?.academicPeriod,
    metaFields: [],
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={`flex ${isCompact ? 'h-7 w-7' : 'h-8 w-8'
              } items-center justify-center rounded-full border-2 border-brand-purple text-brand-purple hover:bg-brand-purple/10 transition cursor-pointer`}
            aria-label="Back to Class Portfolio"
          >
            <ArrowLeft size={isCompact ? 15 : 18} />
          </button>
        ) : (
          <Link
            to={backPath}
            className={`flex ${isCompact ? 'h-7 w-7' : 'h-8 w-8'
              } items-center justify-center rounded-full border-2 border-brand-purple text-brand-purple hover:bg-brand-purple/10 transition cursor-pointer`}
            aria-label="Back to Class Portfolio"
          >
            <ArrowLeft size={isCompact ? 15 : 18} />
          </Link>
        )}
        <h1
          className={`${isCompact ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'
            } font-bold text-brand-purple`}
        >
          {resolvedReq.title}
        </h1>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${headerStatus.className}`}
        >
          {headerStatus.label}
        </span>
      </div>

      {/* Archived Read-Only Notice */}
      {isArchived && !isAdmin && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs sm:text-sm text-brand-purple font-medium">
          <Lock size={15} className="shrink-0 text-brand-purple" />
          <span>
            This requirement belongs to an archived academic record. All documents are preserved in read-only mode for audit &amp; compliance.
          </span>
        </div>
      )}

      {/* Progress / Compliance Bar */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <ComplianceCard counts={counts} message={complianceMessage} className="col-span-3" />
        <CompletionStatusCard percent={percent} message={completionMessage} className="col-span-1" />
      </div>

      {/* Approved ILR Banner */}
      {!isAdmin && !isArchived && ilrApproved && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 font-medium">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>
            Your Instructional Load Report has been approved by the administrator and cannot be replaced or modified.
          </span>
        </div>
      )}

      {/* Submitted Evidence List (with Upload button in top-right) */}
      <EvidenceListSection
        documents={documents}
        requirementKey={resolvedReq.key}
        isAdmin={isAdmin}
        isArchived={isArchived}
        isCompact={isCompact}
        canUpload={canUpload}
        isILR={isILR}
        onUploadClick={handleOpenUploadModal}
        onPreview={(doc) => setPreviewDoc(doc)}
        onReplace={handleReplaceClick}
        onDelete={(doc) => setDeleteTargetDoc(doc)}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setReplacingDoc(null);
        }}
        onSuccess={() => {
          loadClassAndDocs();
          if (onDone) onDone();
        }}
        requirement={modalRequirement}
        existingDoc={replacingDoc}
      />

      {/* Preview / Review Modal */}
      {previewDoc && (
        <PreviewModal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          document={previewDoc}
          isAdmin={isAdmin}
          onReviewSuccess={() => {
            loadClassAndDocs();
            if (onDone) onDone();
            setPreviewDoc(null);
          }}
        />
      )}

      {/* ILR Single-Document Replacement Confirmation */}
      <ConfirmationModal
        open={ilrConfirmOpen}
        onCancel={() => setIlrConfirmOpen(false)}
        onConfirm={handleConfirmIlrReplace}
        title="Replace Instructional Load Report?"
        message="Only one Instructional Load Report is allowed per semester and it is shared across all your classes. Uploading a new file will replace your current submission."
        confirmLabel="Continue"
        cancelLabel="Cancel"
        variant="warning"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={Boolean(deleteTargetDoc)}
        onCancel={() => !deleting && setDeleteTargetDoc(null)}
        onConfirm={handleDeleteDoc}
        title={
          isILR
            ? 'Delete Instructional Load Report'
            : 'Delete Document'
        }
        message={
          isILR
            ? 'This will remove the Instructional Load Report for all of your classes in this semester. Are you sure you want to delete this document?'
            : `Are you sure you want to delete "${getFileName(deleteTargetDoc)}"? This action cannot be undone.`
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
      />

      <AppModal modal={modal} onClose={closeModal} />
    </div>
  );
}
