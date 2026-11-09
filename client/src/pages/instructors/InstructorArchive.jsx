import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, ChevronRight, Search, X, Loader2, RotateCcw, BookOpen } from 'lucide-react';
import PlaceholderPage from '../../components/layout/PlaceholderPage';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { fetchClasses, unarchiveClass } from '../../api/classes';

function ArchivedClassCard({ classItem, onOpen, onUnarchive }) {
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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs transition hover:shadow-md">
      {/* Top Header Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-brand-purple tracking-tight sm:text-2xl">
              {displayCode}
            </h3>
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              Archived
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-gray-400 sm:text-base">
            {displayDetails}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onUnarchive && (
            <button
              type="button"
              onClick={() => onUnarchive(classItem._id || classItem.id)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition cursor-pointer"
              title="Restore class to active portfolio"
            >
              <RotateCcw size={15} />
              <span>Restore</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpen(classItem._id || classItem.id)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-purple px-4 py-2 text-sm font-semibold text-brand-purple hover:bg-brand-purple/5 transition cursor-pointer"
          >
            <span>Open portfolio</span>
            <ChevronRight size={16} />
          </button>
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

function InstructorArchive() {
  const navigate = useNavigate();
  const [archivedClasses, setArchivedClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, classId: null, loading: false });

  const loadArchivedClasses = async () => {
    try {
      setIsLoading(true);
      const data = await fetchClasses({ archived: 'true' });
      if (data) {
        setArchivedClasses(data.classes || []);
      }
    } catch (err) {
      console.warn('Could not load archived classes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArchivedClasses();
  }, []);

  const handleUnarchiveClass = (id) => {
    setConfirmModal({ open: true, classId: id, loading: false });
  };

  const handleConfirmRestore = async () => {
    if (!confirmModal.classId) return;
    try {
      setConfirmModal((prev) => ({ ...prev, loading: true }));
      await unarchiveClass(confirmModal.classId);
      await loadArchivedClasses();
      setConfirmModal({ open: false, classId: null, loading: false });
    } catch (err) {
      console.error('Error unarchiving class:', err);
      alert(err.response?.data?.message || 'Failed to restore class.');
      setConfirmModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return archivedClasses;
    const q = searchQuery.toLowerCase();
    return archivedClasses.filter((c) => {
      const subj = c.subject?.code?.toLowerCase() || '';
      const sect = c.section?.code?.toLowerCase() || '';
      const prog = c.section?.name?.toLowerCase() || '';
      return subj.includes(q) || sect.includes(q) || prog.includes(q);
    });
  }, [archivedClasses, searchQuery]);

  return (
    <div className="space-y-6">
      <PlaceholderPage title="Archive" />

      {/* ARCHIVED CLASSES SECTION */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-brand-purple tracking-tight sm:text-2xl">
              Archived Classes
            </h2>
            <p className="text-xs text-gray-400 sm:text-sm mt-0.5">
              Review previously archived class portfolios or restore them back to active classes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search archived classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-64 rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
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
          </div>
        </div>

        {/* Loading state, list of cards, or empty state */}
        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-12 text-gray-400">
            <Loader2 size={24} className="animate-spin text-brand-purple mr-2" />
            <span className="text-sm">Loading archived classes...</span>
          </div>
        ) : filteredClasses.length > 0 ? (
          <div className="space-y-4">
            {filteredClasses.map((cls) => (
              <ArchivedClassCard
                key={cls._id || cls.id}
                classItem={cls}
                onOpen={(id) => navigate(`/instructors/class-portfolio/${id}`)}
                onUnarchive={handleUnarchiveClass}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-12 px-4 text-center">
            <Archive size={36} className="text-gray-300" />
            <h4 className="mt-3 text-base font-semibold text-gray-700">No archived classes found</h4>
            <p className="mt-1 text-sm text-gray-400">
              {searchQuery
                ? `No archived class matching "${searchQuery}".`
                : 'Classes you archive from your Class Portfolio will appear here.'}
            </p>
          </div>
        )}
      </section>

      <ConfirmationModal
        open={confirmModal.open}
        title="Restore Class Portfolio?"
        message="Are you sure you want to restore this class portfolio back to your active classes?"
        confirmLabel="Restore"
        cancelLabel="Cancel"
        variant="success"
        loading={confirmModal.loading}
        onConfirm={handleConfirmRestore}
        onCancel={() => !confirmModal.loading && setConfirmModal({ open: false, classId: null, loading: false })}
      />
    </div>
  );
}

export default InstructorArchive;
