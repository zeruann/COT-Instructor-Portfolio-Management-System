import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, RotateCw, ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All categories' },
  { value: 'auth', label: 'Authentication' },
  { value: 'document', label: 'Documents' },
  { value: 'settings', label: 'Settings' },
  { value: 'invitation', label: 'Invitations' },
  { value: 'account', label: 'Account' },
  { value: 'period', label: 'Academic Period' },
];

const INSTRUCTOR_CATEGORY_OPTIONS = [
  { value: 'all', label: 'All categories' },
  { value: 'auth', label: 'Authentication' },
  { value: 'document', label: 'Documents' },
];

const ROLE_OPTIONS = [
  { value: 'all', label: 'All roles' },
  { value: 'Administrator', label: 'Administrator' },
  { value: 'Instructor', label: 'Instructor' },
  { value: 'System', label: 'System' },
];

const ACTION_LABELS = {
  'auth.login': 'Logged in',
  'auth.login_failed': 'Failed login attempt',
  'auth.logout': 'Logged out',
  'auth.password_reset_request': 'Requested password reset',
  'auth.password_reset': 'Reset password',
  'auth.password_change': 'Changed password',
  'account.profile_update': 'Updated profile',
  'account.profile_create': 'Created profile',
  'document.upload': 'Uploaded document',
  'document.reupload': 'Re-uploaded document',
  'document.delete': 'Deleted document',
  'document.edit': 'Edited document',
  'document.approve': 'Approved document',
  'document.reject': 'Rejected document',
  'document.archive': 'Archived document',
  'settings.update': 'Updated system settings',
  'settings.integration_toggle': 'Toggled API integration',
  'invitation.send': 'Sent invitation',
  'invitation.resend': 'Resent invitation',
  'invitation.cancel': 'Cancelled invitation',
  'invitation.accept': 'Accepted invitation',
  'account.deactivate': 'Deactivated account',
  'account.reactivate': 'Reactivated account',
  'period.set': 'Set academic period',
  'period.create': 'Created academic period',
  'period.update': 'Updated academic period',
  'period.close': 'Closed academic period',
  'period.archive': 'Archived academic period',
};

