import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
  Lock,
  Archive,
  Clock,
  AlertTriangle,
  RotateCcw,
  Eye,
  Edit2,
  Trash2,
  X,
  Users,
  BookOpen,
  Layers,
  FileCheck,
  Check,
  CalendarDays,
  Sparkles,
} from 'lucide-react';

// Set to true to bring back the full set of row actions
const SHOW_LEGACY_ACTIONS = false;

const STATUS_BADGE = {
  Active: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500 animate-pulse',
    icon: CheckCircle2,
    label: 'Active',
  },
  Upcoming: {
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    icon: Clock,
    label: 'Upcoming',
  },
  Closed: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    icon: Lock,
    label: 'Inactive/Closed',
  },
  Archived: {
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
    icon: Archive,
    label: 'Archived',
  },
};

const PAGE_SIZE = 5;

// Fixed-size slot so icons stay aligned even when an action is hidden
const ACTION_SLOT = 'w-9 h-9 flex items-center justify-center';

const ActionButton = ({ onClick, label, icon: Icon, hover }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    title={label}
    aria-label={label}
    className={`w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-xs transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${hover}`}
  >
    <Icon className="w-4 h-4" />
  </button>
);

const LabelButton = ({ onClick, label, icon: Icon, hover }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`inline-flex items-center justify-center gap-2 w-32 py-2 rounded-lg border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${hover}`}
  >
    {Icon && <Icon className="w-4 h-4" />}
    {label}
  </button>
);

const EmptySlot = () => <div className={ACTION_SLOT} aria-hidden="true" />;

// Builds e.g. [1, '...', 4, 5, 6, '...', 12]
const getPageNumbers = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('...');
    result.push(p);
  });
  return result;
};

const PAGER_BTN =
  'w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition cursor-pointer';

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatSemName = (sem) => {
  if (sem === 'Summer') return 'Summer Term';
  return `${sem} Semester`;
};

