// client/src/pages/portfolioRequirements/FacultyPortfolioRequirements/EducationalAttainment.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import SharedRequirementHeader from '../../../components/portfolio/SharedRequirementHeader';
import ComplianceCard from '../../../components/portfolio/ComplianceCard';
import CompletionStatusCard from '../../../components/portfolio/CompletionStatusCard';
import StatusBadge from '../../../components/documentActions/StatusBadge';
import UploadModal from '../../../components/documentActions/UploadModal';
import PreviewModal from '../../../components/documentActions/PreviewModal';
import { fetchDocuments } from '../../../api/documents';
import { usePortfolio } from '../../../context/usePortfolio';
import { Eye, ShieldCheck, RefreshCw, Upload } from 'lucide-react';

import './requirementStyle.css';
import './listEntries.css';

const EDUCATIONAL_SLOTS = [
  {
    key: 'FAC_B_BACHELORS_TOR',
    name: "Bachelor's Transcript of Records (TOR)",
    card: 'Educational Attainment',
    label: "Bachelor's Transcript of Records (TOR)",
    required: 'required',
  },
  {
    key: 'FAC_B_BACHELORS_DIPLOMA',
    name: "Bachelor's Diploma or Certificate of Units Earned",
    card: 'Educational Attainment',
    label: "Bachelor's Diploma or Certificate of Units Earned",
    required: 'required',
  },
  {
    key: 'FAC_B_MASTERS_TOR',
    name: "Master's Transcript of Records (TOR)",
    card: 'Educational Attainment',
    label: "Master's Transcript of Records (TOR)",
    required: 'ifApplicable',
  },
  {
    key: 'FAC_B_MASTERS_DIPLOMA',
    name: "Master's Diploma or Certificate of Units Earned",
    card: 'Educational Attainment',
    label: "Master's Diploma or Certificate of Units Earned",
    required: 'ifApplicable',
  },
  {
    key: 'FAC_B_PHD_TOR',
    name: 'PhD Transcript of Records (TOR)',
    card: 'Educational Attainment',
    label: 'PhD Transcript of Records (TOR)',
    required: 'ifApplicable',
  },
  {
    key: 'FAC_B_PHD_DIPLOMA',
    name: 'PhD Diploma or Certificate of Units Earned',
    card: 'Educational Attainment',
    label: 'PhD Diploma or Certificate of Units Earned',
    required: 'ifApplicable',
  },
];

const REQUIRED_LABEL = {
  required: 'Required',
  ifApplicable: 'If applicable',
  optional: 'Optional',
};

export default function EducationalAttainment() {
  const [searchParams] = useSearchParams();
  const { isAdmin } = usePortfolio();
  const instructorId = searchParams.get('instructorId');

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);

  const loadData = useCallback(() => {
    let isMounted = true;
    const params = {};
    if (isAdmin && instructorId) {
      params.instructorId = instructorId;
    }

    fetchDocuments(params)
      .then((docs) => {
        if (isMounted) {
          setDocuments(docs || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load educational attainment documents:', err);
          setError(err.response?.data?.message || err.message || 'Failed to load documents.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, instructorId]);

  useEffect(() => {
    const cancel = loadData();
    return cancel;
  }, [loadData]);

  // Merge slots with uploaded document records
  const slotRows = useMemo(() => {
    return EDUCATIONAL_SLOTS.map((slot) => {
      const doc = documents.find((d) => d.requirementKey === slot.key);
      const status = doc ? doc.status : 'missing';
      return {
        ...slot,
        doc,
        status,
        hasRecord: !!doc,
      };
    });
  }, [documents]);

  // Compute compliance counts
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

  const handleOpenUpload = (slot, existingDoc = null) => {
    setActiveSlot(slot);
    setActiveDoc(existingDoc);
    setUploadModalOpen(true);
  };

  const handleOpenPreview = (doc) => {
    setActiveDoc(doc);
    setPreviewModalOpen(true);
  };

  const closeModals = () => {
    setUploadModalOpen(false);
    setPreviewModalOpen(false);
    setActiveSlot(null);
    setActiveDoc(null);
  };

  const onUploadSuccess = (savedDoc) => {
    setDocuments((prev) => {
      const idx = prev.findIndex((d) => d._id === savedDoc._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedDoc;
        return next;
      }
      return [savedDoc, ...prev];
    });
  };

  const onReviewSuccess = (reviewedDoc) => {
    setDocuments((prev) =>
      prev.map((d) => (d._id === reviewedDoc._id ? reviewedDoc : d))
    );
  };

  return (
    <div className="space-y-5">
      {/* Role-aware Header */}
      <SharedRequirementHeader
        title="Educational Attainment"
        subtitle="TOR, Diploma or Certificate of Units Earned"
      />

      {/* Top Compliance Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <ComplianceCard counts={counts} message={complianceMessage} className="col-span-3" />
        <CompletionStatusCard percent={percent} message={completionMessage} className="col-span-1" />
      </div>

      {/* Required documents table */}
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
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-gray-400">
                    Loading educational attainment requirements...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-red-500">
                    {error}
                  </td>
                </tr>
              ) : (
                slotRows.map((row) => {
                  const hasRecord = row.hasRecord;
                  const doc = row.doc;

                  return (
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
                              <span className="doc-table__name">{row.name}</span>
                              <span className="doc-table__required rounded-sm border border-gray-200 px-1 py-0.5">
                                {REQUIRED_LABEL[row.required]}
                              </span>
                            </div>

                            <p className="doc-table__hint">
                              {hasRecord
                                ? `Attached: ${doc.versions?.[doc.versions.length - 1]?.originalName || 'file'}`
                                : 'PDF, DOCX, JPEG, PNG · Maximum 25 MB'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="doc-table__status">
                        <StatusBadge status={row.status} />
                      </td>

                      <td>
                        <div className="doc-actions">
                          {/* Admin Review Action */}
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => hasRecord && handleOpenPreview(doc)}
                              disabled={!hasRecord}
                              className="doc-btn doc-btn--view disabled:opacity-40"
                              title={hasRecord ? 'Review document' : 'Not submitted yet'}
                            >
                              <ShieldCheck className="w-4 h-4 text-brand-purple" />
                              Review
                            </button>
                          ) : (
                            /* Faculty Actions: View, Upload, Reupload */
                            <>
                              <button
                                type="button"
                                onClick={() => hasRecord && handleOpenPreview(doc)}
                                className="doc-btn doc-btn--view"
                                disabled={!hasRecord}
                                title={hasRecord ? 'View document' : 'Upload a file first'}
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>

                              {!hasRecord ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenUpload(row, null)}
                                  className="doc-btn doc-btn--upload"
                                  title="Upload document"
                                >
                                  <Upload className="w-4 h-4" />
                                  Upload
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenUpload(row, doc)}
                                  className="doc-btn doc-btn--reupload"
                                  title="Upload replacement version"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Reupload
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={closeModals}
        onSuccess={onUploadSuccess}
        requirement={activeSlot}
        existingDoc={activeDoc}
      />

      {/* Preview / Review Modal */}
      <PreviewModal
        isOpen={previewModalOpen}
        onClose={closeModals}
        document={activeDoc}
        isAdmin={isAdmin}
        onReviewSuccess={onReviewSuccess}
      />
    </div>
  );
}