const getActionBadgeColor = (action = '') => {
  if (
    action.includes('login') ||
    action.includes('approve') ||
    action.includes('upload') ||
    action.includes('reactivate') ||
    action.includes('accept')
  ) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (
    action.includes('delete') ||
    action.includes('reject') ||
    action.includes('failed') ||
    action.includes('deactivate') ||
    action.includes('cancel')
  ) {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (
    action.includes('logout') ||
    action.includes('password') ||
    action.includes('resend')
  ) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-blue-50 text-blue-700 border-blue-200';
};

const formatAction = (action) => {
  if (!action) return 'Activity';
  return ACTION_LABELS[action] || action.replace(/^[a-z]+\./, '').replace(/_/g, ' ');
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return isNaN(date.getTime())
    ? dateString
    : date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
};

const formatLogId = (logId, date) => {
  if (!logId) {
    const yr = new Date(date || Date.now()).getFullYear();
    return `LOG${yr}-0001`;
  }
  if (/^LOG\d{4}-\d+$/i.test(logId)) {
    return logId.toUpperCase();
  }
  const yr = new Date(date || Date.now()).getFullYear();
  const digits = String(logId).replace(/\D/g, '');
  const suffix = digits ? digits.slice(-4) : '0001';
  return `LOG${yr}-${suffix.padStart(4, '0')}`;
};

const DOCUMENT_NAMES = {
  FAC_B_BACHELORS_DIPLOMA: "Bachelor's Diploma",
  FAC_B_BACHELORS_TOR: "Bachelor's Transcript of Records (TOR)",
  FAC_B_MASTERS_DIPLOMA: "Master's Diploma",
  FAC_B_MASTERS_TOR: "Master's Transcript of Records (TOR)",
  FAC_B_PHD_DIPLOMA: "PhD Diploma",
  FAC_B_PHD_TOR: "PhD Transcript of Records (TOR)",
  FAC_A_PDS: "Personal Data Sheet (PDS)",
  FAC_C_SERVICE_RECORD: "Service Records",
  FAC_D_SEMINAR: "Seminars & Workshops",
  FAC_E_AWARD: "Grants & Awards",
  FAC_F_RESEARCH: "Research",
  FAC_G_EXTENSION: "Extension Involvement",
  FAC_H_PRODUCTION: "Production",
  FAC_I_MEMBERSHIP: "Professional Organization Membership",
  FAC_J_LICENSURE: "Passed Licensure Examinations (PRC ID)",
  FAC_L_IPCR: "IPCR",
  FAC_X_PERFORMANCE_EVAL: "Performance Evaluation",
  FAC_X_EMPLOYMENT_CONTRACT: "Employment Contract",
  FAC_X_MEDICAL_CLEARANCE: "Medical Clearance",
};

const formatTargetLabel = (label) => {
  if (!label || label === '—') return '—';
  if (DOCUMENT_NAMES[label]) return DOCUMENT_NAMES[label];
  if (typeof label === 'string' && /^[A-Z0-9]+_[A-Z0-9_]+$/.test(label)) {
    return label
      .replace(/^(FAC_[A-Z]_|CLS_[A-Z]_|FAC_|CLS_)/, '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return label;
};

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
}

export default function ActivityLogsTable({ role = 'admin' }) {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all'); // 'all', 'today', '7days', '30days', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [tableVisible, setTableVisible] = useState(true);

  const calculateDateRange = useCallback(() => {
    if (dateRange === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return { startDate: today, endDate: today };
    }
    if (dateRange === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      return {
        startDate: past.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      };
    }
    if (dateRange === '30days') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      return {
        startDate: past.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      };
    }
    if (dateRange === 'custom') {
      return {
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
      };
    }
    return {};
  }, [dateRange, customStartDate, customEndDate]);

  const fetchLogs = useCallback(
    async (page = 1) => {
      setTableVisible(false);
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const params = new URLSearchParams({
          page: String(page),
          limit: '15',
        });

        if (searchQuery.trim()) params.append('search', searchQuery.trim());
        if (categoryFilter !== 'all') params.append('category', categoryFilter);
        if (role === 'admin' && roleFilter !== 'all') params.append('actorRole', roleFilter);

        const { startDate, endDate } = calculateDateRange();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const res = await fetch(`/api/settings/audit-logs?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to load activity logs (HTTP ${res.status}).`);
        }

        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
        setTotalLogs(data.total || 0);
        setCurrentPage(data.currentPage || 1);
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        setTimeout(() => setTableVisible(true), 50);
      }
    },
    [searchQuery, categoryFilter, roleFilter, role, calculateDateRange]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const hasActiveFilters =
    categoryFilter !== 'all' ||
    (role === 'admin' && roleFilter !== 'all') ||
    searchQuery.trim() !== '' ||
    dateRange !== 'all' ||
    customStartDate !== '' ||
    customEndDate !== '';

  const clearFilters = () => {
    setCategoryFilter('all');
    setRoleFilter('all');
    setSearchQuery('');
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const renderStatus = (outcome) => {
    const isSuccess = outcome !== 'failure';
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500">
        <span className={`w-2 h-2 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`} />
        {isSuccess ? 'Success' : 'Failed'}
      </span>
    );
  };

  const categories = role === 'admin' ? CATEGORY_OPTIONS : INSTRUCTOR_CATEGORY_OPTIONS;

  return (
    <>
      {/* SEARCH + FILTERS BAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between mb-6 gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <input
              type="text"
              placeholder={
                role === 'admin'
                  ? 'Search by actor, target, log ID or action...'
                  : 'Search by document or action...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg py-2.5 pl-4 pr-10 text-[14px] text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>

          {/* Category Filter */}
          <div className="relative w-48 shrink-0">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
              className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-3.5 pr-9 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
            >
              {categories.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Role Filter (Admin Only) */}
          {role === 'admin' && (
            <div className="relative w-44 shrink-0">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter by role"
                className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-3.5 pr-9 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Date Range Filter */}
          <div className="relative w-40 shrink-0">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              aria-label="Filter by date range"
              className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-3.5 pr-9 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
            <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Custom Date Pickers */}


          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in duration-200" style={{ animation: 'fadeSlideIn 0.2s ease forwards' }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-3.5 pr-4 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
              />
              <span className="text-gray-400 text-s">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-3.5 pr-4 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
              />
            </div>
          )}

          {/* {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline cursor-pointer ml-1"
            >
              Reset
            </button>
          )} */}
        </div>

        {/* Refresh Button */}
        {/* <button
          type="button"
          onClick={() => fetchLogs(currentPage)}
          title="Refresh activity logs"
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:outline-none transition cursor-pointer"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button> */}

        <button
          type="button"
          onClick={clearFilters}
          title="Refresh activity logs"
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:outline-none transition cursor-pointer"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Reset Filters
        </button>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-base font-bold text-gray-800">
            {role === 'admin' ? 'Activity Logs' : 'My Activity Logs'}
          </h2>
          {/* <span className="text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
            Total {totalLogs} {totalLogs === 1 ? 'record' : 'records'}
          </span> */}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs text-gray-600 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-3 pr-4">LOG ID</th>
                {role === 'admin' && <th className="pb-3 pr-4">ACTOR</th>}
                <th className="pb-3 pr-4">ACTION</th>
                <th className="pb-3 pr-4">TARGET / DETAIL</th>
                <th className="pb-3 pr-4">CATEGORY</th>
                <th className="pb-3">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-100 text-sm transition-opacity duration-300 ${tableVisible ? 'opacity-100' : 'opacity-0'}`}>
              {loading ? (
                <tr>
                  <td
                    colSpan={role === 'admin' ? 6 : 5}
                    className="py-8 text-center text-xs text-gray-400"
                  >
                    Loading activity logs...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={role === 'admin' ? 6 : 5}
                    className="py-8 text-center text-xs text-red-500"
                  >
                    {error}
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50/50 transition-colors duration-150">
                    {/* Log ID */}
                    <td className="py-4 pr-4 align-top font-mono text-[14px] text-gray-700 whitespace-nowrap">
                      {formatLogId(item.logId, item.at)}
                    </td>

                    {/* Actor (Admin only) */}
                    {role === 'admin' && (
                      <td className="py-4 pr-4">
                        <div
                          className={`flex items-center gap-3 ${item.actorId && item.actorRole === 'Instructor'
                              ? 'cursor-pointer group'
                              : ''
                            }`}
                          onClick={() => {
                            if (item.actorId && item.actorRole === 'Instructor') {
                              navigate(`/admin/instructors/${item.actorId}`);
                            }
                          }}
                        >
                          <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center shrink-0 overflow-hidden border border-orange-100">
                            {item.actorPhoto ? (
                              <img
                                src={item.actorPhoto}
                                alt={item.actorName || 'Actor'}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : null}
                            <div
                              className="avatar-fallback w-full h-full rounded-full bg-orange-100 text-orange-600 font-semibold text-xs flex items-center justify-center"
                              style={{ display: item.actorPhoto ? 'none' : 'flex' }}
                            >
                              {item.actorRole === 'System' ? (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#fb923c"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                              ) : (
                                getInitials(item.actorName)
                              )}
                            </div>
                          </div>
                          <div>
                            <p
                              className={`text-[15px] font-medium text-gray-800 leading-tight ${item.actorId && item.actorRole === 'Instructor'
                                  ? 'group-hover:text-orange-600 transition-colors'
                                  : ''
                                }`}
                            >
                              {item.actorName || 'System'}
                            </p>
                            <p className="text-[13px] text-gray-400 leading-tight">
                              {item.actorRole || 'System'}
                            </p>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Action */}
                    <td className="py-4 pr-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[13px] font-medium border ${getActionBadgeColor(
                          item.action
                        )}`}
                      >
                        {formatAction(item.action)}
                      </span>
                    </td>

                    {/* Target / Detail */}
                    <td className="py-4 pr-4 text-gray-500 text-[14px] max-w-xs truncate" title={item.details || item.targetLabel || '—'}>
                      {formatTargetLabel(item.details || item.targetLabel || '—')}
                    </td>

                    {/* Category */}
                    <td className="py-4 pr-4 text-gray-500 text-[14px] capitalize">
                      {item.category || '—'}
                    </td>

                    {/* Timestamp */}
                    <td className="py-4 pr-4 text-gray-500 text-[14px] whitespace-nowrap">
                      {formatDate(item.at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={role === 'admin' ? 6 : 5}
                    className="py-8 text-center text-xs text-gray-400"
                  >
                    {hasActiveFilters ? 'No activity logs match your filters.' : 'No activity logs found.'}
                    {hasActiveFilters && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-orange  rounded-lg hover:text-orange-600 focus:outline-none transition cursor-pointer"
                        >
                          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                          Clear Filters
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR (matching the card's clean look) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 text-[13px] text-gray-500">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => fetchLogs(currentPage - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 inline" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages || loading}
                onClick={() => fetchLogs(currentPage + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 inline" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
