import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';

import UploadModal from '../../../components/documentActions/UploadModal';
import PreviewModal from '../../../components/documentActions/PreviewModal';
import SharedRequirementHeader from '../../../components/portfolio/SharedRequirementHeader';
import ComplianceCard from '../../../components/portfolio/ComplianceCard';
import CompletionStatusCard from '../../../components/portfolio/CompletionStatusCard';
import FacultyEvidenceSection from '../../../components/portfolio/FacultyEvidenceSection';
import { fetchDocuments, deleteDocument } from '../../../api/documents';

import './requirementStyle.css';
import './listEntries.css';
import AppModal, { useAppModal } from "../../../components/common/AppModal";

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
  key: 'FAC_F_RESEARCH',
  label: 'Research',
  card: 'Research Proposals, and Finished/Published ',
  multiple: true,
  metaFields: [
    { name: 'title', label: 'Research Title', type: 'text', required: true },
    { name: 'type', label: 'Type', type: 'select', required: true, options: ['Published', 'Presented', 'Completed'] },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'abstract', label: 'Abstract', type: 'longtext' },
  ],
};

// ─────────────────────────────────────────────────────────────
// ► CHANGE 2: WORDS (page title, button text, and the noun used
//   in the compliance / completion messages)
// ─────────────────────────────────────────────────────────────
const WORDS = {
  pageTitle: 'Research',
  addButton: 'Upload Document',
  plural: 'research entries',
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
function Research() {
  const { modal, close: closeModal, notify, confirm: showConfirm } = useAppModal();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const isAdmin = pathname.startsWith('/admin');
  const instructorId = searchParams.get('instructorId');

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

  const handleDelete = (doc) => {
    const title = doc.meta?.name || doc.meta?.title || 'this record';
    showConfirm({
      title: 'Delete Document?',
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
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

  // Loads this requirement's documents from the server
  const loadRecords = async () => {
    try {
      setLoading(true);
      const params = { requirementKey: REQUIREMENT.key };
      if (isAdmin && instructorId) {
        params.instructorId = instructorId;
      }
      const data = await fetchDocuments(params);
      setRecords(data || []);
    } catch (err) {
      console.error(`Failed to load ${WORDS.plural}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [isAdmin, instructorId]);

  const { counts, total, percent } = summarize(records);

  // doc = null  -> Add mode.   doc = a record -> Edit / Replace mode
  const openModal = (doc = null) => {
    setSelectedDoc(doc);
    setUploadOpen(true);
  };

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
      <SharedRequirementHeader
        title={WORDS.pageTitle}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <ComplianceCard counts={counts} message={complianceMessage} className="col-span-3" />
        <CompletionStatusCard percent={percent} message={completionMessage} className="col-span-1" />
      </div>

      <FacultyEvidenceSection
        records={records}
        loading={loading}
        isAdmin={isAdmin}
        addLabel={WORDS.addButton}
        onAdd={() => openModal(null)}
        onView={handleView}
        onReplace={(doc) => openModal(doc)}
        onDelete={handleDelete}
        emptyTitle={`No ${WORDS.plural} yet`}
        emptyHint={`Click "${WORDS.addButton}" above to add your first entry.`}
      />

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
        onClose={() => {
          setPreviewOpen(false);
          setPreviewDoc(null);
        }}
        document={previewDoc}
        isAdmin={isAdmin}
        onReviewSuccess={() => {
          setPreviewOpen(false);
          loadRecords();
        }}
        onEdit={(doc) => openModal(doc)}
      />
      <AppModal modal={modal} onClose={closeModal} />
    </div>
  );
}

// ► CHANGE 3 (continued): must match the function name above
export default Research;
