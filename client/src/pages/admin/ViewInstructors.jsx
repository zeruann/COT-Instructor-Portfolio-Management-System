import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Plus, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppModal, { useAppModal } from '../../components/common/AppModal';
import { API_BASE } from '../../api/config';

const PAGE_SIZE = 10;

const API_URL = `${API_BASE}/instructors`;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'deactivated', label: 'Deactivated' },
];

// Default table order: Active first, then Pending, then Deactivated
const STATUS_ORDER = { active: 0, pending: 1, deactivated: 2, inactive: 3 };

// Prioritise profile first/last name over the root fullName which may be stale
const getDisplayName = (inst) => {
  const p = inst?.profile || {};
  const parts = [p.firstName, p.middleName, p.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return inst?.fullName || '';
};

export default function ViewInstructors() {
  const navigate = useNavigate();
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [tableVisible, setTableVisible] = useState(true);
  const { modal, close: closeModal, notify, confirm: showConfirm } = useAppModal();

  // Fetch instructors from backend API
  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(API_URL);
        if (!res.ok) {
          throw new Error(`Failed to load instructors (HTTP ${res.status}).`);
        }

        const data = await res.json();
        console.log('Instructors response:', data); // check this in the browser console

        // Accept either [ ... ] or { instructors: [ ... ] }
        const list = Array.isArray(data) ? data : data.instructors || data.data || [];
        setInstructors(list);
      } catch (err) {
        console.error('Error fetching instructors:', err);
        setError(
          err.message === 'Failed to fetch'
            ? 'Cannot reach the server. Is the backend running on port 5000?'
            : err.message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInstructors();
  }, []);

  // Department dropdown options, built from the data
  const departmentOptions = [
    ...new Set(instructors.map((inst) => inst.department).filter(Boolean)),
  ].sort();

  // Search (name / email) + status + department filters, then sort by status group (newest first inside each group)
  const filteredInstructors = instructors
    .filter((inst) => {
      // Show instructors only; exclude Administrators
      if (inst.accountType === 'Administrator') return false;

      const name = getDisplayName(inst);
      const email = inst.email || '';
      const query = searchQuery.toLowerCase();
      const matchesSearch = name.toLowerCase().includes(query) || email.toLowerCase().includes(query);

      const status = (inst.accountStatus || '').toLowerCase();
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      const matchesDepartment =
        departmentFilter === 'all' || inst.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    })
    .sort((a, b) => {
      const rankA = STATUS_ORDER[(a.accountStatus || '').toLowerCase()] ?? 99;
      const rankB = STATUS_ORDER[(b.accountStatus || '').toLowerCase()] ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      return (new Date(b.createdAt) || 0) - (new Date(a.createdAt) || 0);
    });

  const hasActiveFilters =
    statusFilter !== 'all' || departmentFilter !== 'all' || searchQuery !== '';

  const clearFilters = () => {
    setStatusFilter('all');
    setDepartmentFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Delete (local only, same as before)
  const handleDelete = (id) => {
    showConfirm({
      title: 'Delete Instructor?',
      message: 'Are you sure you want to delete this instructor? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      tone: 'warning',
      onConfirm: () => {
        setInstructors(instructors.filter((inst) => (inst._id || inst.id) !== id));
        notify('success', 'Instructor Deleted', 'The instructor record has been removed.');
      },
    });
  };

  // Deactivate / Reactivate
  const handleToggleStatus = (item) => {
    const id = item._id || item.id;
    const isActive = (item.accountStatus || '').toLowerCase() === 'active';
    const newStatus = isActive ? 'Deactivated' : 'Active';
    const verb = isActive ? 'deactivate' : 'reactivate';
    const name = getDisplayName(item);

    showConfirm({
      title: `${isActive ? 'Deactivate' : 'Reactivate'} Instructor?`,
      message: `Are you sure you want to ${verb} ${name}?`,
      confirmLabel: isActive ? 'Deactivate' : 'Reactivate',
      cancelLabel: 'Cancel',
      tone: isActive ? 'warning' : 'info',
      onConfirm: async () => {
        try {
          setUpdatingId(id);
          const res = await fetch(`${API_URL}/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountStatus: newStatus }),
          });
          if (!res.ok) throw new Error(`Failed to ${verb} instructor.`);
          const updated = await res.json();

          setInstructors((prev) =>
            prev.map((inst) =>
              (inst._id || inst.id) === id
                ? { ...inst, accountStatus: updated.accountStatus ?? newStatus }
                : inst
            )
          );
          notify('success', 'Status Updated', `Instructor account has been ${verb}d successfully.`);
        } catch (err) {
          notify('error', 'Update Failed', err.message);
        } finally {
          setUpdatingId(null);
        }
      },
    });
  };

  // Format dates (e.g. "Sep 24, 2026")
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? dateString
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Account status badge
  const renderStatusBadge = (item) => {
    const styles = {
      active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      deactivated: 'bg-red-50 text-red-700 border-red-200',
      inactive: 'bg-gray-50 text-gray-600 border-gray-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    const key = (item.accountStatus || '').toLowerCase();
    const label = item.accountStatus
      ? item.accountStatus.charAt(0).toUpperCase() + item.accountStatus.slice(1).toLowerCase()
      : 'N/A';
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${styles[key] || styles.inactive}`}>
        {label}
      </span>
    );
  };

  // Online status
  const renderOnlineStatus = (onlineStatus = '') => {
    const isOnline = onlineStatus.toLowerCase() === 'online';
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500">
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
        {onlineStatus || 'Offline'}
      </span>
    );
  };

  // Actions: Deactivate / Reactivate
  const renderActions = (item) => {
    const id = item._id || item.id;
    const status = (item.accountStatus || '').toLowerCase();
    const isActive = status === 'active';
    const isDeactivated = status === 'deactivated';
    const isPending = status === 'pending';
    const isUpdating = updatingId === id;

    return (
      <div className="flex items-center gap-2">

        {isActive && (
          <button
            onClick={() => handleToggleStatus(item)}
            disabled={isUpdating}
            className="min-w-[96px] px-3 py-1.5 text-xs font-semibold rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Saving...' : 'Deactivate'}
          </button>
        )}

        {isDeactivated && (
          <button
            onClick={() => handleToggleStatus(item)}
            disabled={isUpdating}
            className="min-w-[96px] px-3 py-1.5 text-xs font-semibold rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Saving...' : 'Reactivate'}
          </button>
        )}

        {isPending && (
          <span className="px-3 py-1.5 text-xs font-medium text-gray-400">Awaiting setup</span>
        )}

        {/* "Inactive" (kept for future use) and any unknown status: no action yet */}
        {!isActive && !isDeactivated && !isPending && (
          <span className="px-3 py-1.5 text-xs text-gray-300">&mdash;</span>
        )}
      </div>
    );
  };

  const totalPages = Math.ceil(filteredInstructors.length / PAGE_SIZE);
  const pagedInstructors = filteredInstructors.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset to page 1 whenever filters change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, departmentFilter]);

  // Fade the table out then back in whenever the visible rows change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setTableVisible(false);
    const t = setTimeout(() => setTableVisible(true), 200);
    return () => clearTimeout(t);
  }, [searchQuery, statusFilter, departmentFilter, currentPage]);

  return (
    <>
      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-purple sm:text-2xl">Instructors</h1>
        <p className="mt-1 text-sm font-medium text-gray-500">
          Manage and monitor all registered faculty members.
        </p>
      </div>

      {/* SEARCH + FILTERS */}
      <div className="flex items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-[2] min-w-0">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg py-3 pl-4 pr-10 text-[14px] text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition"
          />
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Department filter */}
        <div className="relative flex-1 min-w-0">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by department"
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-3 pl-4 pr-9 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
          >
            <option value="all">All departments</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative flex-1 min-w-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by account status"
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-3 pl-4 pr-9 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Add button */}
        <button
          onClick={() => navigate('/admin/invite-instructor')}
          className="shrink-0 inline-flex items-center gap-2 px-10 py-3 text-[14px] font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 transition"
        >
          <Plus className="w-4 h-4" />
          Invite Instructor
        </button>
      </div>


      {/* TABLE CARD */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-base font-bold text-gray-800">Instructors</h2>
          <span className="text-xs font-medium text-gray-400">
            {filteredInstructors.length} {filteredInstructors.length === 1 ? 'result' : 'results'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs text-gray-600 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-3">INSTRUCTOR</th>
                <th className="pb-3">DEPARTMENT</th>
                <th className="pb-3">CREATED AT</th>
                <th className="pb-3">ACCOUNT STATUS</th>
                <th className="pb-3">ONLINE</th>
                <th className="pb-3">ACTION</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-100 text-sm transition-opacity duration-300 ${tableVisible ? 'opacity-100' : 'opacity-0'}`}>
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-gray-400">
                    Loading instructors...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-red-500">
                    {error}
                  </td>
                </tr>
              ) : pagedInstructors.length > 0 ? (
                pagedInstructors.map((item) => {
                  const id = item._id || item.id;
                  const name = getDisplayName(item) || 'Unknown';
                  const photo = item.profile?.photoUrl || item.googlePhotoUrl;

                  return (
                    <tr
                      key={id}
                      onClick={() => navigate(`/admin/instructors/${id}`)}
                      className="hover:bg-gray-50/50 transition-colors duration-150 cursor-pointer"
                    >
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0 overflow-hidden border border-orange-100">
                            {photo ? (
                              <img
                                src={photo}
                                alt={name}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.querySelector('svg');
                                  if (fallback) fallback.style.display = 'block';
                                }}
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                            <svg
                              style={{ display: photo ? 'none' : 'block' }}
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
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
                          </div>
                          <div>
                            <p className="text-[16px] text-gray-800 leading-tight">{name}</p>
                            <p className="text-[14px] text-gray-400 leading-tight">{item.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-gray-500">{item.department || '—'}</td>
                      <td className="py-4 text-gray-500">{formatDate(item.createdAt)}</td>
                      <td className="py-4">{renderStatusBadge(item)}</td>
                      <td className="py-4">{renderOnlineStatus(item.onlineStatus)}</td>
                      <td className="py-4" onClick={(e) => e.stopPropagation()}>
                        {renderActions(item)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-gray-400">
                    {hasActiveFilters ? 'No instructors match your filters.' : 'No instructors found.'}
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="ml-2 font-semibold text-orange-500 hover:underline "
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 text-[13px] text-gray-500">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredInstructors.length)} of {filteredInstructors.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-4 h-4 inline" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium border transition ${p === currentPage
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight className="w-4 h-4 inline" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AppModal modal={modal} onClose={closeModal} />
    </>
  );
}
