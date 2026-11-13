import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Eye, Upload, RefreshCw, Trash2, CheckSquare, Lock } from 'lucide-react';
import UploadModal from '../../components/documentActions/UploadModal';
import PreviewModal from '../../components/documentActions/PreviewModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import AppModal, { useAppModal } from '../../components/common/AppModal';
import SharedRequirementHeader from '../../components/portfolio/SharedRequirementHeader';
import ComplianceCard from '../../components/portfolio/ComplianceCard';
import CompletionStatusCard from '../../components/portfolio/CompletionStatusCard';
import StatusBadge from '../../components/documentActions/StatusBadge';
import { fetchDocuments, deleteDocument } from '../../api/documents';
import { fetchClassById } from '../../api/classes';
import { formatDate } from '../../utils/formatDate';
import { CLASS_REQUIREMENT_CARDS } from './ViewClassPortfolio';

import ClassRequirementUpload from './ClassRequirementUpload';

import '../portfolioRequirements/FacultyPortfolioRequirements/requirementStyle.css';
import '../portfolioRequirements/FacultyPortfolioRequirements/listEntries.css';

const STATUS_LABEL = {
  draft: 'Not submitted',
  pending_review: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_STYLE = {
  draft: 'pending',
  pending_review: 'pending',
  approved: 'completed',
  rejected: 'rejected',
};

// Requirements configured as single document upload (A 1.0 through J 1.0, plus O, P, Q, R)
const SINGLE_DOCUMENT_REQUIREMENTS = new Set([
  'CLASS_A_LOAD_REPORT',
  'CLASS_B_CLASS_LIST',
  'CLASS_C_SYLLABUS',
  'CLASS_E_POLICIES_RECEIPT',
  'CLASS_F_SYLLABUS_RECEIPT',
  'CLASS_G_SEAT_PLAN',
  'CLASS_H_OFFICERS',
  'CLASS_I_ATTENDANCE',
  'CLASS_J_PRELIM_TEST',
  'CLASS_O_INC_COMPLETION',
  'CLASS_P_SUPERVISORY_OBSERVATION',
  'CLASS_Q_STUDENT_EVALUATION',
  'CLASS_R_LEARNING_CONTRACT',
]);

// Requirements with fixed Midterm and Finalterm term rows
const FIXED_TERM_REQUIREMENTS = new Set([
  'CLASS_K_SIGNED_TOS',
  'CLASS_L_TEST_QUESTIONNAIRE',
]);

const TERMS = ['Midterm', 'Finalterm'];

// Sample Checked Activities definition (16 fixed rows)
const CHECKED_ACTIVITIES_SECTIONS = [
  {
    categoryTitle: 'Instruction of the Activities (per Course Outcome)',
    type: 'instruction',
    coList: ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'],
  },
  {
    categoryTitle: 'Sample of Checked Student Output (3 students with highest, middle and lowest score)',
    type: 'output',
    coList: ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'],
  },
  {
    categoryTitle: 'Answer Key or Rated Rubrics',
    type: 'rubrics',
    coList: ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'],
  },
  {
    categoryTitle: 'Return Output Receipt',
    type: 'return_receipt',
    coList: [null], // single row without CO
  },
];

// M 1.0 Class record and official grade fixed rows
const CLASS_RECORD_ROWS = [
  {
    type: 'raw_score',
    label: 'Raw score (class record) attached some (samples from LMS)',
    hint: 'PDF, DOCX, JPEG, PNG · Maximum 25 MB',
  },
  {
    type: 'gradesheet_signed',
    label: 'Grade sheet (class record) signed.',
    hint: 'PDF, DOCX, JPEG, PNG · Maximum 25 MB',
  },
  {
    type: 'official_gradesheet',
    label: 'Official Grade sheet (Registrar)',
    hint: 'PDF, DOCX, JPEG, PNG · Maximum 25 MB',
  },
  {
    type: 'gclassroom_score',
    label: 'Google Classroom Classwork Score',
    hint: 'PDF, DOCX, JPEG, PNG · Maximum 25 MB',
  },
];

// N 1.0 Student consultation forms fixed rows
const CONSULTATION_ROWS = [
  {
    type: 'consultation_forms',
    label: 'Student Consultation Forms',
    hint: 'PDF, DOCX, JPEG, PNG · Maximum 25 MB',
  },
  {
    type: 'online_consultation_screenshots',
    label: 'Samples Screen shots of online consultation platforms (with section code)',
    hint: 'PDF, DOCX, JPEG, PNG · Maximum 25 MB',
  },
  {
    type: 'addressing_concerns_evidence',
    label: 'Evidence of addressing the student concerns (with section code)',
    hint: 'PDF, DOCX, JPEG, PNG · Maximum 25 MB',
  },
];

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

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
      <svg {...iconProps} className="doc-icon-btn__svg" width="16" height="16" strokeWidth="2">
        {children}
      </svg>
    </button>
  );
}

