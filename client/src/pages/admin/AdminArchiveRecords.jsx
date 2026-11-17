import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnimatedModal } from '../../hooks/useAnimatedModal';
import {
  Archive,
  RotateCcw,
  CalendarDays,
  BookOpen,
  Layers,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

const API_PERIODS_URL = 'http://localhost:5000/api/academic-periods';

const STATUS_BADGE = {
  Closed: { label: 'Inactive/Closed', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  Archived: { label: 'Archived', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const PAGE_SIZE = 5;

const PAGER_BTN =
  'w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer';

function getPageNumbers(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, '...', total];
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function MetricCard({ icon: Icon, label, value, note, tone }) {
  const tones = {
    purple: 'bg-purple-50 text-brand-purple border-purple-100',
    orange: 'bg-orange-50 text-brand-orange border-orange-100',
    green: 'bg-[#eaf5e7] text-[#5cab5f] border-green-100',
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

export default function AdminArchiveRecords() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [periods, setPeriods] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [schoolYearFilter, setSchoolYearFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmColor: 'bg-purple-600 hover:bg-purple-700',
    loading: false,
    onConfirm: null,
  });
  const confirmAnim = useAnimatedModal(confirmModal.isOpen);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_PERIODS_URL}?includeArchived=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load academic periods.');

      const pList = Array.isArray(data) ? data : data?.periods || [];
      setPeriods(pList);
    } catch (err) {
      console.error('Error loading archive records:', err);
      setError(err.message || 'Failed to load academic periods.');
      showToast('Some archive records could not be loaded.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 3 Summary Counts
  const totalYears = periods.length;
  const closedYears = useMemo(
    () => periods.filter((p) => p.status === 'Closed' && !p.isArchived).length,
    [periods]
  );
  const archivedYears = useMemo(
    () => periods.filter((p) => p.isArchived || p.status === 'Archived').length,
    [periods]
  );

  // Only Closed (Inactive) or Archived periods
  const recordPeriods = useMemo(
    () =>
      periods.filter(
        (p) => p.isArchived || p.status === 'Archived' || p.status === 'Closed'
      ),
    [periods]
  );

  const availableSchoolYears = useMemo(() => {
    const set = new Set();
    recordPeriods.forEach((p) => {
      if (p.schoolYear) set.add(p.schoolYear);
    });
    return Array.from(set).sort().reverse();
  }, [recordPeriods]);

  // Filtered Academic Periods
  const filteredPeriods = useMemo(() => {
    return recordPeriods.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const sy = (p.schoolYear || '').toLowerCase();
      const sem = formatSemName(p.semester).toLowerCase();
      const isArch = Boolean(p.isArchived || p.status === 'Archived');
      const effectiveStatus = isArch ? 'Archived' : 'Closed';

      const matchesSearch = !q || sy.includes(q) || sem.includes(q);
      const matchesSy = schoolYearFilter === 'all' || p.schoolYear === schoolYearFilter;
      const matchesSem = semesterFilter === 'all' || p.semester === semesterFilter;
      const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;

      return matchesSearch && matchesSy && matchesSem && matchesStatus;
    });
  }, [recordPeriods, searchQuery, schoolYearFilter, semesterFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, schoolYearFilter, semesterFilter, statusFilter]);

  const totalItems = filteredPeriods.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedPeriods = filteredPeriods.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const showingFrom = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, totalItems);

  // Archive Closed Period
  const handleArchivePeriod = (period) => {
    const periodName = `AY ${period.schoolYear} · ${formatSemName(period.semester)}`;

    setConfirmModal({
      isOpen: true,
      title: 'Archive Academic Period?',
      message: `Archiving ${periodName} will move it into permanent Archive records. All portfolios and review records will be preserved in read-only mode.`,
      confirmText: 'Archive Period',
      confirmColor: 'bg-purple-600 hover:bg-purple-700',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmModal((prev) => ({ ...prev, loading: true }));
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_PERIODS_URL}/${period._id}/archive`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Failed to archive academic period.');

          showToast(`${periodName} archived successfully.`);
          await loadData(true);
          window.dispatchEvent(new Event('academic-period-updated'));
          setConfirmModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        } catch (err) {
          showToast(err.message || 'Failed to archive academic period.', 'error');
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // Reopen Archived Period (sets back to Closed/Inactive)
  const handleReopenPeriod = (period) => {
    const periodName = `AY ${period.schoolYear} · ${formatSemName(period.semester)}`;

    setConfirmModal({
      isOpen: true,
      title: 'Reopen Academic Period?',
      message: `Reopening ${periodName} will remove its archived status and set it back to Inactive/Closed so portfolio reviews or adjustments can be conducted.`,
      confirmText: 'Reopen Period',
      confirmColor: 'bg-purple-600 hover:bg-purple-700',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmModal((prev) => ({ ...prev, loading: true }));
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_PERIODS_URL}/${period._id}/unarchive`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Failed to reopen academic period.');

          showToast(`${periodName} reopened successfully.`);
          await loadData(true);
          window.dispatchEvent(new Event('academic-period-updated'));
          setConfirmModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        } catch (err) {
          showToast(err.message || 'Failed to reopen academic period.', 'error');
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

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
              type="button"
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
            <h1 className="text-xl font-bold text-brand-purple sm:text-2xl">
              Archive Records
            </h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
              Read-Only
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Closed and archived academic years with preserved course portfolios and compliance records.
          </p>
        </div>
      </div>

      {/* ── 3 METRIC STAT CARDS ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={CalendarDays}
          label="Total Years"
          value={totalYears}
          note="All academic periods"
          tone="purple"
        />
        <MetricCard
          icon={BookOpen}
          label="Closed Years"
          value={closedYears}
          note="Closed / inactive terms"
          tone="orange"
        />
        <MetricCard
          icon={Layers}
          label="Archived Years"
          value={archivedYears}
          note="Completed and preserved terms"
          tone="green"
        />
      </section>

      {/* ── SEARCH + FILTERS (AcademicPeriod design) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        {/* Search */}
        <div className="relative sm:col-span-2 lg:col-span-5">
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

        {/* Academic Year filter */}
        <div className="relative lg:col-span-3">
          <select
            value={schoolYearFilter}
            onChange={(e) => setSchoolYearFilter(e.target.value)}
            aria-label="Filter by academic year"
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-3 pl-4 pr-9 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
          >
            <option value="all">All academic years</option>
            {availableSchoolYears.map((sy) => (
              <option key={sy} value={sy}>
                AY {sy}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Semester filter */}
        <div className="relative lg:col-span-2">
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            aria-label="Filter by semester"
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-3 pl-4 pr-9 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
          >
            <option value="all">All semesters</option>
            <option value="1st">1st Semester</option>
            <option value="2nd">2nd Semester</option>
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative lg:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-3 pl-4 pr-9 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="Closed">Inactive/Closed</option>
            <option value="Archived">Archived</option>
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* ── TABLE + PAGINATION CARD (AcademicPeriod design) ── */}
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
                    No closed or archived academic periods found.
                  </td>
                </tr>
              ) : (
                paginatedPeriods.map((item) => {
                  const isArchived = Boolean(item.isArchived || item.status === 'Archived');
                  const badge = isArchived ? STATUS_BADGE.Archived : STATUS_BADGE.Closed;

                  return (
                    <tr
                      key={item._id}
                      onClick={() => navigate(`/admin/archive-records/${item._id}`)}
                      className="hover:bg-orange-50/40 transition-colors duration-150 cursor-pointer"
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
                      <td
                        className="py-4 px-6 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-start gap-2">
                          {isArchived ? (
                            <button
                              type="button"
                              onClick={() => handleReopenPeriod(item)}
                              title="Reopen archived period into Inactive/Closed state"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reopen</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleArchivePeriod(item)}
                              title="Archive this closed academic period"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:text-purple-600 hover:bg-purple-50 hover:border-purple-200 transition cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              <span>Archive</span>
                            </button>
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

      {/* ── CONFIRMATION MODAL ── */}
      {confirmAnim.rendered && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`absolute inset-0 bg-gray-900/40 ${confirmAnim.backdropAnim}`}
            onClick={() => !confirmModal.loading && setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
          />
          <div className={`relative w-full max-w-sm rounded-[28px] bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] ring-1 ring-purple-100 p-6 ${confirmAnim.panelAnim}`}>
            <div className="absolute inset-x-6 top-0 h-1 rounded-full bg-brand-purple" />

            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-purple-50 text-brand-purple">
              <RotateCcw size={24} strokeWidth={2} />
            </div>

            <h3 className="text-base font-semibold text-gray-900 mb-1.5">{confirmModal.title}</h3>
            <p className="text-sm leading-relaxed text-gray-500 mb-6">{confirmModal.message}</p>

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={confirmModal.loading}
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmModal.loading}
                onClick={confirmModal.onConfirm}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 ${confirmModal.confirmColor}`}
              >
                {confirmModal.loading ? 'Processing…' : confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
