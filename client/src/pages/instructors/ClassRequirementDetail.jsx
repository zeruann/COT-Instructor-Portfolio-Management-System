import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Eye, Upload, RefreshCw, Trash2, CheckSquare, Lock, FileText } from 'lucide-react';
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

// Requirements configured with the unified Submitted Evidence + multi-document upload UI
const SINGLE_DOCUMENT_REQUIREMENTS = new Set([
  'CLASS_A_LOAD_REPORT',
  'CLASS_B_CLASS_LIST',
  'CLASS_C_SYLLABUS',
  'CLASS_D_IM',
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

const CO_GROUPS = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'];
const CO_SUB_ITEMS = [
  { type: 'instruction', label: 'Instruction of the Activity' },
  { type: 'output', label: 'Sample Checked Activities' },
  { type: 'rubrics', label: 'Answer Key/Rated Rubrics' },
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

function FixedSlotRowCard({
  title,
  doc,
  status,
  hasRecord,
  isAdmin,
  isArchived,
  requiredLabel = 'Required',
  onView,
  onUpload,
  onDelete,
}) {
  const fileName = doc ? getCurrentFileName(doc) : null;
  const remarks = doc?.review?.comment || doc?.comment;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-gray-200 bg-gray-50">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-brand-purple shrink-0">
          <FileText size={24} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-gray-900">
              {title}
            </h3>
            {requiredLabel && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-600 border-gray-200">
                {requiredLabel}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
            <StatusBadge status={status} />
            <span className="truncate max-w-[320px]" title={fileName || undefined}>
              {fileName || 'PDF, DOCX, JPEG, PNG · Maximum 25 MB'}
            </span>
            {hasRecord && doc?.submittedAt && (
              <span>· Submitted {formatDate(doc.submittedAt)}</span>
            )}
          </div>
          {remarks && status === 'rejected' && (
            <p className="mt-1.5 text-xs text-red-600 font-medium">
              Admin Remarks: {remarks}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {isAdmin ? (
          <button
            type="button"
            disabled={!hasRecord}
            onClick={() => onView(doc)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-orange-600 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckSquare size={16} />
            <span>Review Document</span>
          </button>
        ) : (
          <>
            {hasRecord && (
              <button
                type="button"
                onClick={() => onView(doc)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-opacity-90 transition cursor-pointer"
              >
                <Eye size={16} />
                <span>View Document</span>
              </button>
            )}

            {!isArchived && status !== 'approved' && (
              <button
                type="button"
                onClick={onUpload}
                className={
                  hasRecord
                    ? 'inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer'
                    : 'inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-orange-600 transition cursor-pointer'
                }
              >
                {hasRecord ? (
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

            {hasRecord && !isArchived && status !== 'approved' && (
              <button
                type="button"
                onClick={() => onDelete(doc)}
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
  );
}

export default function ClassRequirementPage({
  classId: propClassId,
  reqPath: propReqPath,
  isAdminOverride,
  embedded = false,
  onBack,
} = {}) {
  const { id: paramClassId, reqPath: paramReqPath } = useParams();
  const { pathname } = useLocation();
  const classId = propClassId || paramClassId;
  const reqPath = propReqPath || paramReqPath;
  const isAdmin = isAdminOverride ?? pathname.startsWith('/admin');

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

  // Collapsible dropdown state for CO groups (smooth accordion)
  const [expandedCos, setExpandedCos] = useState({
    CO1: false,
    CO2: false,
    CO3: false,
    CO4: false,
    CO5: false,
  });

  const toggleCo = (co) => {
    setExpandedCos((prev) => ({
      ...prev,
      [co]: !prev[co],
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
    return (
      <ClassRequirementUpload
        reqConfig={reqConfig}
        classData={classData}
        onDone={loadData}
        classId={classId}
        reqPath={reqPath}
        isAdminOverride={isAdmin}
        embedded={embedded}
        onBack={onBack}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SharedRequirementHeader
        title={reqConfig.title}
        backTo={isAdmin ? `/admin/class-portfolio/${classId}` : `/instructors/class-portfolio/${classId}`}
        embedded={embedded}
        onBack={onBack}
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
        /* ── SAMPLE CHECKED ACTIVITIES ── card-row layout ── */
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="border-b border-gray-100 pb-5">
            <h2 className="text-xl font-bold text-brand-purple">Submitted Evidence</h2>
            <p className="mt-1 text-sm text-gray-400">
              {isAdmin
                ? 'Review submitted document evidence and provide feedback or approval.'
                : 'Upload the required evidence for each course outcome section below.'}
            </p>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
          ) : (
            <div className="mt-6 space-y-4">
              {/* Return Output Receipt (standalone, on top of CO dropdowns) */}
              {(() => {
                const receiptDoc = records.find((r) => r.slot?.type === 'return_receipt');
                return (
                  <FixedSlotRowCard
                    title="Return Output Receipt"
                    doc={receiptDoc}
                    status={receiptDoc ? receiptDoc.status : 'missing'}
                    hasRecord={Boolean(receiptDoc)}
                    isAdmin={isAdmin}
                    isArchived={isArchived}
                    onView={handleView}
                    onUpload={() =>
                      openModal(
                        receiptDoc || null,
                        { type: 'return_receipt', co: null },
                        'Return Output Receipt'
                      )
                    }
                    onDelete={handleDelete}
                  />
                );
              })()}

              {/* CO1 .. CO5 smooth collapsible dropdowns */}
              {CO_GROUPS.map((co) => {
                const isExpanded = Boolean(expandedCos[co]);
                const uploadedCount = CO_SUB_ITEMS.filter((item) =>
                  records.some((r) => r.slot?.type === item.type && r.slot?.co === co)
                ).length;

                return (
                  <div key={co} className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCo(co)}
                      aria-expanded={isExpanded}
                      className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-gray-100/70 transition-colors cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-brand-purple">
                          <ChevronRight
                            size={18}
                            className={`transition-transform duration-300 ease-in-out ${
                              isExpanded ? 'rotate-90' : 'rotate-0'
                            }`}
                          />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-gray-900">
                            {co}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {uploadedCount} of {CO_SUB_ITEMS.length} uploaded
                          </p>
                        </div>
                      </div>
                    </button>

                    <div
                      className={`grid transition-all duration-300 ease-in-out ${
                        isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="p-4 space-y-3 bg-white border-t border-gray-200">
                          {CO_SUB_ITEMS.map((item) => {
                            const doc = records.find(
                              (r) => r.slot?.type === item.type && r.slot?.co === co
                            );
                            const hasRecord = Boolean(doc);
                            const status = doc ? doc.status : 'missing';
                            const uploadSlot = { type: item.type, co };
                            const modalLabel = `${co} — ${item.label}`;

                            return (
                              <FixedSlotRowCard
                                key={`${item.type}_${co}`}
                                title={item.label}
                                doc={doc}
                                status={status}
                                hasRecord={hasRecord}
                                isAdmin={isAdmin}
                                isArchived={isArchived}
                                onView={handleView}
                                onUpload={() => openModal(doc || null, uploadSlot, modalLabel)}
                                onDelete={handleDelete}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : isClassRecord ? (
        /* ── M 1.0 CLASS RECORD AND OFFICIAL GRADE ── card-row layout ── */
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="border-b border-gray-100 pb-5">
            <h2 className="text-xl font-bold text-brand-purple">Submitted Evidence</h2>
            <p className="mt-1 text-sm text-gray-400">
              {isAdmin
                ? 'Review submitted document evidence and provide feedback or approval.'
                : 'Upload each required class record and grade sheet below.'}
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
            ) : (
              classRecordRows.map((row) => (
                <FixedSlotRowCard
                  key={row.type}
                  title={row.label}
                  doc={row.doc}
                  status={row.status}
                  hasRecord={row.hasRecord}
                  isAdmin={isAdmin}
                  isArchived={isArchived}
                  onView={handleView}
                  onUpload={() => openModal(row.doc || null, { type: row.type }, row.label)}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      ) : isConsultation ? (
        /* ── N 1.0 STUDENT CONSULTATION FORMS ── card-row layout ── */
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="border-b border-gray-100 pb-5">
            <h2 className="text-xl font-bold text-brand-purple">Submitted Evidence</h2>
            <p className="mt-1 text-sm text-gray-400">
              {isAdmin
                ? 'Review submitted document evidence and provide feedback or approval.'
                : 'Upload each required student consultation document below.'}
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
            ) : (
              consultationRows.map((row) => (
                <FixedSlotRowCard
                  key={row.type}
                  title={row.label}
                  doc={row.doc}
                  status={row.status}
                  hasRecord={row.hasRecord}
                  isAdmin={isAdmin}
                  isArchived={isArchived}
                  onView={handleView}
                  onUpload={() => openModal(row.doc || null, { type: row.type }, row.label)}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      ) : isFixedTerm ? (
        /* ── FIXED TERM REQUIREMENTS (K 1.0 Signed TOS / L 1.0 Test Questionnaire) ── card-row layout ── */
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="border-b border-gray-100 pb-5">
            <h2 className="text-xl font-bold text-brand-purple">Submitted Evidence</h2>
            <p className="mt-1 text-sm text-gray-400">
              {isAdmin
                ? 'Review submitted document evidence and provide feedback or approval.'
                : 'Upload the Midterm and Finalterm documents below.'}
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
            ) : (
              fixedTermRows.map((row) => (
                <FixedSlotRowCard
                  key={row.term}
                  title={`${row.term} — ${reqConfig.title}`}
                  doc={row.doc}
                  status={row.status}
                  hasRecord={row.hasRecord}
                  isAdmin={isAdmin}
                  isArchived={isArchived}
                  onView={handleView}
                  onUpload={() => openModal(row.doc || null, { term: row.term }, `${row.term} — ${reqConfig.title}`)}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
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
