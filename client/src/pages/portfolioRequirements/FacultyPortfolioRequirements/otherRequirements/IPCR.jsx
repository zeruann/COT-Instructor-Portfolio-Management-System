import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';

import UploadModal from '../../../../components/documentActions/UploadModal';
import PreviewModal from '../../../../components/documentActions/PreviewModal';
import ComplianceCard from '../../../../components/portfolio/ComplianceCard';
import CompletionStatusCard from '../../../../components/portfolio/CompletionStatusCard';
import { fetchDocuments, deleteDocument } from '../../../../api/documents';

import '../requirementStyle.css';
import '../listEntries.css';

// Tab page of Other Requirements. The title, back arrow, tabs and the "Add Document" button
// are drawn by the parent (OtherRequirements.jsx). The parent's button bumps `addTrigger`,
// and the tab that is open (this page) reacts by opening ITS OWN upload popup (REQUIREMENT below).

/* ═════════════════════════════════════════════════════════════
   HOW TO REUSE THIS PAGE FOR ANOTHER DOCUMENT
   Copy this file, rename it, then change ONLY the places marked:
     ► CHANGE 1  the requirement (key + popup fields)
     ► CHANGE 2  the words shown on the page
     ► CHANGE 3  the function name (and the export at the bottom)
     ► CHANGE 4  the table headings
     ► CHANGE 5  the table cells (same order as the headings)
   Everything else is shared and stays the same.
   ═════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────
// ► CHANGE 1: REQUIREMENT
//   key        -> must match the requirement key in the database seed
//   metaFields -> inputs shown in the upload popup (they are saved
//                 in doc.meta, whether or not the table shows them)
//   type can be: text | date | select | url | longtext
// ─────────────────────────────────────────────────────────────
const REQUIREMENT = {
  key: 'FAC_L_IPCR',
  label: 'IPCR',
  card: 'Photocopies of IPCRs for the 1st and 2nd Semesters of the Current School Year',
  multiple: true,
  metaFields: [
    { name: 'name', label: 'Title / Period (e.g. IPCR 1st Semester, 2025–2026)', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
  ],
};

// ─────────────────────────────────────────────────────────────
// ► CHANGE 2: WORDS (page title, button text, and the noun used
//   in the compliance / completion messages)
// ─────────────────────────────────────────────────────────────
const WORDS = {
  pageTitle: 'IPCR',
  addButton: 'Add Document',
  plural: 'IPCR records',
};

// ═════════════════════════════════════════════════════════════
// SHARED HELPERS — identical in every list page, do not change
// ═════════════════════════════════════════════════════════════
const STATUS_LABEL = {
  draft: 'Not submitted',
  pending_review: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_STYLE = {
  draft: 'pending',
  pending_review: 'pending',
  approved: 'completed',
  rejected: 'rejected',
};

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

// Counts per status + percent approved (feeds the two cards at the top)
function summarize(records) {
  const counts = {
    approved: records.filter((r) => r.status === 'approved').length,
    pendingReview: records.filter((r) => r.status === 'pending_review').length,
    rejected: records.filter((r) => r.status === 'rejected').length,
    notSubmitted: records.filter((r) => r.status === 'draft').length,
  };
  const total = records.length;
  const percent = total ? Math.round((counts.approved / total) * 100) : 0;
  return { counts, total, percent };
}

// Which row buttons are enabled for each status
function getRowActions(status) {
  return {
    view: { disabled: false },
    replace: {
      disabled: false,
      tip: 'Reupload file',
    },
    remove: {
      disabled: status === 'approved',
      tip: 'Approved entries cannot be deleted.',
    },
  };
}

// File name of the CURRENT version (not the first upload)
function getCurrentFileName(doc) {
  const current = doc.versions?.find((v) => v.n === doc.currentVersion);
  return (current || doc.versions?.[doc.versions.length - 1])?.originalName || '—';
}

// "2024-03-15"  ->  "Mar 15, 2024"
function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day); // local date, so no timezone shift
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// One day -> "Mar 15, 2024"    Range -> "Mar 15, 2024 – Mar 17, 2024"
function formatDateRange(from, to) {
  if (!from) return '—';
  return to && to !== from ? `${formatDate(from)} – ${formatDate(to)}` : formatDate(from);
}

function IconButton({ variant, label, title, disabled, onClick, children }) {
  return (
    <button
      type="button"
      className={`doc-icon-btn doc-icon-btn--${variant}`}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      <svg {...iconProps} width="16" height="16" strokeWidth="2">
        {children}
      </svg>
    </button>
  );
}

// ═════════════════════════════════════════════════════════════
// THE PAGE
// ═════════════════════════════════════════════════════════════

// ► CHANGE 3: rename the function (must match the export at the bottom)
function IPCR() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const handleView = (doc) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const handleDelete = async (doc) => {
    const title = doc.meta?.name || 'this record';
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }
    try {
      await deleteDocument(doc._id);
      loadRecords();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete document.');
    }
  };

  // Loads this requirement's documents from the server
  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await fetchDocuments({ requirementKey: REQUIREMENT.key });
      setRecords(data || []);
    } catch (err) {
      console.error(`Failed to load ${WORDS.plural}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const { counts, total, percent } = summarize(records);

  // doc = null  -> Add mode.   doc = a record -> Edit / Replace mode
  const openModal = (doc = null) => {
    setSelectedDoc(doc);
    setUploadOpen(true);
  };

  // The parent's "Add Document" button bumps addTrigger -> open the Add popup of THIS tab.
  // lastTrigger remembers the value we started with, so switching tabs does not open it by accident.
  const { addTrigger } = useOutletContext() || {};
  const lastTrigger = useRef(addTrigger);
  useEffect(() => {
    if (addTrigger !== lastTrigger.current) {
      lastTrigger.current = addTrigger;
      openModal(null);
    }
  }, [addTrigger]);

  const complianceMessage =
    total === 0
      ? `No ${WORDS.plural} yet. Add your first entry to get started.`
      : counts.approved === total
        ? `All ${WORDS.plural} have been approved.`
        : `${counts.approved} of ${total} ${WORDS.plural} approved. Please address rejected and/or pending entries.`;

  const completionMessage =
    percent === 100
      ? `Your ${WORDS.plural} have been verified and approved!`
      : total === 0
        ? `No ${WORDS.plural} yet.`
        : `${counts.approved} of ${total} ${WORDS.plural} approved.`;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <ComplianceCard counts={counts} message={complianceMessage} className="col-span-3" />
        <CompletionStatusCard percent={percent} message={completionMessage} className="col-span-1" />
      </div>

      <section className="doc-table-card" aria-label={WORDS.pageTitle}>
        {/* SCROLL: the wrapper scrolls sideways; the table keeps a minimum
            width so columns never squeeze. Raise minWidth if still too tight. */}
        <div className="doc-table-scroll" style={{ overflowX: 'auto' }}>
          <table
            className="doc-table doc-table--entries"
            style={{ tableLayout: 'auto', width: '100%', minWidth: '1100px' }}
          >
            <thead>
              <tr>
                {/* ► CHANGE 4: TABLE HEADINGS
                    One <th> per column. Same order as the cells below.
                    To remove a column: delete its <th> here AND its <td> below,
                    then lower the colSpan numbers (search "colSpan"). */}
                <th scope="col" className="whitespace-nowrap">Name</th>
                <th scope="col" className="whitespace-nowrap">Date</th>
                <th scope="col" className="whitespace-nowrap">Attached Evidence</th>

                {/* Keep these two on every list page */}
                <th scope="col" className="doc-table__status whitespace-nowrap">Status</th>
                <th scope="col" className="whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody>
              {/* colSpan = number of headings above (5 here) */}
              {loading ? (
                <tr>
                  <td colSpan={5} className="doc-table__empty">Loading...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="doc-table__empty">
                    No {WORDS.plural} yet. Click "{WORDS.addButton}" to add one.
                  </td>
                </tr>
              ) : (
                records.map((doc) => {
                  const actions = getRowActions(doc.status);
                  const title = doc.meta?.name || '—';

                  return (
                    <tr key={doc._id}>

                      {/* ► CHANGE 5: TABLE CELLS
                          One <td> per heading, SAME ORDER.
                          doc.meta.<name> must match a "name" in REQUIREMENT.metaFields.
                          Use formatDate(...) for dates -> "Mar 15, 2024". */}

                      {/* Title */}
                      <td className="whitespace-nowrap">
                        <div className="doc-table__type">
                          <svg {...iconProps} className="doc-table__icon" width="26" height="26" strokeWidth="1.6">
                            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                            <path d="M14 3v5h5M9 13h6M9 17h6" />
                          </svg>
                          <div>
                            <span className="doc-table__name">{title}</span>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap">{formatDate(doc.meta?.date)}</td>

                      {/* Current file name + version tag (full name, never cut off) */}
                      <td className="whitespace-nowrap">
                        <span
                          className="doc-table__evidence"
                          title={getCurrentFileName(doc)}
                          style={{ display: 'inline', maxWidth: 'none', overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }}
                        >
                          {getCurrentFileName(doc)}
                        </span>
                        {doc.currentVersion > 1 && <span className="doc-table__hint"> v{doc.currentVersion}</span>}
                      </td>

                      {/* Keep these two on every list page ------------------- */}
                      <td className="doc-table__status whitespace-nowrap">
                        <span className={`doc-status doc-status--${STATUS_STYLE[doc.status] || 'pending'}`}>
                          {STATUS_LABEL[doc.status] || doc.status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap">
                        <div className="doc-icon-actions">
                          <IconButton
                            variant="view"
                            label={`View ${title}`}
                            title="View"
                            disabled={actions.view.disabled}
                            onClick={() => handleView(doc)}
                          >
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                            <circle cx="12" cy="12" r="3" />
                          </IconButton>

                          <IconButton
                            variant="replace"
                            label={`Reupload ${title}`}
                            title="Reupload"
                            disabled={actions.replace.disabled}
                            onClick={() => openModal(doc)}
                          >
                            <path d="M21 12a9 9 0 1 1-3-6.7" />
                            <path d="M21 4v5h-5" />
                          </IconButton>

                          <IconButton
                            variant="delete"
                            label={`Delete ${title}`}
                            title={actions.remove.disabled ? actions.remove.tip : 'Delete'}
                            disabled={actions.remove.disabled}
                            onClick={() => handleDelete(doc)}
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                          </IconButton>
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

      {/* Upload popup: Add / Edit / Replace. Uses REQUIREMENT from CHANGE 1 */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        requirement={REQUIREMENT}
        existingDoc={selectedDoc}
        onSuccess={() => loadRecords()}
      />

      {/* Preview popup */}
      <PreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        document={previewDoc}
        onEdit={(doc) => openModal(doc)}
      />
    </div>
  );
}

// ► CHANGE 3 (continued): must match the function name above
export default IPCR;