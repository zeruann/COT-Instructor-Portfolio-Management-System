import { useMemo, useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import SharedRequirementHeader from '../../../components/portfolio/SharedRequirementHeader';
import ComplianceCard from '../../../components/portfolio/ComplianceCard';
import CompletionStatusCard from '../../../components/portfolio/CompletionStatusCard';
import StatusBadge from '../../../components/documentActions/StatusBadge';
import UploadModal from '../../../components/documentActions/UploadModal';
import PreviewModal from '../../../components/documentActions/PreviewModal';
import { fetchDocuments, deleteDocument } from '../../../api/documents';
import { Eye, RefreshCw, Upload, CheckSquare, Trash2 } from 'lucide-react';
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

      <section className="doc-table-card" aria-label="Required documents">
        <div className="doc-table-scroll">
          <table className="doc-table">
            <colgroup>
              <col className="doc-table__col-type" />
              <col className="doc-table__col-status" />
              <col className="doc-table__col-action" />
            </colgroup>

            <thead>
              <tr>
                <th scope="col">Document Type</th>
                <th scope="col" className="doc-table__status">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              {slotRows.map((row) => (
                <tr key={row.key}>
                  <td>
                    <div className="doc-table__type">
                      <svg
                        viewBox="0 0 24 24"
                        className="doc-table__icon"
                        width="26"
                        height="26"
                        strokeWidth="1.6"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                        <path d="M14 3v5h5M9 13h6M9 17h6" />
                      </svg>

                      <div>
                        <div className="doc-table__name-row">
                          <span className="doc-table__name">{row.label}</span>
                          <span className="doc-table__required rounded-sm border border-gray-200 px-1">
                            {REQUIRED_LABEL[row.required]}
                          </span>
                        </div>
                        <p className="text-[12px] text-gray-400">
                          {row.fileName || 'PDF, DOCX, JPEG, PNG · Maximum 25 MB'}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="doc-table__status">
                    <StatusBadge status={row.status} />
                  </td>

                  <td>
                    <div className="doc-actions flex items-center gap-2">
                      {isAdmin ? (
                        row.status === 'approved' || row.status === 'rejected' ? (
                          <span className="doc-badge--reviewed">
                            <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                            Reviewed
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="doc-btn doc-btn--review"
                            disabled={!row.hasRecord}
                            title={row.hasRecord ? 'Review document' : 'No document submitted yet'}
                            onClick={() => openPreview(row.attachedDoc)}
                          >
                            <CheckSquare className="w-4 h-4" />
                            Review
                          </button>
                        )
                      ) : (
                        <>
                          <button
                            type="button"
                            className="doc-btn doc-btn--view"
                            disabled={!row.hasRecord}
                            title={row.hasRecord ? 'View document' : 'Upload a file first'}
                            onClick={() => openPreview(row.attachedDoc)}
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>

                          {!row.hasRecord ? (
                            <button
                              type="button"
                              className="doc-btn doc-btn--upload"
                              title="Upload document"
                              onClick={() => openUpload(row.slot)}
                            >
                              <Upload className="w-4 h-4" />
                              Upload
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="doc-btn doc-btn--reupload"
                              title="Upload replacement version"
                              onClick={() => openUpload(row.slot)}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Reupload
                            </button>
                          )}

                          {row.hasRecord && row.status !== 'approved' && (
                            <button
                              type="button"
                              className="doc-btn border-red-200 text-red-600 hover:bg-red-50 p-2 rounded"
                              title="Delete document"
                              onClick={() => handleDelete(row.attachedDoc)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>


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
