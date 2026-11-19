import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
  Calendar,
  X,
  File,
} from 'lucide-react';

const SYSTEM_ACTION_OPTIONS = [
  { value: 'all', label: 'All System Actions' },
  { value: 'auth.login', label: 'Logged in' },
  { value: 'auth.logout', label: 'Logged out' },
  { value: 'auth.mode_switch', label: 'Switched Role' },
  { value: 'auth.mode_switch_failed', label: 'Failed Role Verification' },
  { value: 'auth.password_change', label: 'Changed password' },
  { value: 'auth.password_reset', label: 'Reset password' },
  { value: 'account.profile_update', label: 'Updated profile' },
  { value: 'account.profile_create', label: 'Created profile' },
  { value: 'account.admin_access_grant', label: 'Granted Admin Privileges' },
  { value: 'account.admin_access_update', label: 'Updated Admin Privileges' },
  { value: 'account.admin_access_revoke', label: 'Revoked Admin Privileges' },
];

const DOCUMENT_ACTION_OPTIONS = [
  { value: 'all', label: 'All Document Actions' },
  { value: 'document.upload', label: 'Uploaded document' },
  { value: 'document.reupload', label: 'Re-uploaded document' },
  { value: 'document.delete', label: 'Deleted document' },
  { value: 'document.edit', label: 'Edited document' },
  { value: 'document.approve', label: 'Approved document' },
  { value: 'document.reject', label: 'Rejected document' },
];

const ACTION_LABELS = {
  'auth.login': 'Logged in',
  'auth.login_failed': 'Failed login',
  'auth.logout': 'Logged out',
  'auth.mode_switch': 'Switched Role',
  'auth.mode_switch_failed': 'Failed Role Verification',
  'auth.password_reset_request': 'Requested password reset',
  'auth.password_reset': 'Reset password',
  'auth.password_change': 'Changed password',
  'account.profile_update': 'Updated profile',
  'account.profile_create': 'Created profile',
  'account.admin_access_grant': 'Granted Admin Privileges',
  'account.admin_access_update': 'Updated Admin Privileges',
  'account.admin_access_revoke': 'Revoked Admin Privileges',
  'invitation.send': 'Sent invitation',
  'document.upload': 'Uploaded document',
  'document.reupload': 'Re-uploaded document',
  'document.delete': 'Deleted document',
  'document.edit': 'Edited document',
  'document.approve': 'Approved document',
  'document.reject': 'Rejected document',
  'document.archive': 'Archived document',
};

const formatActionName = (action) => {
  if (!action) return 'Activity';
  return ACTION_LABELS[action] || action.replace(/^[a-z]+\./, '').replace(/_/g, ' ');
};

