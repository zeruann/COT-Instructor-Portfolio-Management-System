import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, X, Search, BookOpen, AlertCircle, Loader2, MoreVertical, Archive, Edit3 } from 'lucide-react';
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
          <h3 className="text-xl font-bold text-brand-purple tracking-tight sm:text-2xl">
            {displayCode}
          </h3>
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

function ClassModal({ isOpen, onClose, onSave, loading, initialData = null }) {
  const [formData, setFormData] = useState({
    subjectCode: '',
    sectionCode: '',
    program: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        subjectCode: initialData.subject?.code || '',
        sectionCode: initialData.section?.code || '',
        program: initialData.section?.name || '',
      });
    } else {
      setFormData({
        subjectCode: '',
        sectionCode: '',
        program: '',
      });
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.subjectCode.trim() || !formData.sectionCode.trim() || !formData.program.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    onSave({
      subjectCode: formData.subjectCode.trim(),
      sectionCode: formData.sectionCode.trim(),
      sectionName: formData.program.trim(),
    });
  };

  const isEdit = Boolean(initialData);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-brand-orange">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {isEdit ? 'Edit Class' : 'Add New Class'}
              </h3>
              <p className="text-xs text-gray-500">
                {isEdit ? 'Update details for this class load' : 'Create a class portfolio card for your teaching load'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700">
                Subject Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. IT 121"
                value={formData.subjectCode}
                onChange={(e) => {
                  setError('');
                  setFormData({ ...formData, subjectCode: e.target.value });
                }}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">
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
                className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">
              Program & Year Section <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. BSIT-2B"
              value={formData.program}
              onChange={(e) => {
                setError('');
                setFormData({ ...formData, program: e.target.value });
              }}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
              required
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-orange px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-orange-600 transition cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
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

  const handleSaveClass = async (payload) => {
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
      alert(msg);
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
      <PlaceholderPage title="Class Portfolio" />

      {/* TOP SUMMARY STATS ROW */}
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

      {/* YOUR CLASSES SECTION */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-brand-purple tracking-tight sm:text-2xl">
            Your classes
          </h2>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 sm:w-56 rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Add Class Button */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-orange-600 cursor-pointer"
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