function summarize(records) {
  const counts = {
    approved: records.filter((r) => r.status === 'approved').length,
    pendingReview: records.filter((r) => r.status === 'pending_review').length,
    rejected: records.filter((r) => r.status === 'rejected').length,
    notSubmitted: records.filter((r) => r.status === 'draft' || r.status === 'missing').length,
  };
  const total = records.length;
  const percent = total ? Math.round((counts.approved / total) * 100) : 0;
  return { counts, total, percent };
}

function getRowActions(status, isArchived = false) {
  return {
    view: { disabled: false },
    replace: { disabled: isArchived, tip: isArchived ? 'Archived (read-only)' : 'Reupload file' },
    remove: { disabled: isArchived || status === 'approved', tip: isArchived ? 'Archived (read-only)' : 'Delete entry' },
  };
}

function getCurrentFileName(doc) {
  const versions = doc?.versions || [];
  if (versions.length === 0) return '—';
  const current = versions.find((v) => v.n === doc.currentVersion);
  return current ? current.originalName : versions[versions.length - 1].originalName;
}

export default function ClassRequirementPage() {
  const { id: classId, reqPath } = useParams();
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  const reqConfig = CLASS_REQUIREMENT_CARDS.find((r) => r.path === reqPath) || {
    key: `CLASS_${reqPath.toUpperCase().replace(/-/g, '_')}`,
    title: 'Requirement Details',
    path: reqPath,
  };

  const isSingle = SINGLE_DOCUMENT_REQUIREMENTS.has(reqConfig.key);
  const isFixedTerm = FIXED_TERM_REQUIREMENTS.has(reqConfig.key);
  const isCheckedActivities = reqConfig.key === 'CLASS_L_CHECKED_ACTIVITIES';
  const isClassRecord = reqConfig.key === 'CLASS_M_CLASS_RECORD';
  const isConsultation = reqConfig.key === 'CLASS_N_STUDENT_CONSULTATION';

  // Collapsible dropdown state for main sections (all expanded by default)
  const [expandedSections, setExpandedSections] = useState({
    instruction: true,
    output: true,
    rubrics: true,
    return_receipt: true,
  });

  const toggleSection = (type) => {
    setExpandedSections((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const [classData, setClassData] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedModalLabel, setSelectedModalLabel] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, doc: null, title: '', loading: false });
  const { modal, close: closeModal, notify } = useAppModal();

  const loadData = async () => {
    try {
      setLoading(true);
      if (classId) {
        const cData = await fetchClassById(classId);
        if (cData?.class) {
          setClassData(cData.class);
        }
      }

      const docs = await fetchDocuments({
        requirementKey: reqConfig.key,
        classId: classId,
      });
      setRecords(docs || []);
    } catch (err) {
      console.error('Failed to load class requirement records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classId, reqPath]);

  const handleView = (doc) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const handleDelete = (doc) => {
    const title =
      doc.meta?.title ||
      doc.meta?.name ||
      (doc.slot?.co ? `${doc.slot.type} - ${doc.slot.co}` : doc.slot?.term) ||
      reqConfig.title ||
      'this record';

    setDeleteModal({ open: true, doc, title, loading: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.doc) return;
    try {
      setDeleteModal((prev) => ({ ...prev, loading: true }));
      await deleteDocument(deleteModal.doc._id);
      await loadData();
      setDeleteModal({ open: false, doc: null, title: '', loading: false });
      notify('success', 'Document Deleted', 'The document has been removed successfully.');
    } catch (err) {
      setDeleteModal({ open: false, doc: null, title: '', loading: false });
      notify('error', 'Delete Failed', err.response?.data?.message || 'Failed to delete document.');
    }
  };

  const isArchived = Boolean(
    classData?.archivedAt ||
    classData?.academicPeriod?.isArchived ||
    classData?.academicPeriod?.status === 'Archived'
  );

  const openModal = (doc = null, slot = null, label = '') => {
    if (isArchived) return;
    setSelectedDoc(doc);
    setSelectedSlot(slot);
    setSelectedModalLabel(label);
    setUploadOpen(true);
  };

  // Fixed term rows for Midterm & Finalterm
  const fixedTermRows = isFixedTerm
    ? TERMS.map((term) => {
        const doc = records.find((r) => r.slot?.term === term);
        return {
          term,
          label: `${reqConfig.title} (${term})`,
          doc,
          hasRecord: Boolean(doc),
          status: doc ? doc.status : 'missing',
          date: doc?.meta?.date || doc?.createdAt,
          fileName: doc ? getCurrentFileName(doc) : null,
          version: doc?.currentVersion || 1,
        };
      })
    : [];

  // Fixed rows for Checked Activities (CO1 - CO5 per category + Return receipt)
  const checkedActivitiesRows = isCheckedActivities
    ? CHECKED_ACTIVITIES_SECTIONS.flatMap((sec) =>
        sec.coList.map((co) => {
          const doc = records.find(
            (r) => r.slot?.type === sec.type && (co ? r.slot?.co === co : true)
          );
          const rowKey = `${sec.type}_${co || 'all'}`;
          const displayTitle = co
            ? `${sec.categoryTitle} - ${co.replace('CO', 'CO ')}`
            : sec.categoryTitle;

          return {
            rowKey,
            categoryTitle: sec.categoryTitle,
            type: sec.type,
            co,
            displayTitle,
            doc,
            hasRecord: Boolean(doc),
            status: doc ? doc.status : 'missing',
            date: doc?.meta?.date || doc?.createdAt,
            fileName: doc ? getCurrentFileName(doc) : null,
            version: doc?.currentVersion || 1,
          };
        })
      )
    : [];

  // Fixed rows for M 1.0 Class record and official grade (4 fixed rows)
  const classRecordRows = isClassRecord
    ? CLASS_RECORD_ROWS.map((row) => {
        const doc = records.find((r) => r.slot?.type === row.type);
        return {
          type: row.type,
          label: row.label,
          hint: row.hint,
          doc,
          hasRecord: Boolean(doc),
          status: doc ? doc.status : 'missing',
          date: doc?.meta?.date || doc?.createdAt,
          fileName: doc ? getCurrentFileName(doc) : null,
          version: doc?.currentVersion || 1,
        };
      })
    : [];

  // Fixed rows for N 1.0 Student consultation forms (3 fixed rows)
  const consultationRows = isConsultation
    ? CONSULTATION_ROWS.map((row) => {
        const doc = records.find((r) => r.slot?.type === row.type);
        return {
          type: row.type,
          label: row.label,
          hint: row.hint,
          doc,
          hasRecord: Boolean(doc),
          status: doc ? doc.status : 'missing',
          date: doc?.meta?.date || doc?.createdAt,
          fileName: doc ? getCurrentFileName(doc) : null,
          version: doc?.currentVersion || 1,
        };
      })
    : [];

  const summaryData = isFixedTerm
    ? fixedTermRows
    : isCheckedActivities
      ? checkedActivitiesRows
      : isClassRecord
        ? classRecordRows
        : isConsultation
          ? consultationRows
          : records;

  const { counts, total, percent } = summarize(summaryData);

  const complianceMessage =
    total === 0
      ? isSingle
        ? 'No document submitted yet. Upload a file to complete this requirement.'
        : 'No documents submitted yet. Add your first entry to get started.'
      : counts.approved === total
        ? 'All submitted documents have been approved.'
        : `${counts.approved} of ${total} documents approved. Please address rejected and/or pending entries.`;

  const completionMessage =
    percent === 100
      ? 'Your requirements have been verified and approved!'
      : total === 0
        ? 'No documents submitted yet.'
        : `${counts.approved} of ${total} documents approved.`;

  // Build requirement definition for the UploadModal
  const modalRequirement = {
    key: reqConfig.key,
    label: selectedModalLabel
      ? selectedModalLabel
      : selectedSlot?.term
        ? `${reqConfig.title} - ${selectedSlot.term}`
        : reqConfig.title,
    card: classData ? `${classData.subject?.code} · ${classData.section?.code}` : 'Class Portfolio',
    multiple: !isSingle && !isFixedTerm && !isCheckedActivities && !isClassRecord && !isConsultation,
    classIds: [classId],
    academicPeriodId: classData?.academicPeriod?._id || classData?.academicPeriod,
    slot: selectedSlot || {},
    metaFields: isSingle || isFixedTerm || isCheckedActivities || isClassRecord || isConsultation
      ? []
      : [
          { name: 'title', label: 'Document / Activity Title', type: 'text', required: true },
          { name: 'date', label: 'Date', type: 'date' },
          { name: 'remarks', label: 'Remarks', type: 'text' },
        ],
  };

  // For single document requirements, if a document already exists, the top action says "Reupload" or hides "Add"
  const singleDocExists = isSingle && records.length > 0;
  const currentSingleDoc = singleDocExists ? records[0] : null;

  // If this requirement is single-document only, render the drag-and-drop single document upload UI
  if (isSingle) {
    return <ClassRequirementUpload reqConfig={reqConfig} classData={classData} onDone={loadData} />;
  }

  return (
    <div className="space-y-5">
      <SharedRequirementHeader
        title={reqConfig.title}
        backTo={isAdmin ? `/admin/class-portfolio/${classId}` : `/instructors/class-portfolio/${classId}`}
        onAddClick={
          isArchived || isAdmin || isFixedTerm || isCheckedActivities || isClassRecord || isConsultation
            ? null // Admin, archived, or fixed rows: no generic add button
            : () => openModal(null)
        }
        addLabel={`Add ${reqConfig.title}`}
      />

      {isArchived && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs sm:text-sm text-brand-purple font-medium">
          <Lock size={15} className="shrink-0 text-brand-purple" />
          <span>
            This requirement belongs to an archived academic record. All documents are preserved in read-only mode for audit &amp; compliance.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <ComplianceCard counts={counts} message={complianceMessage} className="col-span-3" />
        <CompletionStatusCard percent={percent} message={completionMessage} className="col-span-1" />
      </div>

      {isCheckedActivities ? (
        /* ── SAMPLE CHECKED ACTIVITIES ── list-style layout ── */
        <section className="doc-table-card" aria-label={reqConfig.title}>
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
            </table>
          </div>
          {loading ? (
            <div className="px-5 py-6 text-sm text-gray-400">Loading…</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {CHECKED_ACTIVITIES_SECTIONS.map((sec, secIdx) => {
                const isExpanded = expandedSections[sec.type] !== false;
                const sectionUploadedCount = sec.coList.filter((co) =>
                  records.some((r) => r.slot?.type === sec.type && (co ? r.slot?.co === co : true))
                ).length;
                const sectionTotalCount = sec.coList.length;

                return (
                  <React.Fragment key={sec.type}>
                    {/* ── Collapsible section header ── */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSection(sec.type)}
                      onKeyDown={(e) => e.key === 'Enter' && toggleSection(sec.type)}
                      className="flex items-center justify-between gap-3 px-5 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 shadow-sm hover:border-brand-purple hover:text-brand-purple transition"
                          aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-purple/10 text-xs font-bold text-brand-purple">
                          {secIdx + 1}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                          {sec.categoryTitle}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-gray-400">
                        {sectionUploadedCount} of {sectionTotalCount} uploaded
                      </span>
                    </div>

                    {/* ── Expandable sub-items (CO 1 … CO 5 / receipt) ── */}
                    {isExpanded && sec.coList.map((co) => {
                      const doc = records.find(
                        (r) => r.slot?.type === sec.type && (co ? r.slot?.co === co : true)
                      );
                      const hasRecord = Boolean(doc);
                      const status = doc ? doc.status : 'missing';
                      const uploadSlot = { type: sec.type, co };
                      const rowTitle = co ? co.replace('CO', 'CO ') : sec.categoryTitle;
                      const modalLabel = `${sec.categoryTitle} — ${rowTitle}`;

                      return (
                        <div
                          key={`${sec.type}_${co || 'all'}`}
                          className="flex items-center justify-between gap-4 py-3.5 pr-6 pl-12 bg-white border-b border-gray-100 hover:bg-slate-50/50 transition-colors"
                        >
                          {/* Icon + name + subtitle */}
                          <div className="flex flex-1 min-w-0 items-center gap-3.5">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-6 h-6 shrink-0 text-brand-purple"
                              aria-hidden="true"
                            >
                              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                              <path d="M14 3v5h5M9 13h6M9 17h6" />
                            </svg>
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-[15px] font-semibold text-brand-purple">
                                  {rowTitle}
                                </span>
                                <span className="text-[10px] font-semibold tracking-wider uppercase text-red-500 rounded-sm border border-gray-200 px-1 py-0.5">
                                  Required
                                </span>
                              </div>
                              <p className="text-[12px] text-gray-400 mt-0.5 truncate">
                                {doc ? getCurrentFileName(doc) : 'PDF, DOCX, JPEG, PNG · Maximum 25 MB'}
                              </p>
                            </div>
                          </div>

                          {/* Status pill */}
                          <div className="shrink-0 text-center">
                            <StatusBadge status={status} />
                          </div>

                          {/* View + Upload/Reupload buttons */}
                          <div className="flex shrink-0 items-center gap-2">
                            {isAdmin ? (
                              status === 'approved' || status === 'rejected' ? (
                                <span className="doc-badge--reviewed">
                                  <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                                  Reviewed
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="doc-btn doc-btn--review"
                                  disabled={!hasRecord}
                                  title={hasRecord ? 'Review document' : 'No document submitted yet'}
                                  onClick={() => handleView(doc)}
                                >
                                  <CheckSquare className="w-4 h-4" />
                                  Review
                                </button>
                              )
                            ) : isArchived ? (
                              <button
                                type="button"
                                className="doc-btn doc-btn--view"
                                disabled={!hasRecord}
                                title={hasRecord ? 'View document' : 'No document submitted'}
                                onClick={() => handleView(doc)}
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="doc-btn doc-btn--view"
                                  disabled={!hasRecord}
                                  title={hasRecord ? 'View document' : 'Upload a file first'}
                                  onClick={() => handleView(doc)}
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </button>

                                {!hasRecord ? (
                                  <button
                                    type="button"
                                    className="doc-btn doc-btn--upload"
                                    title="Upload document"
                                    onClick={() => openModal(null, uploadSlot, modalLabel)}
                                  >
                                    <Upload className="w-4 h-4" />
                                    Upload
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="doc-btn doc-btn--reupload"
                                    title="Upload replacement version"
                                    onClick={() => openModal(doc, uploadSlot, modalLabel)}
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Reupload
                                  </button>
                                )}

                                {hasRecord && status !== 'approved' && (
                                  <button
                                    type="button"
                                    className="doc-btn border-red-200 text-red-600 hover:bg-red-50 p-2 rounded"
                                    title="Delete document"
                                    onClick={() => handleDelete(doc)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </section>
      ) : isClassRecord ? (
        /* ── M 1.0 CLASS RECORD AND OFFICIAL GRADE ── list-style layout ── */
        <section className="doc-table-card" aria-label={reqConfig.title}>
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
                    <td colSpan={3} className="doc-table__empty">Loading...</td>
                  </tr>
                ) : (
                  classRecordRows.map((row) => {
                    const doc = row.doc;
                    const hasRecord = row.hasRecord;
                    const status = row.status;
                    const uploadSlot = { type: row.type };
                    const modalLabel = `${reqConfig.title} — ${row.label}`;

                    return (
                      <tr key={row.type}>
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
                                  Required
                                </span>
                              </div>
                              <p className="text-[12px] text-gray-400">
                                {doc ? getCurrentFileName(doc) : row.hint}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="doc-table__status">
                          <StatusBadge status={status} />
                        </td>

                        <td>
                          <div className="doc-actions flex items-center gap-2">
                            {isAdmin ? (
                              status === 'approved' || status === 'rejected' ? (
                                <span className="doc-badge--reviewed">
                                  <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                                  Reviewed
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="doc-btn doc-btn--review"
                                  disabled={!hasRecord}
                                  title={hasRecord ? 'Review document' : 'No document submitted yet'}
                                  onClick={() => handleView(doc)}
                                >
                                  <CheckSquare className="w-4 h-4" />
                                  Review
                                </button>
                              )
                            ) : isArchived ? (
                              <button
                                type="button"
                                className="doc-btn doc-btn--view"
                                disabled={!hasRecord}
                                title={hasRecord ? 'View document' : 'No document submitted'}
                                onClick={() => handleView(doc)}
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="doc-btn doc-btn--view"
                                  disabled={!hasRecord}
                                  title={hasRecord ? 'View document' : 'Upload a file first'}
                                  onClick={() => handleView(doc)}
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </button>

                                {!hasRecord ? (
                                  <button
                                    type="button"
                                    className="doc-btn doc-btn--upload"
                                    title="Upload document"
                                    onClick={() => openModal(null, uploadSlot, modalLabel)}
                                  >
                                    <Upload className="w-4 h-4" />
                                    Upload
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="doc-btn doc-btn--reupload"
                                    title="Upload replacement version"
                                    onClick={() => openModal(doc, uploadSlot, modalLabel)}
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Reupload
                                  </button>
                                )}

                                {hasRecord && status !== 'approved' && (
                                  <button
                                    type="button"
                                    className="doc-btn border-red-200 text-red-600 hover:bg-red-50 p-2 rounded"
                                    title="Delete document"
                                    onClick={() => handleDelete(doc)}
                                  >
                                    <Trash2 className="w-4 h-4" />
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
      ) : isConsultation ? (
        /* ── N 1.0 STUDENT CONSULTATION FORMS ── list-style layout ── */
        <section className="doc-table-card" aria-label={reqConfig.title}>
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
                    <td colSpan={3} className="doc-table__empty">Loading...</td>
                  </tr>
                ) : (
                  consultationRows.map((row) => {
                    const doc = row.doc;
                    const hasRecord = row.hasRecord;
                    const status = row.status;
                    const uploadSlot = { type: row.type };
                    const modalLabel = `${reqConfig.title} — ${row.label}`;

                    return (
                      <tr key={row.type}>
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
                                  Required
                                </span>
                              </div>
                              <p className="text-[12px] text-gray-400">
                                {doc ? getCurrentFileName(doc) : row.hint}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="doc-table__status">
                          <StatusBadge status={status} />
                        </td>

                        <td>
                          <div className="doc-actions flex items-center gap-2">
                            {isAdmin ? (
                              status === 'approved' || status === 'rejected' ? (
                                <span className="doc-badge--reviewed">
                                  <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                                  Reviewed
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="doc-btn doc-btn--review"
                                  disabled={!hasRecord}
                                  title={hasRecord ? 'Review document' : 'No document submitted yet'}
                                  onClick={() => handleView(doc)}
                                >
                                  <CheckSquare className="w-4 h-4" />
                                  Review
                                </button>
                              )
                            ) : isArchived ? (
                              <button
                                type="button"
                                className="doc-btn doc-btn--view"
                                disabled={!hasRecord}
                                title={hasRecord ? 'View document' : 'No document submitted'}
                                onClick={() => handleView(doc)}
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="doc-btn doc-btn--view"
                                  disabled={!hasRecord}
                                  title={hasRecord ? 'View document' : 'Upload a file first'}
                                  onClick={() => handleView(doc)}
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </button>

                                {!hasRecord ? (
                                  <button
                                    type="button"
                                    className="doc-btn doc-btn--upload"
                                    title="Upload document"
                                    onClick={() => openModal(null, uploadSlot, modalLabel)}
                                  >
                                    <Upload className="w-4 h-4" />
                                    Upload
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="doc-btn doc-btn--reupload"
                                    title="Upload replacement version"
                                    onClick={() => openModal(doc, uploadSlot, modalLabel)}
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Reupload
                                  </button>
                                )}

                                {hasRecord && status !== 'approved' && (
                                  <button
                                    type="button"
                                    className="doc-btn border-red-200 text-red-600 hover:bg-red-50 p-2 rounded"
                                    title="Delete document"
                                    onClick={() => handleDelete(doc)}
                                  >
                                    <Trash2 className="w-4 h-4" />
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
      ) : (
        /* ── ALL OTHER REQUIREMENTS ── table layout ── */
      <section className="doc-table-card" aria-label={reqConfig.title}>
        <div className="doc-table-scroll" style={{ overflowX: 'auto' }}>
          <table
            className="doc-table doc-table--entries"
            style={{ tableLayout: 'auto', width: '100%', minWidth: '1000px' }}
          >
            <thead>
              <tr>
                <th scope="col" className="whitespace-nowrap">Name</th>
                <th scope="col" className="whitespace-nowrap">Date</th>
                <th scope="col" className="whitespace-nowrap">Attached Evidence</th>
                <th scope="col" className="doc-table__status whitespace-nowrap">Status</th>
                <th scope="col" className="whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="doc-table__empty">Loading...</td>
                </tr>
              ) : isFixedTerm ? (
                /* FIXED ROWS FOR MIDTERM AND FINALTERM */
                fixedTermRows.map((row) => {
                  const doc = row.doc;
                  const hasRecord = row.hasRecord;
                  const actions = getRowActions(row.status, isArchived);

                  return (
                    <tr key={row.term}>
                      <td className="whitespace-nowrap">
                        <div className="doc-table__type">
                          <svg {...iconProps} className="doc-table__icon" width="26" height="26" strokeWidth="1.6">
                            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                            <path d="M14 3v5h5M9 13h6M9 17h6" />
                          </svg>
                          <div>
                            <span className="doc-table__name font-semibold">{row.term}</span>
                            <p className="text-[13px] text-gray-400">{reqConfig.title}</p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap">
                        {hasRecord ? formatDate(row.date) : '—'}
                      </td>

                      <td className="whitespace-nowrap">
                        {hasRecord ? (
                          <>
                            <span
                              className="doc-table__evidence"
                              title={row.fileName}
                              style={{ display: 'inline', maxWidth: 'none', overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }}
                            >
                              {row.fileName}
                            </span>
                            {row.version > 1 && <span className="doc-table__hint"> v{row.version}</span>}
                          </>
                        ) : (
                          <span className="text-gray-400 italic text-xs">No file uploaded</span>
                        )}
                      </td>

                      <td className="doc-table__status whitespace-nowrap">
                        <StatusBadge status={row.status} />
                      </td>

                      <td className="whitespace-nowrap">
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
                              disabled={!hasRecord}
                              title={hasRecord ? 'Review document' : 'No document submitted yet'}
                              onClick={() => handleView(doc)}
                            >
                              <CheckSquare className="w-4 h-4" />
                              Review
                            </button>
                          )
                        ) : (
                          <div className="doc-icon-actions">
                            {hasRecord ? (
                              <>
                                <IconButton
                                  variant="view"
                                  label={`View ${row.term}`}
                                  title="View"
                                  disabled={actions.view.disabled}
                                  onClick={() => handleView(doc)}
                                >
                                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                                  <circle cx="12" cy="12" r="3" />
                                </IconButton>

                                <IconButton
                                  variant="replace"
                                  label={`Reupload ${row.term}`}
                                  title="Reupload"
                                  disabled={actions.replace.disabled}
                                  onClick={() => openModal(doc, { term: row.term })}
                                >
                                  <path d="M21 12a9 9 0 1 1-3-6.7" />
                                  <path d="M21 4v5h-5" />
                                </IconButton>

                                <IconButton
                                  variant="delete"
                                  label={`Delete ${row.term}`}
                                  title={actions.remove.disabled ? actions.remove.tip : 'Delete'}
                                  disabled={actions.remove.disabled}
                                  onClick={() => handleDelete(doc)}
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </IconButton>
                              </>
                            ) : isArchived ? (
                              <span className="text-gray-400 italic text-xs">Archived (read-only)</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openModal(null, { term: row.term })}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-opacity-90 shadow-2xs"
                              >
                                <span>Upload {row.term}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="doc-table__empty">
                    No entries yet. Click &quot;Add {reqConfig.title}&quot; above to submit evidence.
                  </td>
                </tr>
              ) : (
                records.map((doc) => {
                  const actions = getRowActions(doc.status, isArchived);
                  const title = doc.meta?.title || doc.meta?.name || reqConfig.title || 'Class Document';
                  const fileName = getCurrentFileName(doc);

                  return (
                    <tr key={doc._id}>
                      <td className="whitespace-nowrap">
                        <div className="doc-table__type">
                          <svg {...iconProps} className="doc-table__icon" width="26" height="26" strokeWidth="1.6">
                            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                            <path d="M14 3v5h5M9 13h6M9 17h6" />
                          </svg>
                          <div>
                            <span className="doc-table__name">{title}</span>
                            <p className="text-[13px] text-gray-400">Class Portfolio Entry</p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap">{formatDate(doc.meta?.date || doc.createdAt)}</td>

                      <td className="whitespace-nowrap">
                        <span
                          className="doc-table__evidence"
                          title={fileName}
                          style={{ display: 'inline', maxWidth: 'none', overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }}
                        >
                          {fileName}
                        </span>
                        {doc.currentVersion > 1 && <span className="doc-table__hint"> v{doc.currentVersion}</span>}
                      </td>

                      <td className="doc-table__status whitespace-nowrap">
                        <span className={`doc-status doc-status--${STATUS_STYLE[doc.status] || 'pending'}`}>
                          {STATUS_LABEL[doc.status] || doc.status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap">
                        {isAdmin ? (
                          doc.status === 'approved' || doc.status === 'rejected' ? (
                            <span className="doc-badge--reviewed">
                              <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                              Reviewed
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="doc-btn doc-btn--review"
                              disabled={!doc}
                              title="Review document"
                              onClick={() => handleView(doc)}
                            >
                              <CheckSquare className="w-4 h-4" />
                              Review
                            </button>
                          )
                        ) : (
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
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </IconButton>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* Upload Modal (Reused existing component) */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        requirement={modalRequirement}
        existingDoc={selectedDoc}
        slot={selectedSlot}
        onSuccess={() => loadData()}
      />

      {/* Preview Modal (Reused existing component) */}
      <PreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        document={previewDoc}
        isAdmin={isAdmin}
        onReviewSuccess={() => loadData()}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={deleteModal.open}
        title={
          reqConfig.key === 'CLASS_A_LOAD_REPORT'
            ? 'Delete Instructional Load Report'
            : 'Delete Document?'
        }
        message={
          reqConfig.key === 'CLASS_A_LOAD_REPORT'
            ? 'This will remove the Instructional Load Report for all of your classes in this semester. Are you sure you want to delete this document?'
            : `Are you sure you want to delete "${deleteModal.title}"? This action cannot be undone.`
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteModal.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleteModal.loading && setDeleteModal({ open: false, doc: null, title: '', loading: false })}
      />

      <AppModal modal={modal} onClose={closeModal} />
    </div>
  );
}