const formatDocumentName = (keyOrName) => {
  if (!keyOrName || keyOrName === '—') return '—';

  // Direct mapping for requirement keys
  if (keyOrName === 'FAC_B_BACHELORS_DIPLOMA') return "Bachelor's Diploma";
  if (keyOrName === 'FAC_B_BACHELORS_TOR') return "Bachelor's Transcript of Records (TOR)";
  if (keyOrName === 'FAC_B_MASTERS_DIPLOMA') return "Master's Diploma";
  if (keyOrName === 'FAC_B_MASTERS_TOR') return "Master's Transcript of Records (TOR)";
  if (keyOrName === 'FAC_B_PHD_DIPLOMA') return "PhD Diploma";
  if (keyOrName === 'FAC_B_PHD_TOR') return "PhD Transcript of Records (TOR)";
  if (keyOrName === 'FAC_A_PDS') return "Personal Data Sheet (PDS)";
  if (keyOrName === 'FAC_C_SERVICE_RECORD') return "Service Records";
  if (keyOrName === 'FAC_D_SEMINAR') return "Seminars & Workshops";
  if (keyOrName === 'FAC_E_AWARD') return "Grants & Awards";
  if (keyOrName === 'FAC_F_RESEARCH') return "Research";
  if (keyOrName === 'FAC_G_EXTENSION') return "Extension Involvement";
  if (keyOrName === 'FAC_H_PRODUCTION') return "Production";
  if (keyOrName === 'FAC_I_MEMBERSHIP') return "Professional Organization Membership";
  if (keyOrName === 'FAC_J_LICENSURE') return "Passed Licensure Examinations (PRC ID)";
  if (keyOrName === 'FAC_L_IPCR') return "IPCR";
  if (keyOrName === 'FAC_X_PERFORMANCE_EVAL') return "Performance Evaluation";
  if (keyOrName === 'FAC_X_EMPLOYMENT_CONTRACT') return "Employment Contract";
  if (keyOrName === 'FAC_X_MEDICAL_CLEARANCE') return "Medical Clearance";

  // Class portfolio items
  if (keyOrName === 'CLS_SYLLABUS') return "Course Syllabus";
  if (keyOrName === 'CLS_TOS') return "Table of Specifications (TOS)";
  if (keyOrName === 'CLS_EXAM') return "Examination Questionnaire";
  if (keyOrName === 'CLS_RUBRIC') return "Grading Rubric";
  if (keyOrName === 'CLS_GRADESHEET') return "Grading Sheet";
  if (keyOrName === 'CLS_ATTENDANCE') return "Class Attendance";
  if (keyOrName === 'CLS_CLASS_RECORD') return "Class Record";
  if (keyOrName === 'CLS_INSTRUCTIONAL_MATERIAL') return "Instructional Material";

  // Any other uppercase key (e.g., FAC_SOMETHING) formatted to readable title case
  if (typeof keyOrName === 'string' && /^[A-Z0-9]+_[A-Z0-9_]+$/.test(keyOrName)) {
    return keyOrName
      .replace(/^(FAC_[A-Z]_|CLS_[A-Z]_|FAC_|CLS_)/, '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return keyOrName;
};

const formatDetails = (details) => {
  if (!details || details === '—') return '—';
  return details.replace(/\b(FAC_[A-Z]_[A-Z0-9_]+|FAC_[A-Z0-9_]+|CLS_[A-Z0-9_]+)\b/g, (match) =>
    formatDocumentName(match)
  );
};

const getActionBadgeColor = (action = '') => {
  if (action.includes('login') || action.includes('approve') || action.includes('upload')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (action.includes('delete') || action.includes('reject') || action.includes('failed')) {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (action.includes('logout') || action.includes('password')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-blue-50 text-blue-700 border-blue-200';
};

const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-US', {
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

export default function InstructorActivityLogs() {
  const [activeTab, setActiveTab] = useState('system'); // 'system' | 'document'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableVisible, setTableVisible] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all'); // 'all', 'today', '7days', '30days', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  // Reset page and action filter when switching tabs
  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      setActionFilter('all');
      setSearchQuery('');
      setCurrentPage(1);
    }
  };

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
          category: activeTab, // backend groups 'system' and 'document'
        });

        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }

        if (actionFilter !== 'all') {
          params.append('action', actionFilter);
        }

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
    [activeTab, searchQuery, actionFilter, calculateDateRange]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const hasActiveFilters =
    actionFilter !== 'all' ||
    searchQuery.trim() !== '' ||
    dateRange !== 'all' ||
    customStartDate !== '' ||
    customEndDate !== '';

  const clearFilters = () => {
    setActionFilter('all');
    setSearchQuery('');
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const currentActionOptions =
    activeTab === 'system' ? SYSTEM_ACTION_OPTIONS : DOCUMENT_ACTION_OPTIONS;

  return (
    <>
      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-purple sm:text-2xl">
          System &amp; Activity Logs
        </h1>
        <p className="mt-1 text-sm font-medium text-gray-500">
          Track and review all account operations and document management activities.
        </p>
      </div>

      {/* CATEGORY TABS */}
      <div className="flex border-b border-gray-200 mb-6 gap-2">
        <button
          type="button"
          onClick={() => handleTabChange('system')}
          className={`flex items-center gap-2 pb-3 px-4 font-semibold text-sm transition-all border-b-2 cursor-pointer ${activeTab === 'system'
            ? 'border-orange-500 text-orange-600'
            : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
        >
          {/* <ShieldCheck className="w-4 h-4" /> */}
          <span>System Activities</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('document')}
          className={`flex items-center gap-2 pb-3 px-4 font-semibold text-sm transition-all border-b-2 cursor-pointer ${activeTab === 'document'
            ? 'border-orange-500 text-orange-600'
            : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
        >
          {/* <FileText className="w-4 h-4" /> */}
          <span>Document Activities</span>
        </button>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between mb-6 gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <input
              type="text"
              placeholder={
                activeTab === 'system'
                  ? 'Search by Log ID, action, or details...'
                  : 'Search by Log ID, action, document, or file...'
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

          {/* Action Filter */}
          <div className="relative w-48 shrink-0">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              aria-label="Filter by action"
              className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-3.5 pr-9 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
            >
              {currentActionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

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
            <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none " />
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
        <button
          type="button"
          onClick={clearFilters}
          // className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline cursor-pointer ml-1"
          // type="button"
          // onClick={() => fetchLogs(currentPage)}
          // title="Refresh activity logs"
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:outline-none transition cursor-pointer"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Clear Filters
        </button>
      </div>


      {/* TABLE CARD */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-800">
              {activeTab === 'system' ? 'System Activities' : 'Document Activities'}
            </h2>
            <p className="text-[15px] text-gray-600 mt-0.5">
              {activeTab === 'system'
                ? 'Authentication, profile modifications, and security activities'
                : 'Uploads, re-uploads, deletions, and updates of portfolio documents'}
            </p>
          </div>
          {/* <span className="text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
            Total {totalLogs} {totalLogs === 1 ? 'record' : 'records'}
          </span> */}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {activeTab === 'system' ? (
                // SYSTEM LOGS COLUMNS
                <tr className="text-xs text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 pr-4">LOG ID</th>
                  <th className="pb-3 pr-4">DATE & TIME</th>
                  <th className="pb-3 pr-4">ACTION</th>
                  <th className="pb-3">DETAILS</th>
                </tr>
              ) : (
                // DOCUMENT LOGS COLUMNS
                <tr className="text-xs text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 pr-4">LOG ID</th>
                  <th className="pb-3 pr-4">DATE & TIME</th>
                  <th className="pb-3 pr-4">ACTION</th>
                  <th className="pb-3 pr-4">DOCUMENT</th>
                  <th className="pb-3">FILE NAME</th>
                </tr>
              )}
            </thead>
            <tbody className={`divide-y divide-gray-100 text-sm transition-opacity duration-300 ${tableVisible ? 'opacity-100' : 'opacity-0'}`}>
              {loading ? (
                <tr>
                  <td
                    colSpan={activeTab === 'system' ? 4 : 5}
                    className="py-12 text-center text-xs text-gray-400"
                  >
                    <RotateCw className="w-5 h-5 mx-auto mb-2 animate-spin text-orange-500" />
                    Loading activity records...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={activeTab === 'system' ? 4 : 5}
                    className="py-10 text-center text-xs text-red-500"
                  >
                    {error}
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50/60 transition-colors duration-150">
                    {/* Log ID */}
                    <td className="py-4 pr-4 align-top font-mono text-[14px] text-gray-700 whitespace-nowrap">
                      {formatLogId(item.logId, item.at)}
                    </td>

                    {/* Date & Time */}
                    <td className="py-4 pr-4 align-top text-gray-600 text-[15px] whitespace-nowrap">
                      {formatDateTime(item.at)}
                    </td>

                    {/* Action */}
                    <td className="py-4 pr-4 align-top whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[13px] font-medium border ${getActionBadgeColor(
                          item.action
                        )}`}
                      >
                        {formatActionName(item.action)}
                      </span>
                    </td>

                    {activeTab === 'system' ? (
                      /* System: Details column */
                      <td className="py-4 align-top text-gray-600 text-[15px]">
                        <span className="font-medium text-gray-700">{formatDetails(item.details)}</span>
                      </td>
                    ) : (
                      /* Document: Document & File name columns */
                      <>
                        <td className="py-4 pr-4 align-top text-gray-700 text-[15px] font-medium">
                          {formatDocumentName(item.document)}
                        </td>
                        <td className="py-4 align-top text-gray-600 text-[15px]">
                          {item.fileName && item.fileName !== '—' ? (
                            <span className="inline-flex items-center gap-1.5 text-gray-500 font-mono text-[15px] px-2 py-0.5 rounded">

                              <span className="truncate max-w-xs" title={item.fileName}>
                                {item.fileName}
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={activeTab === 'system' ? 4 : 5}
                    className="py-12 text-center text-s text-gray-400"
                  >
                    {hasActiveFilters
                      ? 'No activity records match your current filters.'
                      : 'No activity records recorded yet.'}
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

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 text-[15px] text-gray-500">
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
