// client/src/pages/portfolioRequirements/FacultyPortfolioRequirements/Production.jsx
import SharedRequirementHeader from '../../../components/portfolio/SharedRequirementHeader';
import ComplianceCard from '../../../components/portfolio/ComplianceCard';
import CompletionStatusCard from '../../../components/portfolio/CompletionStatusCard';
import StatusBadge from '../../../components/documentActions/StatusBadge';
import UploadModal from '../../../components/documentActions/UploadModal';
import PreviewModal from '../../../components/documentActions/PreviewModal';
import { useRequirementDocuments } from '../../../hooks/useRequirementDocuments';
import { Eye, ShieldCheck, RefreshCw, Trash2, Plus } from 'lucide-react';
import { formatDate } from '../../../utils/formatDate';

import './requirementStyle.css';
import './listEntries.css';

export default function Production() {
  const {
    documents,
    requirement,
    loading,
    error,
    isAdmin,
    canUpload,
    summary,
    uploadModalOpen,
    previewModalOpen,
    selectedDoc,
    openUpload,
    openPreview,
    closeModals,
    handleDelete,
    onUploadSuccess,
    onReviewSuccess,
  } = useRequirementDocuments({ requirementKey: 'FAC_H_PRODUCTION' });

  const { counts, total, percent } = summary;

  const complianceMessage =
    total === 0
      ? isAdmin
        ? 'No production documents submitted by this instructor yet.'
        : 'No records yet. If applicable, click "Add Production Document" to upload certificates of copyrighted IMs or patent/utility models.'
      : counts.approved === total
      ? 'All production documents have been approved.'
      : `${counts.approved} of ${total} production documents have been approved.`;

  const completionMessage =
    percent === 100
      ? 'All production records verified and approved!'
      : total === 0
      ? 'No records yet.'
      : `${counts.approved} of ${total} records approved (${percent}%).`;

  return (
    <div className="space-y-5">
      {/* Header with back arrow and Add button */}
      <SharedRequirementHeader
        title="Production"
        subtitle="Certificates of Copyrighted IMs, Patent or utility model approved applications"
        onAddClick={canUpload ? () => openUpload() : null}
        addLabel="Add Production Document"
      />

      {/* Top Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <ComplianceCard counts={counts} message={complianceMessage} className="col-span-3" />
        <CompletionStatusCard percent={percent} message={completionMessage} className="col-span-1" />
      </div>

      {/* Main Table Card */}
      <section className="doc-table-card" aria-label="Production records">
        <div className="doc-table-scroll">
          <table className="doc-table doc-table--entries">
            <colgroup>
              <col className="doc-table__col-name" />
              <col className="doc-table__col-date" />
              <col className="doc-table__col-evidence" />
              <col className="doc-table__col-entry-status" />
              <col className="doc-table__col-entry-actions" />
            </colgroup>

            <thead>
              <tr>
                <th scope="col">Name & Type</th>
                <th scope="col">Date</th>
                <th scope="col">Attached Evidence</th>
                <th scope="col" className="doc-table__status">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-gray-400">
                    Loading production records...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-red-500">
                    {error}
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="doc-table__empty py-8 text-center">
                    <p className="text-gray-500 text-xs">
                      {isAdmin
                        ? 'This instructor has not uploaded any production documents yet.'
                        : 'No production documents recorded yet.'}
                    </p>
                    {canUpload && (
                      <button
                        type="button"
                        onClick={() => openUpload()}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-brand-purple bg-purple-50 hover:bg-purple-100 rounded-xl transition"
                      >
                        <Plus className="w-4 h-4" /> Upload Production Document
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const latestVersion = doc.versions?.[doc.versions.length - 1] || {};
                  const docName = doc.meta?.title || doc.meta?.name || 'Production Document';
                  const docDate = formatDate(doc.meta?.date || doc.submittedAt);
                  const fileName = latestVersion.originalName || '—';

                  return (
                    <tr key={doc._id}>
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
                          <div className="min-w-0">
                            <span className="doc-table__name block truncate">{docName}</span>
                            <p className="doc-table__hint">
                              Version {doc.currentVersion || 1}
                              {doc.meta?.type ? ` &bull; ${doc.meta.type}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="doc-table__date">{docDate}</span>
                      </td>

                      <td>
                        <span className="doc-table__evidence" title={fileName}>
                          {fileName}
                        </span>
                      </td>

                      <td className="doc-table__status">
                        <StatusBadge status={doc.status} />
                      </td>

                      <td>
                        <div className="doc-icon-actions">
                          {/* View or Review Button */}
                          <button
                            type="button"
                            onClick={() => openPreview(doc)}
                            className="doc-icon-btn doc-icon-btn--view"
                            aria-label={isAdmin ? `Review ${docName}` : `View ${docName}`}
                            title={isAdmin ? 'Review Document' : 'View Document'}
                          >
                            {isAdmin ? <ShieldCheck className="w-4 h-4 text-brand-purple" /> : <Eye className="w-4 h-4" />}
                          </button>

                          {/* Instructor Actions: Replace & Delete */}
                          {!isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => openUpload(doc)}
                                className="doc-icon-btn doc-icon-btn--replace"
                                aria-label={`Replace file of ${docName}`}
                                title="Upload new version"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(doc._id)}
                                disabled={doc.status === 'approved'}
                                className="doc-icon-btn doc-icon-btn--delete"
                                aria-label={`Delete ${docName}`}
                                title={
                                  doc.status === 'approved'
                                    ? 'Approved entries cannot be deleted'
                                    : 'Delete'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        requirement={
          requirement || {
            key: 'FAC_H_PRODUCTION',
            card: 'Production',
            label: 'Production document with certificate',
            multiple: true,
          }
        }
        existingDoc={selectedDoc}
      />

      {/* Preview / Admin Review Modal */}
      <PreviewModal
        isOpen={previewModalOpen}
        onClose={closeModals}
        document={selectedDoc}
        isAdmin={isAdmin}
        onReviewSuccess={onReviewSuccess}
      />
    </div>
  );
}