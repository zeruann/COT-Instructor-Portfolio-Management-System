import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, X, Search, BookOpen, AlertCircle, Loader2, MoreVertical, Archive, Edit3, ChevronUp, ChevronDown } from 'lucide-react';
import PlaceholderPage from '../../components/layout/PlaceholderPage';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { fetchClasses, createClass, updateClass, archiveClass } from '../../api/classes';

function ClassCard({ classItem, onOpen, onArchive, onEdit, menuOpen, onToggleMenu, onCloseMenu }) {
  const {
    subject,
    section,
    academicPeriod,
    approvedCount = 0,
    pendingCount = 0,
    rejectedCount = 0,
    totalRequired = 31,
  } = classItem;

  const subjectCode = subject?.code || 'SUBJ';
  const subjectName = subject?.name && subject.name.toLowerCase() !== subjectCode.toLowerCase() ? subject.name : '';
  const sectionCode = section?.code || 'SEC';
  const program = section?.name || section?.code || '';
  const academicYear = academicPeriod?.schoolYear || '2026-2027';
  const semester = academicPeriod?.semester ? `${academicPeriod.semester} Semester` : '1st Semester';

  const displayCode = `${subjectCode} · ${sectionCode}`;
  const displayDetails = `${program}: A.Y. ${academicYear}, ${semester}`;

  const approvedPct = totalRequired > 0 ? (approvedCount / totalRequired) * 100 : 0;
  const pendingPct = totalRequired > 0 ? (pendingCount / totalRequired) * 100 : 0;
  const rejectedPct = totalRequired > 0 ? (rejectedCount / totalRequired) * 100 : 0;

  return (
    <div className="group relative rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs transition hover:shadow-md">
      {/* Top Header Row: Course Code, Details & Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-brand-purple tracking-tight sm:text-2xl">
              {displayCode}
            </h3>
            {subjectName && (
              <span className="text-xs sm:text-sm font-semibold text-gray-600 bg-orange-50 border border-orange-100 rounded-md px-2.5 py-0.5">
                {subjectName}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-gray-400 sm:text-base">
            {displayDetails}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen(classItem._id || classItem.id)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-purple px-4 py-2 text-sm font-semibold text-brand-purple hover:bg-brand-purple/5 transition cursor-pointer"
          >
            <span>Open portfolio</span>
            <ChevronRight size={16} />
          </button>

          {/* 3-dots Menu for Edit & Archive */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMenu();
              }}
              aria-label="Class options"
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 focus:outline-none transition cursor-pointer"
            >
              <MoreVertical size={18} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-10 z-20 w-36 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    onCloseMenu();
                    onEdit(classItem);
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  <Edit3 size={15} className="text-gray-400" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCloseMenu();
                    onArchive(classItem._id || classItem.id);
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 transition cursor-pointer"
                >
                  <Archive size={15} className="text-red-500" />
                  <span>Archive</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Segmented Progress Bar */}
      <div className="mt-5 h-3.5 w-full overflow-hidden rounded-full bg-gray-200 flex">
        {approvedPct > 0 && (
          <div
            style={{ width: `${approvedPct}%` }}
            className="h-full bg-[#5cab5f] transition-all duration-300"
            title={`Approved: ${approvedCount}`}
          />
        )}
        {pendingPct > 0 && (
          <div
            style={{ width: `${pendingPct}%` }}
            className="h-full bg-[#f5a30f] transition-all duration-300"
            title={`Pending: ${pendingCount}`}
          />
        )}
        {rejectedPct > 0 && (
          <div
            style={{ width: `${rejectedPct}%` }}
            className="h-full bg-[#ef4444] transition-all duration-300"
            title={`Rejected: ${rejectedCount}`}
          />
        )}
      </div>

      {/* Progress Breakdown Legend & Summary */}
      <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-gray-500">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-[#5cab5f]" />
            ({approvedCount}) Approved
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f5a30f]" />
            ({pendingCount}) Pending Review
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
            ({rejectedCount}) Rejected
          </span>
          <span className="flex items-center gap-1.5 font-medium text-gray-400">
            <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
            Not Yet Submitted
          </span>
        </div>

        <div className="font-semibold text-brand-purple text-right">
          {approvedCount} of {totalRequired} approved
        </div>
      </div>
    </div>
  );
}

const PROGRAMS = ['BSIT', 'BSEMC', 'BSFT', 'BSET', 'BSAT'];
const YEAR_LEVELS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
];

