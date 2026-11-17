import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Archive,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileCheck,
  Layers,
  Loader2,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import PlaceholderPage from '../../components/layout/PlaceholderPage';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import AppModal, { useAppModal } from '../../components/common/AppModal';
import { fetchClasses, unarchiveClass } from '../../api/classes';
import { useAnimatedModal } from '../../hooks/useAnimatedModal';
import AdminViewClassPortfolio from '../admin/AdminViewClassPortfolio';
import ClassRequirementDetail from './ClassRequirementDetail';

const SEMESTER_ORDER = { '1st': 1, '2nd': 2, Summer: 3 };

function formatSemLabel(sem) {
  if (!sem) return '1st Semester';
  const s = String(sem).toLowerCase();
  if (s.includes('1')) return '1st Semester';
  if (s.includes('2')) return '2nd Semester';
  if (s.includes('sum')) return 'Summer';
  return `${sem} Semester`;
}

function getSemKey(cls) {
  const raw = String(cls?.academicPeriod?.semester || '1st').trim();
  if (raw.toLowerCase().includes('2')) return '2nd';
  if (raw.toLowerCase().includes('sum')) return 'Summer';
  return '1st';
}

function MetricCard({ icon: Icon, label, value, note, tone = 'purple' }) {
  const tones = {
    purple: 'bg-purple-50 text-brand-purple',
    orange: 'bg-orange-50 text-brand-orange',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">{value}</p>
          {note && <p className="mt-1.5 text-xs text-gray-500">{note}</p>}
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.purple}`}>
          <Icon size={19} />
        </span>
      </div>
    </div>
  );
}

function ArchivedClassRow({ classItem, onView, onUnarchive }) {
  const {
    subject,
    section,
    approvedCount = 0,
    pendingCount = 0,
    rejectedCount = 0,
    totalRequired = 19,
  } = classItem;

  const subjectCode = subject?.code || 'SUBJ';
  const subjectName = subject?.name || '';
  const sectionCode = section?.code || 'SEC';
  const program = section?.name || section?.code || '';
  const pct = totalRequired > 0 ? Math.round((approvedCount / totalRequired) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition hover:border-gray-300 hover:bg-white sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-bold text-gray-900 sm:text-base">
            {subjectCode} · {sectionCode}
          </h4>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
            Archived
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-gray-500">
          {[subjectName, program, `${pct}% complete`].filter(Boolean).join(' • ')}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-medium text-gray-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#5cab5f]" />
            {approvedCount} Approved
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#f5a30f]" />
            {pendingCount} Pending
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
            {rejectedCount} Rejected
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {onUnarchive && (
          <button
            type="button"
            onClick={() => onUnarchive(classItem._id || classItem.id)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
            title="Restore class to active portfolio"
          >
            <RotateCcw size={13} />
            <span>Restore</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onView(classItem)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-brand-purple hover:text-brand-purple cursor-pointer"
        >
          <span>View</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function SemesterDropdownCard({ semKey, classes, isOpen, onToggle, onViewClass, onUnarchive }) {
  const [classSearch, setClassSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const totals = useMemo(() => {
    const approved = classes.reduce((s, c) => s + (c.approvedCount || 0), 0);
    const required = classes.reduce((s, c) => s + (c.totalRequired || 19), 0);
    const rate = required > 0 ? Math.round((approved / required) * 100) : 0;
    return { approved, required, rate };
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      if (classSearch.trim()) {
        const q = classSearch.toLowerCase();
        const subjCode = cls.subject?.code?.toLowerCase() || '';
        const subjName = cls.subject?.name?.toLowerCase() || '';
        const secCode = cls.section?.code?.toLowerCase() || '';
        const secName = cls.section?.name?.toLowerCase() || '';
        if (
          !subjCode.includes(q) &&
          !subjName.includes(q) &&
          !secCode.includes(q) &&
          !secName.includes(q)
        ) {
          return false;
        }
      }
      if (statusFilter === 'completed') {
        const req = cls.totalRequired || 19;
        return (cls.approvedCount || 0) >= req;
      }
      if (statusFilter === 'pending') {
        return (cls.pendingCount || 0) > 0;
      }
      if (statusFilter === 'rejected') {
        return (cls.rejectedCount || 0) > 0;
      }
      return true;
    });
  }, [classes, classSearch, statusFilter]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50/70 cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-brand-purple">
            <Layers size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 sm:text-lg">
              {formatSemLabel(semKey)}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {classes.length} {classes.length === 1 ? 'class' : 'classes'} · {totals.rate}% compliance
            </p>
          </div>
        </div>

        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-500 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180 text-brand-purple' : ''
            }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-100 p-4 sm:p-5 space-y-4">
            {/* Search & Status Filter */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  placeholder="Search subject, section, or program..."
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/60 py-2 pl-9 pr-8 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:border-brand-purple focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-purple transition"
                />
                {classSearch && (
                  <button
                    type="button"
                    onClick={() => setClassSearch('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="relative sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50/60 py-2 pl-3 pr-8 text-xs sm:text-sm font-medium text-gray-700 focus:border-brand-purple focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-purple transition cursor-pointer"
                >
                  <option value="all">All classes</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Has pending review</option>
                  <option value="rejected">Needs revision</option>
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            {/* Two-Column Class Grid */}
            {filteredClasses.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {filteredClasses.map((cls) => (
                  <ArchivedClassRow
                    key={cls._id || cls.id}
                    classItem={cls}
                    onView={onViewClass}
                    onUnarchive={onUnarchive}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8 px-4 text-center text-xs sm:text-sm text-gray-400">
                No archived classes match your filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InstructorArchive() {
  const [archivedClasses, setArchivedClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(null);
  const [openSemesters, setOpenSemesters] = useState({ '1st': true, '2nd': true, Summer: true });
  const [confirmModal, setConfirmModal] = useState({ open: false, classId: null, loading: false });
  const { modal, close: closeModal, notify } = useAppModal();

  // Archived class modal state (matches AdminArchiveRecordDetail)
  const [selectedClass, setSelectedClass] = useState(null);
  const [activeReqPath, setActiveReqPath] = useState(null);
  const modalBodyRef = useRef(null);
  const classModalAnim = useAnimatedModal(Boolean(selectedClass));
  const [lastSelectedClass, setLastSelectedClass] = useState(null);

  useEffect(() => {
    if (selectedClass) setLastSelectedClass(selectedClass);
  }, [selectedClass]);

  useEffect(() => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeReqPath, selectedClass]);

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

  // Group all archived classes by Academic Year (e.g. "2026-2027")
  const academicYearGroups = useMemo(() => {
    const map = new Map();
    archivedClasses.forEach((cls) => {
      const sy = cls?.academicPeriod?.schoolYear || '2026-2027';
      if (!map.has(sy)) {
        map.set(sy, []);
      }
      map.get(sy).push(cls);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([schoolYear, classes]) => {
        const semMap = new Map();
        classes.forEach((cls) => {
          const sem = getSemKey(cls);
          if (!semMap.has(sem)) semMap.set(sem, []);
          semMap.get(sem).push(cls);
        });
        const semesters = Array.from(semMap.entries())
          .sort(([a], [b]) => (SEMESTER_ORDER[a] || 9) - (SEMESTER_ORDER[b] || 9))
          .map(([semKey, semClasses]) => ({ semKey, classes: semClasses }));

        const approved = classes.reduce((s, c) => s + (c.approvedCount || 0), 0);
        const pending = classes.reduce((s, c) => s + (c.pendingCount || 0), 0);
        const required = classes.reduce((s, c) => s + (c.totalRequired || 19), 0);
        const complianceRate = required > 0 ? Math.round((approved / required) * 100) : 0;

        return {
          schoolYear,
          classes,
          semesters,
          approved,
          pending,
          required,
          complianceRate,
        };
      });
  }, [archivedClasses]);

  const filteredYearGroups = useMemo(() => {
    if (!searchQuery.trim()) return academicYearGroups;
    const q = searchQuery.toLowerCase();
    return academicYearGroups.filter((group) => {
      if (`ay ${group.schoolYear}`.toLowerCase().includes(q)) return true;
      return group.classes.some((c) => {
        const subj = c.subject?.code?.toLowerCase() || '';
        const sect = c.section?.code?.toLowerCase() || '';
        const prog = c.section?.name?.toLowerCase() || '';
        return subj.includes(q) || sect.includes(q) || prog.includes(q);
      });
    });
  }, [academicYearGroups, searchQuery]);

  const activeYearGroup = useMemo(
    () => academicYearGroups.find((g) => g.schoolYear === selectedYear) || null,
    [academicYearGroups, selectedYear]
  );

  useEffect(() => {
    if (selectedYear && !activeYearGroup && !isLoading) {
      setSelectedYear(null);
    }
  }, [selectedYear, activeYearGroup, isLoading]);

  const handleOpenYear = (schoolYear) => {
    setSelectedYear(schoolYear);
    setOpenSemesters({ '1st': true, '2nd': true, Summer: true });
  };

  const handleToggleSemester = (semKey) => {
    setOpenSemesters((prev) => ({ ...prev, [semKey]: !prev[semKey] }));
  };

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
      notify('success', 'Class Restored', 'The class portfolio has been restored back to your active classes.');
    } catch (err) {
      console.error('Error unarchiving class:', err);
      setConfirmModal({ open: false, classId: null, loading: false });
      notify('error', 'Restore Failed', err.response?.data?.message || 'Failed to restore class.');
    }
  };

  const handleOpenClassModal = (cls) => {
    setActiveReqPath(null);
    setSelectedClass(cls);
  };

  const handleCloseClassModal = () => {
    setSelectedClass(null);
    setTimeout(() => setActiveReqPath(null), 180);
  };

  const modalClass = selectedClass || lastSelectedClass;

  return (
    <div className="space-y-6">
      {!activeYearGroup ? (
        /* ── VIEW 1: ACADEMIC YEARS OVERVIEW ── */
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PlaceholderPage
              title="Archive"
              subtitle="Review previously archived class portfolios by academic year or restore them back to active classes."
            />

            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search academic year or class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 sm:w-64 rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-8 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-12 text-gray-400">
              <Loader2 size={24} className="animate-spin text-brand-purple mr-2" />
              <span className="text-sm">Loading archived records...</span>
            </div>
          ) : filteredYearGroups.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredYearGroups.map((group) => (
                <button
                  key={group.schoolYear}
                  type="button"
                  onClick={() => handleOpenYear(group.schoolYear)}
                  className="group flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 text-left shadow-xs transition hover:border-brand-purple/40 hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-brand-purple">
                        <CalendarDays size={20} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-brand-purple sm:text-xl">
                            AY {group.schoolYear}
                          </h3>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                            Archived
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                          {group.semesters.length} {group.semesters.length === 1 ? 'semester' : 'semesters'} · {group.classes.length} archived {group.classes.length === 1 ? 'class' : 'classes'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className="mt-1 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-purple"
                    />
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3.5 text-xs text-gray-500">
                    <span>{group.approved} approved documents</span>
                    <span className="font-semibold text-brand-purple">
                      {group.complianceRate}% compliance
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-12 px-4 text-center">
              <Archive size={36} className="text-gray-300" />
              <h4 className="mt-3 text-base font-semibold text-gray-700">No archived records found</h4>
              <p className="mt-1 text-sm text-gray-400">
                {searchQuery
                  ? `No archived academic year or class matching "${searchQuery}".`
                  : 'Classes you archive from your Class Portfolio will appear here.'}
              </p>
            </div>
          )}
        </section>
      ) : (
        /* ── VIEW 2: SELECTED ACADEMIC YEAR DETAIL (Admin Archive style) ── */
        <div className="space-y-6">
          {/* Header Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedYear(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition cursor-pointer"
                aria-label="Back to Archive"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-brand-purple sm:text-2xl">
                  AY {activeYearGroup.schoolYear}
                </h1>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                  Archived · Read-Only
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSummary((prev) => !prev)}
              aria-expanded={showSummary}
              className={`inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer shadow-2xs ${showSummary
                  ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  : 'bg-brand-orange text-white hover:bg-orange-600 shadow-sm'
                }`}
            >
              {showSummary ? (
                <>
                  <ChevronUp size={16} className="text-gray-500 transition-transform duration-300" />
                  <span>Hide Summary</span>
                </>
              ) : (
                <>
                  <Layers size={16} />
                  <span>Show Summary</span>
                </>
              )}
            </button>
          </div>

          {/* 4 Summary Metric Cards (Collapsible) */}
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${showSummary ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
          >
            <div className="overflow-hidden">
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  icon={Layers}
                  label="Semesters"
                  value={activeYearGroup.semesters.length}
                  note="Archived terms in this year"
                  tone="purple"
                />
                <MetricCard
                  icon={BookOpen}
                  label="Total Classes"
                  value={activeYearGroup.classes.length}
                  note="Preserved class portfolios"
                  tone="orange"
                />
                <MetricCard
                  icon={FileCheck}
                  label="Approved Documents"
                  value={activeYearGroup.approved}
                  note={`${activeYearGroup.pending} pending review`}
                  tone="amber"
                />
                <MetricCard
                  icon={CheckCircle2}
                  label="Compliance Rate"
                  value={`${activeYearGroup.complianceRate}%`}
                  note="Overall class compliance"
                  tone="green"
                />
              </section>
            </div>
          </div>

          {/* Semester Dropdown Cards (1st & 2nd) */}
          <section className="space-y-4">
            {activeYearGroup.semesters.map(({ semKey, classes }) => (
              <SemesterDropdownCard
                key={semKey}
                semKey={semKey}
                classes={classes}
                isOpen={Boolean(openSemesters[semKey])}
                onToggle={() => handleToggleSemester(semKey)}
                onViewClass={handleOpenClassModal}
                onUnarchive={handleUnarchiveClass}
              />
            ))}
          </section>
        </div>
      )}

      {/* ── ARCHIVED CLASS PORTFOLIO MODAL (Matches AdminArchiveRecordDetail) ── */}
      {classModalAnim.rendered && modalClass && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5"
          onClick={handleCloseClassModal}
        >
          <div className={`absolute inset-0 bg-black/50 ${classModalAnim.backdropAnim}`} />
          <div
            className={`relative flex flex-col w-full max-w-7xl h-[90vh] rounded-2xl bg-[#f8f9fc] shadow-2xl border border-gray-200 overflow-hidden ${classModalAnim.panelAnim}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            {(() => {
              const cls = modalClass;
              const subjectCode = cls?.subject?.code || 'Subject';
              const subjectName = cls?.subject?.name || '';
              const sectionCode = cls?.section?.code || cls?.section?.name || 'Section';
              const program = cls?.section?.name || cls?.section?.code || '';
              const ay = cls?.academicPeriod?.schoolYear || '';
              const sem = cls?.academicPeriod?.semester || '';
              return (
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4 bg-white">
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-[#2e2a72] truncate">
                      {subjectCode} · {sectionCode} — Class Portfolio
                    </h2>
                    {subjectName && (
                      <p className="text-xs sm:text-sm font-medium text-gray-700 mt-0.5 truncate">
                        {subjectName}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">
                      {program ? `${program}` : ''}
                      {ay ? `${program ? ' • ' : ''}A.Y. ${ay}` : ''}
                      {sem ? `, ${formatSemLabel(sem)}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseClassModal}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer shrink-0"
                    aria-label="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>
              );
            })()}

            {/* Modal Body */}
            <div ref={modalBodyRef} className="flex-1 overflow-y-auto p-6">
              <div className={activeReqPath ? 'hidden' : 'animate-modal-page-back'}>
                <AdminViewClassPortfolio
                  classId={modalClass._id || modalClass.id}
                  embedded
                  onSelectRequirement={(card) => setActiveReqPath(card.path)}
                />
              </div>
              {activeReqPath && (
                <div key={activeReqPath} className="animate-modal-page-forward">
                  <ClassRequirementDetail
                    classId={modalClass._id || modalClass.id}
                    reqPath={activeReqPath}
                    embedded
                    onBack={() => setActiveReqPath(null)}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-6 py-3.5 bg-white">
              <div>
                {activeReqPath && (
                  <button
                    type="button"
                    onClick={() => setActiveReqPath(null)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs sm:text-sm font-semibold text-gray-700 transition cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Checklist</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseClassModal}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs sm:text-sm font-semibold text-gray-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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

      <AppModal modal={modal} onClose={closeModal} />
    </div>
  );
}

export default InstructorArchive;
