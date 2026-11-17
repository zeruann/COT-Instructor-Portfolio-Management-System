import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  CalendarDays,
  BookOpen,
  Layers,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Building2,
  Check,
  X,
  Lock,
  ArrowUpRight,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { fetchClasses, unarchiveClass } from '../../api/classes';
import { fetchFacultySummary } from '../../api/documents';
import { downloadComplianceExcel } from '../../api/reports';
import { API_BASE } from '../../api/config';

const API_INSTRUCTORS_URL = `${API_BASE}/instructors`;
const API_PERIODS_URL = `${API_BASE}/academic-periods`;

const CATEGORY_PATHS = [
  'educational-attainment',
  'service-records',
  'seminars-and-workshops',
  'achievements',
  'research',
  'extension-involvement',
  'production',
  'other-requirements',
];

const computeCompletion = (summaries) => {
  const categoryCount = CATEGORY_PATHS.length;
  let approvedShare = 0;
  let pendingShare = 0;
  let rejectedShare = 0;
  const counts = { approved: 0, pending: 0, rejected: 0 };

  CATEGORY_PATHS.forEach((path) => {
    const s = summaries?.[path] || {};
    const approved = s.approved || 0;
    const pending = s.pendingReview || 0;
    const rejected = s.rejected || 0;
    const total = Math.max(s.totalFiles || 0, approved + pending + rejected);
    if (total === 0) return;

    approvedShare += approved / total;
    pendingShare += pending / total;
    rejectedShare += rejected / total;
    counts.approved += approved;
    counts.pending += pending;
    counts.rejected += rejected;
  });

  const toPct = (share) => (share / categoryCount) * 100;
  return {
    percent: Math.round(toPct(approvedShare)),
    approvedPct: toPct(approvedShare),
    pendingPct: toPct(pendingShare),
    rejectedPct: toPct(rejectedShare),
    counts,
  };
};

