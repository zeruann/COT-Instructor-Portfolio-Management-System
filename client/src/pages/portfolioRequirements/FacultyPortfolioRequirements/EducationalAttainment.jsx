import { useMemo, useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import SharedRequirementHeader from '../../../components/portfolio/SharedRequirementHeader';
import ComplianceCard from '../../../components/portfolio/ComplianceCard';
import CompletionStatusCard from '../../../components/portfolio/CompletionStatusCard';
import StatusBadge from '../../../components/documentActions/StatusBadge';
import UploadModal from '../../../components/documentActions/UploadModal';
import PreviewModal from '../../../components/documentActions/PreviewModal';
import { fetchDocuments, deleteDocument } from '../../../api/documents';
import { Eye, FileText, RefreshCw, Upload, CheckSquare, Trash2 } from 'lucide-react';
import AppModal, { useAppModal } from '../../../components/common/AppModal';

import './requirementStyle.css';
import './listEntries.css';

const REQUIRED_LABEL = {
  required: 'Required',
  ifApplicable: 'If applicable',
  optional: 'Optional',
};

const EDU_SLOTS = [
  { key: 'FAC_B_BACHELORS_TOR', label: "Bachelor's Transcript of Records (TOR)", card: 'Educational Attainment', required: 'required' },
  { key: 'FAC_B_BACHELORS_DIPLOMA', label: "Bachelor's Diploma or Certificate of Units Earned", card: 'Educational Attainment', required: 'required' },
  { key: 'FAC_B_MASTERS_TOR', label: "Master's Transcript of Records (TOR)", card: 'Educational Attainment', required: 'ifApplicable' },
  { key: 'FAC_B_MASTERS_DIPLOMA', label: "Master's Diploma or Certificate of Units Earned", card: 'Educational Attainment', required: 'ifApplicable' },
  { key: 'FAC_B_PHD_TOR', label: 'PhD Transcript of Records (TOR)', card: 'Educational Attainment', required: 'ifApplicable' },
  { key: 'FAC_B_PHD_DIPLOMA', label: 'PhD Diploma or Certificate of Units Earned', card: 'Educational Attainment', required: 'ifApplicable' },
];

export default function EducationalAttainment() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const isAdmin = pathname.startsWith('/admin');
  const instructorId = searchParams.get('instructorId');

  const [docs, setDocs] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const { modal, close: closeModal, notify, confirm: showConfirm } = useAppModal();

  const loadRecords = async () => {
    try {
      const params = {};
      if (isAdmin && instructorId) {
        params.instructorId = instructorId;
      }
      const data = await fetchDocuments(params);
      setDocs(data || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [isAdmin, instructorId]);

  // Match each slot to its uploaded document
  const slotRows = useMemo(
    () =>
      EDU_SLOTS.map((slot) => {
        const attachedDoc = docs.find((d) => d.requirementKey === slot.key);
        return {
          ...slot,
          slot,
          attachedDoc,
          hasRecord: Boolean(attachedDoc),
          status: attachedDoc ? attachedDoc.status : 'missing',
          fileName: attachedDoc?.versions?.[0]?.originalName || null,
        };
      }),
    [docs]
  );

  const summary = useMemo(() => {
    const counts = {
      approved: slotRows.filter((r) => r.status === 'approved').length,
      pendingReview: slotRows.filter((r) => r.status === 'pending_review').length,
      rejected: slotRows.filter((r) => r.status === 'rejected').length,
      notSubmitted: slotRows.filter((r) => r.status === 'missing' || r.status === 'draft').length,
    };
    const total = slotRows.length;
    const percent = total ? Math.round((counts.approved / total) * 100) : 0;
    return { counts, total, percent };
  }, [slotRows]);

  const { counts, total, percent } = summary;

  const complianceMessage =
    total === 0
      ? 'No educational attainment records yet.'
      : counts.approved === total
        ? 'All educational attainment documents have been approved.'
        : `${counts.approved} of ${total} documents have been approved. Please address rejected and/or missing documents.`;

  const completionMessage =
    percent === 100
      ? 'Your educational attainment requirements have been verified and approved!'
      : total === 0
        ? 'No records yet.'
        : `${counts.approved} of ${total} records approved (${percent}%).`;

  const openUpload = (slot) => {
    setSelectedSlot(slot);
    setUploadOpen(true);
  };

  const openPreview = (doc) => {
    setSelectedDoc(doc);
    setPreviewOpen(true);
  };

  const handleDelete = (doc) => {
    if (!doc) return;
    const name = doc.versions?.[0]?.originalName || 'this file';
    showConfirm({
      title: 'Delete Document?',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteDocument(doc._id);
          loadRecords();
          notify('success', 'Document Deleted', 'The document has been removed successfully.');
        } catch (err) {
          notify('error', 'Delete Failed', err.response?.data?.message || 'Failed to delete document.');
        }
      },
    });
  };
  return (
    <div className="space-y-5">
      <SharedRequirementHeader
        title="Educational Attainment"
        subtitle="TOR, Diploma or Certificate of Units Earned"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <ComplianceCard counts={counts} message={complianceMessage} className="col-span-3" />
        <CompletionStatusCard percent={percent} message={completionMessage} className="col-span-1" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="border-b border-gray-100 pb-5">
          <h2 className="text-xl font-bold text-brand-purple">Submitted Evidence</h2>
          <p className="mt-1 text-sm text-gray-400">
            {isAdmin
              ? 'Review submitted educational attainment documents and provide feedback or approval.'
              : 'Upload your TOR, Diploma, or Certificate of Units Earned for each degree level.'}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {slotRows.map((row) => (
            <div
              key={row.key}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-gray-200 bg-gray-50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-brand-purple shrink-0">
                  <FileText size={24} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">
                      {row.label}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-600 border-gray-200">
                      {REQUIRED_LABEL[row.required]}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                    <StatusBadge status={row.status} />
                    <span className="truncate max-w-[300px]" title={row.fileName || undefined}>
                      {row.fileName || 'PDF, DOCX, JPEG, PNG · Maximum 10 MB'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {isAdmin ? (
                  <button
                    type="button"
                    disabled={!row.hasRecord}
                    onClick={() => openPreview(row.attachedDoc)}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-orange-600 transition cursor-pointer disabled:opacity-50"
                  >
                    <CheckSquare size={16} />
                    <span>Review Document</span>
                  </button>
                ) : (
                  <>
                    {row.hasRecord && (
                      <button
                        type="button"
                        onClick={() => openPreview(row.attachedDoc)}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-opacity-90 transition cursor-pointer"
                      >
                        <Eye size={16} />
                        <span>View Document</span>
                      </button>
                    )}

                    {row.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => openUpload(row.slot)}
                        className={
                          row.hasRecord
                            ? 'inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer'
                            : 'inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-orange-600 transition cursor-pointer'
                        }
                      >
                        {row.hasRecord ? (
                          <>
                            <RefreshCw size={15} />
                            <span>Replace</span>
                          </>
                        ) : (
                          <>
                            <Upload size={16} />
                            <span>Upload Document</span>
                          </>
                        )}
                      </button>
                    )}

                    {row.hasRecord && row.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(row.attachedDoc)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer"
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>


      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        requirement={selectedSlot}
        existingDoc={docs.find((d) => d.requirementKey === selectedSlot?.key)}
        onSuccess={() => {
          setUploadOpen(false);
          loadRecords();
        }}
      />

      <PreviewModal
        isOpen={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setSelectedDoc(null);
        }}
        document={selectedDoc}
        isAdmin={isAdmin}
        onReviewSuccess={() => {
          setPreviewOpen(false);
          loadRecords();
        }}
        onEdit={(doc) => {
          setPreviewOpen(false);
          const slot = EDU_SLOTS.find((s) => s.key === doc.requirementKey);
          if (slot) openUpload(slot);
        }}
      />

      <AppModal modal={modal} onClose={closeModal} />
    </div>
  );
}