function ClassModal({ isOpen, onClose, onSave, loading, initialData = null, existingClasses = [] }) {
  const [formData, setFormData] = useState({
    subjectCode: '',
    subjectName: '',
    sectionCode: '',
    program: 'BSIT',
    yearLevel: '1',
    sectionGroup: 'A',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      // Parse section.name if formatted like "BSIT-2B" or fallback
      const secName = initialData.section?.name || '';
      let detectedProg = 'BSIT';
      let detectedYear = '1';
      let detectedGroup = 'A';

      const match = secName.match(/^([A-Z]+)-?(\d)?([A-Za-z0-9]+)?/);
      if (match) {
        if (PROGRAMS.includes(match[1])) detectedProg = match[1];
        if (match[2]) detectedYear = match[2];
        if (match[3]) detectedGroup = match[3];
      }

      setFormData({
        subjectCode: initialData.subject?.code || '',
        subjectName: initialData.subject?.name || '',
        sectionCode: initialData.section?.code || '',
        program: detectedProg,
        yearLevel: detectedYear,
        sectionGroup: detectedGroup,
      });
    } else {
      setFormData({
        subjectCode: '',
        subjectName: '',
        sectionCode: '',
        program: 'BSIT',
        yearLevel: '1',
        sectionGroup: 'A',
      });
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanSubjCode = formData.subjectCode.trim().toUpperCase();
    const cleanSubjDesc = formData.subjectName.trim();
    const cleanSecCode = formData.sectionCode.trim().toUpperCase();
    const cleanProgram = formData.program.trim();
    const cleanYear = formData.yearLevel.trim();
    const cleanGroup = formData.sectionGroup.trim().toUpperCase();

    if (!cleanSubjCode) {
      setError('Please provide a subject/course code.');
      return;
    }
    if (!cleanSubjDesc) {
      setError('Please provide a subject/course description.');
      return;
    }
    if (!cleanSecCode) {
      setError('Please provide a section code.');
      return;
    }
    if (!cleanProgram || !cleanYear) {
      setError('Please select both a program and year level.');
      return;
    }

    // Client-side duplicate check (same subject code + same section code)
    const currentEditId = initialData?._id || initialData?.id;
    const isDuplicate = existingClasses.some((c) => {
      const cId = c._id || c.id;
      if (currentEditId && String(cId) === String(currentEditId)) return false;
      const existingSubj = (c.subject?.code || '').trim().toUpperCase();
      const existingSec = (c.section?.code || '').trim().toUpperCase();
      return existingSubj === cleanSubjCode && existingSec === cleanSecCode;
    });

    if (isDuplicate) {
      setError(
        `A class with Subject Code "${cleanSubjCode}" and Section Code "${cleanSecCode}" already exists. Please choose a different section or subject code.`
      );
      return;
    }

    const assembledSectionName = `${cleanProgram}-${cleanYear}${cleanGroup ? cleanGroup : ''}`;

    onSave(
      {
        subjectCode: cleanSubjCode,
        subjectName: cleanSubjDesc,
        sectionCode: cleanSecCode,
        sectionName: assembledSectionName,
      },
      setError
    );
  };

  const isEdit = Boolean(initialData);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-7 sm:p-8 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-brand-orange">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {isEdit ? 'Edit Class' : 'Add New Class'}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {isEdit ? 'Update details for this class load' : 'Enter your course, section, and program assignments'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Subject Code and Section Code */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Subject / Course Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. IT 121"
                value={formData.subjectCode}
                onChange={(e) => {
                  setError('');
                  setFormData({ ...formData, subjectCode: e.target.value });
                }}
                className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base uppercase focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Section Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. T142"
                value={formData.sectionCode}
                onChange={(e) => {
                  setError('');
                  setFormData({ ...formData, sectionCode: e.target.value });
                }}
                className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base uppercase focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
                required
              />
              <span className="mt-1.5 block text-xs text-gray-400">Unique schedule / class code</span>
            </div>
          </div>

          {/* Subject / Course Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Subject / Course Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Data Structures and Algorithms"
              value={formData.subjectName}
              onChange={(e) => {
                setError('');
                setFormData({ ...formData, subjectName: e.target.value });
              }}
              className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
              required
            />
          </div>

          {/* Program, Year Level, and Section Group (Same Row) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Program <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.program}
                onChange={(e) => {
                  setError('');
                  setFormData({ ...formData, program: e.target.value });
                }}
                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base font-medium text-gray-700 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple cursor-pointer"
                required
              >
                {PROGRAMS.map((prog) => (
                  <option key={prog} value={prog}>
                    {prog}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Year Level <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.yearLevel}
                onChange={(e) => {
                  setError('');
                  setFormData({ ...formData, yearLevel: e.target.value });
                }}
                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base font-medium text-gray-700 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple cursor-pointer"
                required
              >
                {YEAR_LEVELS.map((yl) => (
                  <option key={yl.value} value={yl.value}>
                    {yl.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Section Group / Suffix
              </label>
              <input
                type="text"
                placeholder="e.g. A, B, or 1"
                value={formData.sectionGroup}
                onChange={(e) => {
                  setError('');
                  setFormData({ ...formData, sectionGroup: e.target.value });
                }}
                maxLength={4}
                className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-base uppercase focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
              />
            </div>
          </div>

          {/* Section Name Live Preview */}
          <div className="flex items-center gap-2 text-sm text-gray-500 pt-1">
            <span>Generated Section Name:</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-orange-50 border border-orange-200 text-brand-orange font-bold text-sm tracking-wide">
              {formData.program}-{formData.yearLevel}{formData.sectionGroup.toUpperCase()}
            </span>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-gray-300 px-5 py-2.5 text-base font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-6 py-2.5 text-base font-semibold text-white shadow-xs hover:bg-orange-600 transition cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              <span>{loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Class'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClassPortfolio() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [summary, setSummary] = useState({
    needsAction: 0,
    awaitingReview: 0,
    approved: 0,
    completion: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [archiveModal, setArchiveModal] = useState({ open: false, classId: null, loading: false });

  const [editingClass, setEditingClass] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showStatusCards, setShowStatusCards] = useState(true);

  // Close card menu on document click
  useEffect(() => {
    if (!openMenuId) return undefined;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);

  const loadClasses = async () => {
    try {
      setIsLoading(true);
      const data = await fetchClasses();
      if (data) {
        setClasses(data.classes || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.error('Could not load classes from server:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleSaveClass = async (payload, setModalError) => {
    try {
      setIsSubmitting(true);
      if (editingClass) {
        await updateClass(editingClass._id || editingClass.id, payload);
        setEditingClass(null);
      } else {
        await createClass(payload);
        setIsAddModalOpen(false);
      }
      await loadClasses();
    } catch (err) {
      console.error('Error saving class:', err);
      const msg =
        err.response?.data?.message ||
        (err.code === 'ERR_NETWORK'
          ? 'Cannot connect to backend server. Please verify the server is running.'
          : 'Failed to save class.');
      if (setModalError) {
        setModalError(msg);
      } else {
        alert(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveClass = (id) => {
    setArchiveModal({ open: true, classId: id, loading: false });
  };

  const handleConfirmArchive = async () => {
    if (!archiveModal.classId) return;
    try {
      setArchiveModal((prev) => ({ ...prev, loading: true }));
      await archiveClass(archiveModal.classId);
      await loadClasses();
      setArchiveModal({ open: false, classId: null, loading: false });
    } catch (err) {
      console.error('Error archiving class:', err);
      alert(err.response?.data?.message || 'Failed to archive class.');
      setArchiveModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Filter classes by search
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes;
    const q = searchQuery.toLowerCase();
    return classes.filter((c) => {
      const subj = c.subject?.code?.toLowerCase() || '';
      const sect = c.section?.code?.toLowerCase() || '';
      const prog = c.section?.name?.toLowerCase() || '';
      return subj.includes(q) || sect.includes(q) || prog.includes(q);
    });
  }, [classes, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PlaceholderPage title="Class Portfolio" />

        <button
          type="button"
          onClick={() => setShowStatusCards((prev) => !prev)}
          aria-expanded={showStatusCards}
          className={`inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer shadow-2xs ${
            showStatusCards
              ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              : 'bg-brand-orange text-white hover:bg-orange-600 shadow-sm'
          }`}
        >
          {showStatusCards ? (
            <>
              <ChevronUp size={16} className="text-gray-500 transition-transform duration-300" />
              <span>Hide Completion Status</span>
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              <span>Show Completion Status</span>
            </>
          )}
        </button>
      </div>

      {/* TOP SUMMARY STATS COLLAPSIBLE WRAPPER */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          showStatusCards
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Needs Action */}
            <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                <span className="text-sm font-medium text-gray-600 sm:text-base">Needs action</span>
              </div>
              <div className="mt-3">
                <span className="text-4xl font-extrabold tracking-tight text-gray-800 sm:text-5xl">
                  {summary.needsAction}
                </span>
                <p className="mt-2 text-xs font-normal text-gray-500 sm:text-sm">
                  Resubmission of documents
                </p>
              </div>
            </div>

            {/* Awaiting Review */}
            <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#f5a30f]" />
                <span className="text-sm font-medium text-gray-600 sm:text-base">Awaiting review</span>
              </div>
              <div className="mt-3">
                <span className="text-4xl font-extrabold tracking-tight text-gray-800 sm:text-5xl">
                  {summary.awaitingReview}
                </span>
                <p className="mt-2 text-xs font-normal text-gray-500 sm:text-sm">
                  With the administrator
                </p>
              </div>
            </div>

            {/* Approved */}
            <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
                <span className="text-sm font-medium text-gray-600 sm:text-base">Approved</span>
              </div>
              <div className="mt-3">
                <span className="text-4xl font-extrabold tracking-tight text-gray-800 sm:text-5xl">
                  {summary.approved}
                </span>
                <p className="mt-2 text-xs font-normal text-gray-500 sm:text-sm">
                  Across all your classes
                </p>
              </div>
            </div>

            {/* Completion Status */}
            <div className="flex flex-col justify-between items-center text-center rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
              <span className="text-sm font-semibold text-brand-purple sm:text-base">
                Completion Status
              </span>
              <div className="mt-1">
                <span className="text-4xl font-extrabold tracking-tight text-[#5cab5f] sm:text-5xl">
                  {summary.completion}%
                </span>
                <p className="mt-2 text-xs font-normal text-gray-500 sm:text-sm">
                  {summary.completion >= 100
                    ? 'All class portfolios completed!'
                    : summary.completion >= 50
                      ? 'You are halfway through completing it.'
                      : summary.completion > 0
                        ? `${summary.completion}% completed.`
                        : 'Start submitting class documents.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* YOUR CLASSES SECTION */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-brand-purple tracking-tight sm:text-2xl shrink-0">
            Your classes
          </h2>

          <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1 sm:justify-end">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-md w-full">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by subject code, description, section, or program..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-9 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple shadow-xs transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Add Class Button */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-orange px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-orange-600 cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>Add class</span>
            </button>
          </div>
        </div>

        {/* Loading state, list of cards, or empty state */}
        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-12 text-gray-400">
            <Loader2 size={24} className="animate-spin text-brand-purple mr-2" />
            <span className="text-sm">Loading classes...</span>
          </div>
        ) : filteredClasses.length > 0 ? (
          <div className="space-y-4">
            {filteredClasses.map((cls) => {
              const classKey = cls._id || cls.id;
              return (
                <ClassCard
                  key={classKey}
                  classItem={cls}
                  onOpen={(id) => navigate(`/instructors/class-portfolio/${id}`)}
                  onArchive={handleArchiveClass}
                  onEdit={(item) => setEditingClass(item)}
                  menuOpen={openMenuId === classKey}
                  onToggleMenu={() => setOpenMenuId(openMenuId === classKey ? null : classKey)}
                  onCloseMenu={() => setOpenMenuId(null)}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-12 px-4 text-center">
            <BookOpen size={36} className="text-gray-300" />
            <h4 className="mt-3 text-base font-semibold text-gray-700">No classes found</h4>
            <p className="mt-1 text-sm text-gray-400">
              {searchQuery
                ? `No class matching "${searchQuery}". Try a different search term.`
                : 'Get started by clicking "+ Add class" above.'}
            </p>
          </div>
        )}
      </section>

      {/* Add / Edit Class Modal */}
      <ClassModal
        isOpen={isAddModalOpen || Boolean(editingClass)}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingClass(null);
        }}
        onSave={handleSaveClass}
        loading={isSubmitting}
        initialData={editingClass}
        existingClasses={classes}
      />

      {/* Archive Confirmation Modal */}
      <ConfirmationModal
        open={archiveModal.open}
        title="Archive Class Portfolio?"
        message="Are you sure you want to archive this class portfolio? You can find and restore it anytime from the Archive page."
        confirmLabel="Archive"
        cancelLabel="Cancel"
        variant="warning"
        loading={archiveModal.loading}
        onConfirm={handleConfirmArchive}
        onCancel={() => !archiveModal.loading && setArchiveModal({ open: false, classId: null, loading: false })}
      />
    </div>
  );
}

export default ClassPortfolio;