function MetricCard({ icon: Icon, label, value, note, tone }) {
  const tones = {
    purple: 'bg-purple-50 text-brand-purple border-purple-100',
    orange: 'bg-orange-50 text-brand-orange border-orange-100',
    green: 'bg-[#eaf5e7] text-[#5cab5f] border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  };

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs transition hover:shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{value}</p>
          {note && <p className="mt-1 text-xs text-gray-400">{note}</p>}
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tones[tone] || tones.purple}`}
        >
          <Icon size={20} />
        </span>
      </div>
    </article>
  );
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSemName(sem) {
  if (!sem) return '1st Semester';
  if (sem === 'Summer') return 'Summer Term';
  return `${sem} Semester`;
}

function getInitials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'IN';
}

export default function AdminArchive() {
  const navigate = useNavigate();

  // Active Tab: 'classes' | 'faculty' | 'periods' | 'instructors'
  const [activeTab, setActiveTab] = useState('classes');

  // Data states
  const [periods, setPeriods] = useState([]);
  const [classes, setClasses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [facultySummaries, setFacultySummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingExcelId, setDownloadingExcelId] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    confirmColor: 'bg-brand-orange',
    onConfirm: null,
    loading: false,
  });

  // Feedback toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadArchiveData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    const token = localStorage.getItem('token');
    const authHeaders = { Authorization: `Bearer ${token}` };

    try {
      const [periodsRes, classesRes, instructorsRes] = await Promise.allSettled([
        fetch(`${API_PERIODS_URL}?includeArchived=true`, { headers: authHeaders }).then((r) =>
          r.ok ? r.json() : { periods: [] }
        ),
        fetchClasses({ archived: 'true', includeArchived: 'true' }),
        fetch(API_INSTRUCTORS_URL, { headers: authHeaders }).then((r) =>
          r.ok ? r.json() : []
        ),
      ]);

      if (periodsRes.status === 'fulfilled') {
        const pList = periodsRes.value?.periods || periodsRes.value || [];
        setPeriods(Array.isArray(pList) ? pList : []);
      }

      if (classesRes.status === 'fulfilled') {
        const cList = classesRes.value?.classes || classesRes.value || [];
        setClasses(Array.isArray(cList) ? cList : []);
      }

      if (instructorsRes.status === 'fulfilled') {
        const raw = instructorsRes.value;
        const iList = Array.isArray(raw) ? raw : raw?.instructors || raw?.data || [];
        setInstructors(iList);

        // Fetch faculty summaries in background
        Promise.allSettled(
          iList.map((inst) => {
            const id = inst._id || inst.id;
            return fetchFacultySummary(id).then((sum) => [id, sum || {}]);
          })
        ).then((results) => {
          const next = {};
          results.forEach((r) => {
            if (r.status === 'fulfilled') next[r.value[0]] = r.value[1];
          });
          setFacultySummaries((prev) => ({ ...prev, ...next }));
        });
      }
    } catch (err) {
      console.error('Error loading archive data:', err);
      showToast('Some archive records could not be loaded.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadArchiveData();
  }, [loadArchiveData]);

  // Derived datasets
  const archivedPeriods = useMemo(
    () => periods.filter((p) => p.isArchived || p.status === 'Archived'),
    [periods]
  );

  const registeredFaculty = useMemo(
    () => instructors.filter((i) => i.accountType !== 'Administrator'),
    [instructors]
  );

  const inactiveInstructors = useMemo(
    () =>
      registeredFaculty.filter(
        (i) =>
          (i.accountStatus || '').toLowerCase() === 'deactivated' ||
          (i.accountStatus || '').toLowerCase() === 'inactive'
      ),
    [registeredFaculty]
  );

  const availableSchoolYears = useMemo(() => {
    const set = new Set();
    periods.forEach((p) => p.schoolYear && set.add(p.schoolYear));
    classes.forEach((c) => c.academicPeriod?.schoolYear && set.add(c.academicPeriod.schoolYear));
    return Array.from(set).sort().reverse();
  }, [periods, classes]);

  const availableDepartments = useMemo(() => {
    const set = new Set();
    instructors.forEach((i) => i.department && set.add(i.department));
    classes.forEach((c) => {
      const dept = c.ownerId?.department || c.section?.name;
      if (dept) set.add(dept);
    });
    return Array.from(set).sort();
  }, [instructors, classes]);

  // Filtered Archived Classes
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const subjCode = (c.subject?.code || '').toLowerCase();
      const subjName = (c.subject?.name || '').toLowerCase();
      const sectCode = (c.section?.code || '').toLowerCase();
      const instructorName = (c.ownerId?.fullName || '').toLowerCase();
      const dept = (c.ownerId?.department || '').toLowerCase();
      const sy = c.academicPeriod?.schoolYear || '';

      const matchesSearch =
        !q ||
        subjCode.includes(q) ||
        subjName.includes(q) ||
        sectCode.includes(q) ||
        instructorName.includes(q) ||
        dept.includes(q);

      const matchesSy = selectedSchoolYear === 'all' || sy === selectedSchoolYear;
      const matchesDept =
        selectedDepartment === 'all' || (c.ownerId?.department || '') === selectedDepartment;

      return matchesSearch && matchesSy && matchesDept;
    });
  }, [classes, searchQuery, selectedSchoolYear, selectedDepartment]);

  // Filtered Faculty Portfolios
  const filteredFaculty = useMemo(() => {
    return registeredFaculty.filter((inst) => {
      const q = searchQuery.toLowerCase().trim();
      const name = (inst.fullName || '').toLowerCase();
      const email = (inst.email || '').toLowerCase();
      const dept = (inst.department || '').toLowerCase();

      const matchesSearch = !q || name.includes(q) || email.includes(q) || dept.includes(q);
      const matchesDept =
        selectedDepartment === 'all' || inst.department === selectedDepartment;

      return matchesSearch && matchesDept;
    });
  }, [registeredFaculty, searchQuery, selectedDepartment]);

  // Filtered Archived Periods
  const filteredPeriods = useMemo(() => {
    return archivedPeriods.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const sy = (p.schoolYear || '').toLowerCase();
      const sem = (p.semester || '').toLowerCase();

      const matchesSearch = !q || sy.includes(q) || sem.includes(q);
      const matchesSy = selectedSchoolYear === 'all' || p.schoolYear === selectedSchoolYear;

      return matchesSearch && matchesSy;
    });
  }, [archivedPeriods, searchQuery, selectedSchoolYear]);

  // Filtered Inactive Faculty
  const filteredInactiveFaculty = useMemo(() => {
    return inactiveInstructors.filter((inst) => {
      const q = searchQuery.toLowerCase().trim();
      const name = (inst.fullName || '').toLowerCase();
      const email = (inst.email || '').toLowerCase();
      const dept = (inst.department || '').toLowerCase();

      const matchesSearch = !q || name.includes(q) || email.includes(q) || dept.includes(q);
      const matchesDept =
        selectedDepartment === 'all' || inst.department === selectedDepartment;

      return matchesSearch && matchesDept;
    });
  }, [inactiveInstructors, searchQuery, selectedDepartment]);

  // Restore Class Action
  const handleRestoreClass = (classItem) => {
    const id = classItem._id || classItem.id;
    const name = `${classItem.subject?.code || 'Class'} · ${classItem.section?.code || ''}`;

    setConfirmModal({
      isOpen: true,
      title: 'Restore Class to Active Records?',
      message: `Are you sure you want to restore ${name}? This will return it to active class listings and allow document management.`,
      confirmText: 'Restore Class',
      confirmColor: 'bg-emerald-600 hover:bg-emerald-700',
      onConfirm: async () => {
        try {
          setConfirmModal((prev) => ({ ...prev, loading: true }));
          await unarchiveClass(id);
          showToast(`Class ${name} restored successfully.`);
          await loadArchiveData(true);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        } catch (err) {
          console.error('Error unarchiving class:', err);
          showToast(err.response?.data?.message || 'Failed to restore class.', 'error');
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // Reopen Academic Period Action
  const handleReopenPeriod = (period) => {
    const periodName = `AY ${period.schoolYear} · ${formatSemName(period.semester)}`;

    setConfirmModal({
      isOpen: true,
      title: 'Reopen Academic Period?',
      message: `Reopening ${periodName} will remove its archived status and set it to Closed (Inactive) so portfolio reviews or grade adjustments can be conducted.`,
      confirmText: 'Reopen Period',
      confirmColor: 'bg-purple-600 hover:bg-purple-700',
      onConfirm: async () => {
        try {
          setConfirmModal((prev) => ({ ...prev, loading: true }));
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_PERIODS_URL}/${period._id}/unarchive`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Failed to reopen period.');

          showToast(`${periodName} reopened successfully.`);
          await loadArchiveData(true);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        } catch (err) {
          showToast(err.message || 'Failed to reopen period.', 'error');
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // Reactivate Inactive Faculty
  const handleReactivateInstructor = (instructor) => {
    const id = instructor._id || instructor.id;
    const name = instructor.fullName;

    setConfirmModal({
      isOpen: true,
      title: 'Reactivate Instructor Account?',
      message: `Are you sure you want to reactivate ${name}? They will be restored to active faculty and be able to log in to the portal.`,
      confirmText: 'Reactivate Account',
      confirmColor: 'bg-emerald-600 hover:bg-emerald-700',
      onConfirm: async () => {
        try {
          setConfirmModal((prev) => ({ ...prev, loading: true }));
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_INSTRUCTORS_URL}/${id}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ accountStatus: 'Active' }),
          });

          if (!res.ok) throw new Error('Failed to reactivate account.');

          showToast(`${name} has been reactivated successfully.`);
          await loadArchiveData(true);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        } catch (err) {
          showToast(err.message || 'Failed to reactivate account.', 'error');
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // Export Faculty Compliance Excel
  const handleExportExcel = async (instructor) => {
    const id = instructor._id || instructor.id;
    try {
      setDownloadingExcelId(id);
      await downloadComplianceExcel({ instructorId: id });
      showToast(`Compliance checklist for ${instructor.fullName} downloaded.`);
    } catch (err) {
      console.error('Failed to export Excel:', err);
      showToast('Failed to download Excel report file.', 'error');
    } finally {
      setDownloadingExcelId(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSchoolYear('all');
    setSelectedDepartment('all');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedSchoolYear !== 'all' || selectedDepartment !== 'all';

  return (
    <div className="space-y-6">
      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold ${toast.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle size={16} className="text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              System Archive &amp; Records
            </h1>
            <span className="rounded-lg bg-purple-50 border border-purple-200/80 px-2.5 py-0.5 text-xs font-bold text-brand-purple">
              Read-Only
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Preserved historical academic periods, completed course portfolios, and faculty compliance records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadArchiveData(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-brand-orange' : 'text-gray-500'} />
          <span>{refreshing ? 'Refreshing…' : 'Refresh Archive'}</span>
        </button>
      </div>

      {/* ── METRIC STAT CARDS ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={CalendarDays}
          label="Archived Periods"
          value={archivedPeriods.length}
          note="Completed academic terms"
          tone="purple"
        />
        <MetricCard
          icon={BookOpen}
          label="Archived Classes"
          value={classes.length}
          note="Preserved class portfolios"
          tone="orange"
        />
        <MetricCard
          icon={Layers}
          label="Faculty Portfolios"
          value={registeredFaculty.length}
          note="Faculty compliance records"
          tone="green"
        />
        <MetricCard
          icon={Users}
          label="Inactive Faculty"
          value={inactiveInstructors.length}
          note="Past or deactivated accounts"
          tone="amber"
        />
      </section>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            placeholder="Search by course code, title, section, or instructor…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-4 pr-10 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition-all shadow-2xs"
          />
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* School Year Filter */}
        <div className="relative sm:w-56 shrink-0">
          <select
            value={selectedSchoolYear}
            onChange={(e) => setSelectedSchoolYear(e.target.value)}
            aria-label="Filter by School Year"
            className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-2.5 pl-4 pr-9 text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition-all cursor-pointer shadow-2xs"
          >
            <option value="all">All School Years</option>
            {availableSchoolYears.map((sy) => (
              <option key={sy} value={sy}>
                A.Y. {sy}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Department Filter */}
        <div className="relative sm:w-56 shrink-0">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            aria-label="Filter by Department"
            className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-2.5 pl-4 pr-9 text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition-all cursor-pointer shadow-2xs"
          >
            <option value="all">All Departments</option>
            {availableDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs font-semibold text-gray-600 transition-all cursor-pointer shrink-0"
          >
            Clear Filters
          </button>
        )}
      </section>

      {/* ── 4-TAB NAVIGATION ── */}
      <div className="border-b border-gray-200 flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${activeTab === 'classes'
              ? 'border-brand-orange text-brand-orange'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
          <BookOpen size={16} />
          <span>Archived Classes</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${activeTab === 'classes'
                ? 'bg-orange-100 text-brand-orange'
                : 'bg-gray-100 text-gray-600'
              }`}
          >
            {filteredClasses.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('faculty')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${activeTab === 'faculty'
              ? 'border-brand-orange text-brand-orange'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
          <Layers size={16} />
          <span>Faculty Portfolios</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${activeTab === 'faculty'
                ? 'bg-orange-100 text-brand-orange'
                : 'bg-gray-100 text-gray-600'
              }`}
          >
            {filteredFaculty.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('periods')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${activeTab === 'periods'
              ? 'border-brand-orange text-brand-orange'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
          <CalendarDays size={16} />
          <span>Academic Periods</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${activeTab === 'periods'
                ? 'bg-orange-100 text-brand-orange'
                : 'bg-gray-100 text-gray-600'
              }`}
          >
            {filteredPeriods.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('instructors')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${activeTab === 'instructors'
              ? 'border-brand-orange text-brand-orange'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
          <Users size={16} />
          <span>Inactive Faculty</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${activeTab === 'instructors'
                ? 'bg-orange-100 text-brand-orange'
                : 'bg-gray-100 text-gray-600'
              }`}
          >
            {filteredInactiveFaculty.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: ARCHIVED CLASSES CONTENT ── */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <RefreshCw size={24} className="animate-spin text-brand-orange" />
              <p className="text-xs sm:text-sm">Loading archived classes…</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto">
                <BookOpen size={22} />
              </div>
              <h3 className="text-base font-bold text-gray-800">No archived classes found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No archived classes match your search and filter criteria.'
                  : 'Classes that are completed or archived from previous terms will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredClasses.map((item) => {
                const id = item._id || item.id;
                const subjectCode = item.subject?.code || 'SUBJ';
                const subjectName = item.subject?.name || '';
                const sectionCode = item.section?.code || 'SEC';
                const instructorName = item.ownerId?.fullName || 'Assigned Instructor';
                const department = item.ownerId?.department || item.section?.name || 'College of Technologies';
                const sy = item.academicPeriod?.schoolYear || '2026-2027';
                const sem = formatSemName(item.academicPeriod?.semester);

                const approved = item.approvedCount ?? 0;
                const pending = item.pendingCount ?? 0;
                const rejected = item.rejectedCount ?? 0;
                const total = item.totalRequired || 31;

                const approvedPct = total > 0 ? (approved / total) * 100 : 0;
                const pendingPct = total > 0 ? (pending / total) * 100 : 0;
                const rejectedPct = total > 0 ? (rejected / total) * 100 : 0;

                return (
                  <div
                    key={id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xs hover:shadow-xs transition space-y-4"
                  >
                    {/* Header Row: Subject, Section, Instructor, and Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-bold text-brand-purple tracking-tight">
                            {subjectCode} · {sectionCode}
                          </h3>
                          <span className="rounded-md bg-purple-50 text-brand-purple border border-purple-200/80 px-2 py-0.5 text-[11px] font-bold">
                            Archived
                          </span>
                        </div>
                        {subjectName && (
                          <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                            {subjectName}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                          <span>A.Y. {sy}, {sem}</span>
                          <span>•</span>
                          <span className="font-medium text-gray-700">{instructorName}</span>
                          <span>•</span>
                          <span className="text-gray-400">{department}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestoreClass(item)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs transition cursor-pointer"
                          title="Restore class to active listings"
                        >
                          <RotateCcw size={14} className="text-gray-500" />
                          <span>Restore</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/admin/class-portfolio/${id}?from=archive`)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-semibold text-xs shadow-2xs transition cursor-pointer"
                        >
                          <span>Open Portfolio</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Segmented Progress Bar */}
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 flex">
                      {approvedPct > 0 && (
                        <div
                          style={{ width: `${approvedPct}%` }}
                          className="h-full bg-[#5cab5f] transition-all"
                          title={`Approved: ${approved}`}
                        />
                      )}
                      {pendingPct > 0 && (
                        <div
                          style={{ width: `${pendingPct}%` }}
                          className="h-full bg-[#f5a30f] transition-all"
                          title={`Pending: ${pending}`}
                        />
                      )}
                      {rejectedPct > 0 && (
                        <div
                          style={{ width: `${rejectedPct}%` }}
                          className="h-full bg-[#ef4444] transition-all"
                          title={`Rejected: ${rejected}`}
                        />
                      )}
                    </div>

                    {/* Progress Legend */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 gap-2">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#5cab5f]" />
                          <strong>{approved}</strong> Approved
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#f5a30f]" />
                          <strong>{pending}</strong> For Review
                        </span>
                        {rejected > 0 && (
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                            <strong>{rejected}</strong> Needs Revision
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-brand-purple">
                        {approved} of {total} requirements completed
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: FACULTY COMPLIANCE RECORDS ── */}
      {activeTab === 'faculty' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <RefreshCw size={24} className="animate-spin text-brand-orange" />
              <p className="text-xs sm:text-sm">Loading faculty compliance portfolios…</p>
            </div>
          ) : filteredFaculty.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto">
                <Layers size={22} />
              </div>
              <h3 className="text-base font-bold text-gray-800">No faculty records found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No faculty members match your filter criteria.'
                  : 'Faculty compliance portfolios and checklist submissions will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredFaculty.map((inst) => {
                const id = inst._id || inst.id;
                const summary = facultySummaries[id];
                const completion = summary ? computeCompletion(summary) : null;
                const percent = completion ? completion.percent : 0;
                const approvedCount = completion?.counts?.approved ?? 0;
                const pendingCount = completion?.counts?.pending ?? 0;
                const rejectedCount = completion?.counts?.rejected ?? 0;
                const photo = inst.profile?.photoUrl || inst.googlePhotoUrl;
                const isDownloading = downloadingExcelId === id;

                return (
                  <div
                    key={id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xs hover:shadow-xs transition space-y-4"
                  >
                    {/* Header Row: Instructor Info + Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {photo ? (
                          <img
                            src={photo}
                            alt={inst.fullName}
                            className="w-12 h-12 rounded-full object-cover border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-brand-orange text-white font-bold text-sm flex items-center justify-center shrink-0">
                            {getInitials(inst.fullName)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                              {inst.fullName}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-brand-purple border border-purple-200/80">
                              {inst.profile?.rank || inst.department || 'Faculty'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {inst.email} • {inst.department || 'College of Technologies'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleExportExcel(inst)}
                          disabled={isDownloading}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
                          title="Export official Faculty Checklist Excel"
                        >
                          <FileSpreadsheet
                            size={14}
                            className={isDownloading ? 'animate-spin text-brand-orange' : 'text-emerald-600'}
                          />
                          <span>{isDownloading ? 'Exporting…' : 'Export Excel'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/admin/reports?instructorId=${id}&from=archive`)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-brand-purple font-semibold text-xs transition cursor-pointer"
                        >
                          <Eye size={14} />
                          <span>View Checklist</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/admin/review/faculty-portfolio?instructorId=${id}&from=archive`)
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-semibold text-xs shadow-2xs transition cursor-pointer"
                        >
                          <span>Review Portfolio</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 flex">
                      {completion?.approvedPct > 0 && (
                        <div
                          style={{ width: `${completion.approvedPct}%` }}
                          className="h-full bg-[#5cab5f] transition-all"
                          title={`Approved: ${approvedCount}`}
                        />
                      )}
                      {completion?.pendingPct > 0 && (
                        <div
                          style={{ width: `${completion.pendingPct}%` }}
                          className="h-full bg-[#f5a30f] transition-all"
                          title={`Pending: ${pendingCount}`}
                        />
                      )}
                      {completion?.rejectedPct > 0 && (
                        <div
                          style={{ width: `${completion.rejectedPct}%` }}
                          className="h-full bg-[#ef4444] transition-all"
                          title={`Needs Revision: ${rejectedCount}`}
                        />
                      )}
                    </div>

                    {/* Progress Breakdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 gap-2">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#5cab5f]" />
                          <strong>{approvedCount}</strong> Approved Files
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#f5a30f]" />
                          <strong>{pendingCount}</strong> In Review
                        </span>
                        {rejectedCount > 0 && (
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                            <strong>{rejectedCount}</strong> Needs Revision
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-brand-purple">
                        {percent}% Overall Institutional Compliance
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: ARCHIVED ACADEMIC PERIODS ── */}
      {activeTab === 'periods' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <RefreshCw size={24} className="animate-spin text-brand-orange" />
              <p className="text-xs sm:text-sm">Loading archived academic periods…</p>
            </div>
          ) : filteredPeriods.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto">
                <CalendarDays size={22} />
              </div>
              <h3 className="text-base font-bold text-gray-800">No archived academic periods found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No archived academic periods match your search query.'
                  : 'Academic periods archived by administrator upon school year conclusion will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredPeriods.map((period) => {
                const id = period._id || period.id;
                const periodClasses = classes.filter(
                  (c) =>
                    c.academicPeriodId === id ||
                    (c.academicPeriod?.schoolYear === period.schoolYear &&
                      c.academicPeriod?.semester === period.semester)
                );

                return (
                  <div
                    key={id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                          A.Y. {period.schoolYear} · {formatSemName(period.semester)}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-brand-purple border border-purple-200/80">
                          Archived Period
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDate(period.startDate)} — {formatDate(period.endDate)}
                        {period.archivedAt && (
                          <span className="ml-2 text-gray-400">
                            • Archived on {formatDate(period.archivedAt)}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600 font-medium pt-0.5">
                        {periodClasses.length} class portfolios preserved under this period
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSchoolYear(period.schoolYear);
                          setActiveTab('classes');
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs transition cursor-pointer"
                      >
                        <BookOpen size={14} className="text-gray-500" />
                        <span>View Classes</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReopenPeriod(period)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-brand-purple font-semibold text-xs transition cursor-pointer"
                        title="Reopen period into Closed/Inactive state"
                      >
                        <RotateCcw size={14} />
                        <span>Reopen Period</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: INACTIVE FACULTY ROSTER ── */}
      {activeTab === 'instructors' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <RefreshCw size={24} className="animate-spin text-brand-orange" />
              <p className="text-xs sm:text-sm">Loading inactive faculty records…</p>
            </div>
          ) : filteredInactiveFaculty.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto">
                <Users size={22} />
              </div>
              <h3 className="text-base font-bold text-gray-800">No inactive faculty accounts</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No inactive instructors match your search criteria.'
                  : 'Faculty accounts that are retired, contract-ended, or deactivated will be archived here.'}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[11px] font-bold border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-5">Instructor</th>
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Preserved Classes</th>
                      <th className="py-3.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredInactiveFaculty.map((inst) => {
                      const id = inst._id || inst.id;
                      const instClasses = classes.filter(
                        (c) => c.ownerId?._id === id || c.ownerId === id
                      );
                      const photo = inst.profile?.photoUrl || inst.googlePhotoUrl;

                      return (
                        <tr key={id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              {photo ? (
                                <img
                                  src={photo}
                                  alt={inst.fullName}
                                  className="w-9 h-9 rounded-full object-cover border border-gray-200"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-brand-orange text-white font-bold text-xs flex items-center justify-center">
                                  {getInitials(inst.fullName)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate">{inst.fullName}</p>
                                <p className="text-xs text-gray-400 truncate">{inst.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-gray-600">
                            {inst.department || 'College of Technologies'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200">
                              {inst.accountStatus || 'Deactivated'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-600 font-semibold">
                            {instClasses.length} archived classes
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              type="button"
                              onClick={() => handleReactivateInstructor(inst)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 text-xs font-semibold transition cursor-pointer"
                            >
                              <RotateCcw size={12} />
                              <span>Reactivate</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REUSABLE CONFIRMATION MODAL ── */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-all">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-brand-orange border border-orange-100 shadow-2xs">
              <RotateCcw size={26} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">{confirmModal.title}</h3>
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
                {confirmModal.message}
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={confirmModal.loading}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                disabled={confirmModal.loading}
                className={`flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${confirmModal.confirmColor}`}
              >
                {confirmModal.loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Processing…</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>{confirmModal.confirmText}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