export default function AcademicPeriod() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'active-upcoming', 'closed-archived'
  const [searchQuery, setSearchQuery] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [detailsPeriodId, setDetailsPeriodId] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    confirmColor: 'bg-orange-500',
    onConfirm: null,
  });

  // Toast message
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Form State
  const [formData, setFormData] = useState({
    schoolYear: '',
    semester: '1st',
    startDate: '',
    endDate: '',
    status: 'Upcoming',
    setActive: false,
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch Academic Periods
  const fetchPeriods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/academic-periods', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load academic periods');
      }

      const data = await res.json();
      setPeriods(data.periods || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  // Open Create Modal
  const handleOpenCreate = () => {
    // Default to the school year after the latest one that already exists
    const latestStartYear = periods.reduce((max, p) => {
      const m = p.schoolYear?.match(/^(\d{4})-(\d{4})$/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);

    const yearFrom = latestStartYear ? latestStartYear + 1 : new Date().getFullYear();

    setFormData({
      schoolYear: `${yearFrom}-${yearFrom + 1}`,
      semester: '1st',
      startDate: '',
      endDate: '',
      status: 'Upcoming',
      setActive: false,
    });
    setEditingPeriod(null);
    setFormError('');
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (period) => {
    setEditingPeriod(period);
    setFormData({
      schoolYear: period.schoolYear,
      semester: period.semester,
      startDate: period.startDate ? period.startDate.split('T')[0] : '',
      endDate: period.endDate ? period.endDate.split('T')[0] : '',
      status: period.status,
      setActive: period.isCurrent,
    });
    setFormError('');
    setIsFormOpen(true);
  };

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validations
    const syMatch = formData.schoolYear.match(/^(\d{4})-(\d{4})$/);
    if (!syMatch) {
      setFormError('Academic Year format must be YYYY-YYYY (e.g., 2026-2027).');
      return;
    }
    const startY = parseInt(syMatch[1], 10);
    const endY = parseInt(syMatch[2], 10);
    if (endY !== startY + 1) {
      setFormError('End year must be the next consecutive year (e.g., 2026-2027).');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setFormError('Please provide both Start Date and End Date.');
      return;
    }

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      setFormError('End Date must be strictly later than Start Date.');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const url = editingPeriod
        ? `/api/academic-periods/${editingPeriod._id}`
        : '/api/academic-periods';
      const method = editingPeriod ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Operation failed');
      }

      showToast(
        editingPeriod
          ? 'Academic period updated successfully.'
          : 'Academic period created successfully.'
      );
      setIsFormOpen(false);
      fetchPeriods();

      // Dispatch event to update topbar
      window.dispatchEvent(new Event('academic-period-updated'));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Activate Period
  const handleActivate = (period) => {
    setConfirmModal({
      isOpen: true,
      title: 'Activate Academic Period?',
      message: `Are you sure you want to activate AY ${period.schoolYear} · ${formatSemName(
        period.semester
      )}? This will set it as the default context throughout the system and deactivate any currently active period.`,
      confirmText: 'Activate',
      confirmColor: 'bg-emerald-600 hover:bg-emerald-700',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/academic-periods/${period._id}/activate`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Failed to activate');

          showToast(`AY ${period.schoolYear} · ${formatSemName(period.semester)} is now Active.`);
          fetchPeriods();
          window.dispatchEvent(new Event('academic-period-updated'));
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Deactivate Period
  const handleDeactivate = (period) => {
    setConfirmModal({
      isOpen: true,
      title: 'Deactivate Academic Period?',
      message: `Deactivating AY ${period.schoolYear} · ${formatSemName(
        period.semester
      )} will remove it as the default system context and lock new document submissions from instructors. Existing portfolios will remain accessible. No academic period will be active until you activate another one.`,
      confirmText: 'Deactivate',
      confirmColor: 'bg-amber-600 hover:bg-amber-700',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/academic-periods/${period._id}/deactivate`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Failed to deactivate');

          showToast(`AY ${period.schoolYear} · ${formatSemName(period.semester)} deactivated.`);
          fetchPeriods();
          window.dispatchEvent(new Event('academic-period-updated'));
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Close Period (legacy action)
  const handleClose = (period) => {
    setConfirmModal({
      isOpen: true,
      title: 'Close Academic Period?',
      message: `Closing AY ${period.schoolYear} · ${formatSemName(
        period.semester
      )} will lock new document submissions and updates from instructors. Existing portfolios will remain accessible for reference.`,
      confirmText: 'Close Period',
      confirmColor: 'bg-amber-600 hover:bg-amber-700',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/academic-periods/${period._id}/close`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Failed to close');

          showToast(`AY ${period.schoolYear} · ${formatSemName(period.semester)} is now Closed.`);
          fetchPeriods();
          window.dispatchEvent(new Event('academic-period-updated'));
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Archive Period (legacy action)
  const handleArchive = (period) => {
    setConfirmModal({
      isOpen: true,
      title: 'Archive Academic Period?',
      message: `Archiving AY ${period.schoolYear} · ${formatSemName(
        period.semester
      )} will move it into the Archive records. All portfolios and review records will be preserved in read-only mode.`,
      confirmText: 'Archive Period',
      confirmColor: 'bg-purple-600 hover:bg-purple-700',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/academic-periods/${period._id}/archive`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Failed to archive');

          showToast(`AY ${period.schoolYear} · ${formatSemName(period.semester)} archived.`);
          fetchPeriods();
          window.dispatchEvent(new Event('academic-period-updated'));
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Delete Period (legacy action)
  const handleDelete = (period) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Academic Period?',
      message: `Are you sure you want to permanently delete AY ${period.schoolYear} · ${formatSemName(
        period.semester
      )}? This action cannot be undone.`,
      confirmText: 'Delete Permanently',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/api/academic-periods/${period._id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Failed to delete');

          showToast('Academic period deleted.');
          fetchPeriods();
          window.dispatchEvent(new Event('academic-period-updated'));
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // View Details
  const handleOpenDetails = async (periodId) => {
    setDetailsPeriodId(periodId);
    setLoadingDetails(true);
    setDetailsData(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/academic-periods/${periodId}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load details');
      const data = await res.json();
      setDetailsData(data);
    } catch (err) {
      showToast(err.message, 'error');
      setDetailsPeriodId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Active / Current period (single source of truth for "active")
  const activePeriod = useMemo(() => {
    return periods.find((p) => p.isCurrent) || periods.find((p) => p.status === 'Active');
  }, [periods]);

  // Periods with a normalized status: only `activePeriod` can ever be 'Active'.
  // This guards the UI against bad data (e.g. two rows with status 'Active').
  const displayPeriods = useMemo(() => {
    return periods.map((p) => {
      if (activePeriod && p._id === activePeriod._id) {
        return p.status === 'Active' ? p : { ...p, status: 'Active' };
      }
      if (p.status === 'Active') {
        return { ...p, status: 'Closed' };
      }
      return p;
    });
  }, [periods, activePeriod]);

  // Statistics
  const stats = useMemo(() => {
    const totalYears = new Set(displayPeriods.map((p) => p.schoolYear)).size;
    const totalSemesters = displayPeriods.length;
    const closedCount = displayPeriods.filter(
      (p) => p.status === 'Closed' || p.status === 'Archived'
    ).length;
    return { totalYears, totalSemesters, closedCount };
  }, [displayPeriods]);

  // Filtered & Sorted periods (Unified Table)
  const unifiedPeriods = useMemo(() => {
    const semOrder = { '1st': 1, '2nd': 2, Summer: 3 };
    const activeYear = activePeriod?.schoolYear;

    const filtered = displayPeriods.filter((p) => {
      // Tab filter
      if (activeTab === 'active-upcoming') {
        if (p.status !== 'Active' && p.status !== 'Upcoming') return false;
      } else if (activeTab === 'closed-archived') {
        if (p.status !== 'Closed' && p.status !== 'Archived') return false;
      }

      // Dropdown status filter
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      // Dropdown semester filter
      if (semesterFilter !== 'all' && p.semester !== semesterFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const sem = formatSemName(p.semester).toLowerCase();
        const sy = p.schoolYear.toLowerCase();
        if (!sy.includes(q) && !sem.includes(q)) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      // 1) Active school year always first
      if (activeYear) {
        const aIsActiveYear = a.schoolYear === activeYear;
        const bIsActiveYear = b.schoolYear === activeYear;
        if (aIsActiveYear !== bIsActiveYear) return aIsActiveYear ? -1 : 1;
      }

      // 2) Then newest school year first
      const yearComp = b.schoolYear.localeCompare(a.schoolYear);
      if (yearComp !== 0) return yearComp;

      // 3) Within a year: 1st, 2nd, Summer
      return (semOrder[a.semester] || 99) - (semOrder[b.semester] || 99);
    });
  }, [displayPeriods, activeTab, statusFilter, semesterFilter, searchQuery, activePeriod]);

  // Pagination calculations
  const totalItems = unifiedPeriods.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedPeriods = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return unifiedPeriods.slice(start, start + PAGE_SIZE);
  }, [unifiedPeriods, currentPage]);

  const showingFrom = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, totalItems);

  // Go back to page 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, semesterFilter, activeTab]);

  return (
    <>
      {/* TOAST FEEDBACK */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${toast.type === 'error'
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Academic Period Management
              </h1>
            </div>
            <p className="text-sm text-gray-500">
              Set up school years, manage semester dates, activate submission terms, and archive completed periods.
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Active Period Card (wide) */}
        <div className="md:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
              Active Academic Period
            </span>
          </div>

          {activePeriod ? (
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                AY {activePeriod.schoolYear} · {formatSemName(activePeriod.semester)}
              </h3>
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-orange-500" />
                <span>
                  {formatDate(activePeriod.startDate)} – {formatDate(activePeriod.endDate)}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              No academic period is currently active. Use "Activate" on any period to set the default context.
            </p>
          )}
        </div>

        {/* Total Academic Years Card (narrow) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Academic Years
            </span>

          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalYears}</div>
            <p className="text-xs text-gray-400 mt-0.5">
              {stats.totalSemesters} total semesters
            </p>
          </div>
        </div>
      </div>

      {/* SEARCH + FILTERS */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-xl">
            <input
              type="text"
              placeholder="Search year or semester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg py-3 pl-4 pr-10 text-[14px] text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>

          {/* Semester filter */}
          <div className="relative w-56 shrink-0">
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              aria-label="Filter by semester"
              className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-3 pl-4 pr-9 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
            >
              <option value="all">All semesters</option>
              <option value="1st">1st Semester</option>
              <option value="2nd">2nd Semester</option>
              <option value="Summer">Summer Term</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status filter */}
          <div className="relative w-48 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-3 pl-4 pr-9 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
            >
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Closed">Inactive</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={handleOpenCreate}
          className="shrink-0 inline-flex items-center gap-2 px-10 py-3 text-[14px] font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Academic Period
        </button>
      </div>

      {/* TABLE + PAGINATION CARD */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="py-3.5 px-6">Academic Period</th>
                <th className="py-3.5 px-6">Semester</th>
                <th className="py-3.5 px-4">Period Dates</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-left">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-gray-400">
                    Loading academic periods...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-red-500">
                    {error}
                  </td>
                </tr>
              ) : paginatedPeriods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-gray-400">
                    No academic periods found.
                  </td>
                </tr>
              ) : (
                paginatedPeriods.map((item) => {
                  const badge = STATUS_BADGE[item.status] || STATUS_BADGE.Upcoming;
                  const itemStats = item.stats || {};

                  // Legacy action rules
                  const canActivate = item.status !== 'Active' && item.status !== 'Archived';
                  const canEdit = item.status !== 'Archived';
                  const canClose = item.status === 'Active';
                  const canArchive = item.status === 'Closed';

                  const canDelete =
                    item.status === 'Upcoming' && (itemStats.classesCount || 0) === 0;

                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-gray-50/60 transition-colors duration-150"
                    >
                      {/* Academic Period */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="text-gray-700 text-sm">AY {item.schoolYear}</span>
                      </td>

                      {/* Semester */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="text-sm text-gray-500 font-medium">
                          {formatSemName(item.semester)}
                        </span>
                      </td>

                      {/* Period Dates */}
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>
                            {formatDate(item.startDate)} – {formatDate(item.endDate)}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      {SHOW_LEGACY_ACTIONS ? (
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="flex items-center justify-start gap-2">
                            {/* Slot 1: View */}
                            <ActionButton
                              label="View Details"
                              icon={Eye}
                              hover="hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200"
                              onClick={() => handleOpenDetails(item._id)}
                            />

                            {/* Slot 2: Edit */}
                            {canEdit ? (
                              <ActionButton
                                label="Edit Period"
                                icon={Edit2}
                                hover="hover:text-gray-800 hover:bg-gray-100 hover:border-gray-300"
                                onClick={() => handleOpenEdit(item)}
                              />
                            ) : (
                              <EmptySlot />
                            )}

                            {/* Slot 3: Close (if Active) or Set as Active */}
                            {canClose ? (
                              <ActionButton
                                label="Close Period"
                                icon={Lock}
                                hover="hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200"
                                onClick={() => handleClose(item)}
                              />
                            ) : canActivate ? (
                              <ActionButton
                                label="Set as Active"
                                icon={Check}
                                hover="hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                                onClick={() => handleActivate(item)}
                              />
                            ) : (
                              <EmptySlot />
                            )}

                            {/* Slot 4: Archive (if Closed) or Delete (if Upcoming) */}
                            {canArchive ? (
                              <ActionButton
                                label="Archive Period"
                                icon={Archive}
                                hover="hover:text-purple-600 hover:bg-purple-50 hover:border-purple-200"
                                onClick={() => handleArchive(item)}
                              />
                            ) : canDelete ? (
                              <ActionButton
                                label="Delete Period"
                                icon={Trash2}
                                hover="hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                                onClick={() => handleDelete(item)}
                              />
                            ) : (
                              <EmptySlot />
                            )}
                          </div>
                        </td>
                      ) : (
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="flex items-center justify-start gap-2">
                            {item.status === 'Active' ? (
                              <LabelButton
                                label="Deactivate"
                                hover="hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200"
                                onClick={() => handleDeactivate(item)}
                              />
                            ) : item.status !== 'Archived' ? (
                              <LabelButton
                                label="Activate"
                                hover="hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                                onClick={() => handleActivate(item)}
                              />
                            ) : null}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {!loading && !error && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-white">
            <p className="text-[13px] text-gray-500">
              Showing <span className="font-semibold text-gray-700">{showingFrom}</span>–
              <span className="font-semibold text-gray-700">{showingTo}</span> of{' '}
              <span className="font-semibold text-gray-700">{totalItems}</span>{' '}
              {totalItems === 1 ? 'period' : 'periods'}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={currentPage === 1}
                  aria-label="First page"
                  className={PAGER_BTN}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  className={PAGER_BTN}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {getPageNumbers(currentPage, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span
                      key={`dots-${i}`}
                      className="w-9 h-9 inline-flex items-center justify-center text-gray-400 text-sm"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      aria-current={p === currentPage ? 'page' : undefined}
                      className={`w-9 h-9 inline-flex items-center justify-center rounded-lg text-[13px] font-medium border transition cursor-pointer ${p === currentPage
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  className={PAGER_BTN}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Last page"
                  className={PAGER_BTN}
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isFormOpen && (() => {
        const [yearFrom = '', yearTo = ''] = (formData.schoolYear || '').split('-');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-xl relative">
              {/* Header */}
              <div className="flex items-center justify-between pb-5 border-b border-gray-100 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {editingPeriod ? 'Edit Academic Period' : 'Add Academic Period'}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Define academic year, semester term, and active deadline dates.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  aria-label="Close"
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-5">
                {/* ROW 1: Academic Year (Year From / Year To, both disabled) */}
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-2">
                    Academic Year
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={yearFrom}
                      disabled
                      aria-label="Year From"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 text-[14px] text-gray-500 cursor-not-allowed"
                    />
                    <input
                      type="text"
                      value={yearTo}
                      disabled
                      aria-label="Year To"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 text-[14px] text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* ROW 2: Semester (single column) */}
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-2">
                    Semester
                  </label>
                  <div className="relative">
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-3 pl-4 pr-9 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
                    >
                      <option value="1st">1st Semester</option>
                      <option value="2nd">2nd Semester</option>
                      <option value="Summer">Summer Term</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* ROW 3: Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                      className="w-full bg-white border border-gray-200 rounded-lg py-3 px-4 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                      className="w-full bg-white border border-gray-200 rounded-lg py-3 px-4 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
                    />
                  </div>
                </div>

                {/* Set active (create only) */}
                {!editingPeriod && (
                  <div className="pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.setActive}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            setActive: e.target.checked,
                            status: e.target.checked ? 'Active' : 'Upcoming',
                          })
                        }
                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700 font-medium">
                        Set as active academic period immediately
                      </span>
                    </label>
                    <p className="text-xs text-gray-400 ml-[26px] mt-1">
                      If checked, this period becomes the default system context and deactivates any existing active period.
                    </p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-6 py-3 border border-gray-200 text-gray-600 rounded-lg text-[14px] font-semibold hover:bg-gray-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[14px] font-semibold transition disabled:opacity-50 cursor-pointer"
                  >
                    {submitting
                      ? 'Saving...'
                      : editingPeriod
                        ? 'Save Changes'
                        : 'Create Academic Period'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-8 shadow-xl relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-5 border-b border-gray-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{confirmModal.title}</h3>
                  <p className="text-sm text-gray-400">Please confirm that you want to continue.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                aria-label="Close"
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message */}
            <p className="text-sm text-gray-600 leading-relaxed">{confirmModal.message}</p>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-5 mt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-6 py-3 border border-gray-200 text-gray-600 rounded-lg text-[14px] font-semibold hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-8 py-3 text-white rounded-lg text-[14px] font-semibold transition cursor-pointer ${confirmModal.confirmColor}`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERIOD DETAILS MODAL */}
      {detailsPeriodId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl relative">
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {detailsData?.formatted || 'Loading...'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {detailsData?.period ? (
                      <>
                        {formatDate(detailsData.period.startDate)} – {formatDate(detailsData.period.endDate)} · Status:{' '}
                        <span className="font-semibold text-gray-600">{detailsData.period.status}</span>
                      </>
                    ) : (
                      'Academic period details'
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailsPeriodId(null)}
                aria-label="Close"
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-8 py-6 overflow-y-auto flex-1 space-y-6">
              {loadingDetails ? (
                <div className="py-12 text-center text-gray-400">
                  <RotateCcw className="w-6 h-6 mx-auto mb-2 animate-spin text-orange-500" />
                  <p className="text-sm">Fetching associated classes, instructors, and compliance...</p>
                </div>
              ) : detailsData ? (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <span className="text-[13px] text-gray-500 block mb-1">Instructors</span>
                      <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-orange-500" />
                        {detailsData.summary.totalInstructors}
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <span className="text-[13px] text-gray-500 block mb-1">Classes / Sections</span>
                      <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-500" />
                        {detailsData.summary.totalClasses}
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <span className="text-[13px] text-gray-500 block mb-1">Total Documents</span>
                      <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-purple-500" />
                        {detailsData.summary.totalDocuments}
                      </div>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <span className="text-[13px] text-emerald-700 block mb-1">Compliance Rate</span>
                      <div className="text-xl font-bold text-emerald-800">
                        {detailsData.summary.complianceRate}%
                      </div>
                    </div>
                  </div>

                  {/* Document breakdown */}
                  <div className="p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] font-semibold text-gray-700">Document Review Breakdown</span>
                      <span className="text-xs text-gray-400">
                        {detailsData.summary.approvedDocs} approved · {detailsData.summary.pendingDocs} pending · {detailsData.summary.rejectedDocs} rejected
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden flex">
                      {detailsData.summary.totalDocuments > 0 ? (
                        <>
                          <div
                            style={{ width: `${(detailsData.summary.approvedDocs / detailsData.summary.totalDocuments) * 100}%` }}
                            className="bg-emerald-500"
                            title={`Approved: ${detailsData.summary.approvedDocs}`}
                          />
                          <div
                            style={{ width: `${(detailsData.summary.pendingDocs / detailsData.summary.totalDocuments) * 100}%` }}
                            className="bg-amber-400"
                            title={`Pending: ${detailsData.summary.pendingDocs}`}
                          />
                          <div
                            style={{ width: `${(detailsData.summary.rejectedDocs / detailsData.summary.totalDocuments) * 100}%` }}
                            className="bg-red-400"
                            title={`Rejected: ${detailsData.summary.rejectedDocs}`}
                          />
                        </>
                      ) : (
                        <div className="w-full bg-gray-200" />
                      )}
                    </div>
                  </div>

                  {/* Instructors */}
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-2">
                      Associated Instructors ({detailsData.instructors.length})
                    </label>
                    {detailsData.instructors.length === 0 ? (
                      <p className="text-sm text-gray-400 bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                        No instructors assigned to classes in this period yet.
                      </p>
                    ) : (
                      <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                        {detailsData.instructors.map((inst) => (
                          <div key={inst.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{inst.name}</p>
                              <p className="text-xs text-gray-400">{inst.email} · {inst.department}</p>
                            </div>
                            <div className="flex items-center gap-6 text-right">
                              <div>
                                <span className="text-sm font-medium text-gray-700">{inst.classCount}</span>
                                <span className="text-[11px] text-gray-400 block">Classes</span>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-emerald-600">
                                  {inst.approvedCount} / {inst.documentsSubmitted}
                                </span>
                                <span className="text-[11px] text-gray-400 block">Approved Docs</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Subjects & Sections */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 mb-2">
                        Subjects ({detailsData.subjects.length})
                      </label>
                      {detailsData.subjects.length === 0 ? (
                        <p className="text-sm text-gray-400 bg-gray-50 border border-gray-200 p-3 rounded-lg">
                          No subjects recorded.
                        </p>
                      ) : (
                        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                          {detailsData.subjects.map((s) => (
                            <li key={s.code} className="text-sm px-4 py-2.5 flex items-center justify-between">
                              <span className="font-semibold text-gray-700">{s.code}</span>
                              <span className="text-gray-500 truncate max-w-[180px]">{s.name}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 mb-2">
                        Sections ({detailsData.sections.length})
                      </label>
                      {detailsData.sections.length === 0 ? (
                        <p className="text-sm text-gray-400 bg-gray-50 border border-gray-200 p-3 rounded-lg">
                          No sections recorded.
                        </p>
                      ) : (
                        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                          {detailsData.sections.map((sec) => (
                            <li key={sec.code} className="text-sm px-4 py-2.5 font-medium text-gray-700">
                              {sec.code} {sec.name ? `(${sec.name})` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-8 py-5 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setDetailsPeriodId(null)}
                className="px-6 py-3 border border-gray-200 text-gray-600 rounded-lg text-[14px] font-semibold hover:bg-gray-50 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}