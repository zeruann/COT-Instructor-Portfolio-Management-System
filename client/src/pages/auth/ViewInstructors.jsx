import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

const API_URL = 'http://localhost:5000/api/instructors';

export default function ViewInstructors() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

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

  // Live search (name / email)
  const filteredInstructors = instructors.filter((inst) => {
    const name = inst.fullName || '';
    const email = inst.email || '';
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
  });

  // Delete (local only, same as before)
  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this instructor?')) {
      setInstructors(instructors.filter((inst) => (inst._id || inst.id) !== id));
    }
  };

  // Deactivate / Reactivate
  const handleToggleStatus = async (item) => {
    const id = item._id || item.id;
    const isActive = (item.accountStatus || '').toLowerCase() === 'active';
    const newStatus = isActive ? 'Deactivated' : 'Active';
    const verb = isActive ? 'deactivate' : 'reactivate';

    if (!confirm(`Are you sure you want to ${verb} ${item.fullName}?`)) return;

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
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
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
      active: 'bg-emerald-100 text-emerald-600',
      deactivated: 'bg-red-100 text-red-500',
      inactive: 'bg-gray-100 text-gray-500',
      pending: 'bg-amber-100 text-amber-600',
    };
    const key = (item.accountStatus || '').toLowerCase();
    return (
      <span className={`px-3 py-1 text-[11px] font-bold rounded-full tracking-wider ${styles[key] || styles.inactive}`}>
        {(item.accountStatus || 'N/A').toUpperCase()}
      </span>
    );
  };

  // Online status
  const renderOnlineStatus = (onlineStatus = '') => {
    const isOnline = onlineStatus.toLowerCase() === 'online';
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
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

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 bg-[#F8F9FB] min-h-screen p-8">
        <Header />

        {/* SEARCH BAR */}
        <div className="flex justify-between items-center mb-6 gap-4">
          <div className="relative flex-1 max-w-xl">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-full py-3 pl-4 pr-10 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* TABLE CARD */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-base font-bold text-gray-800">Instructors</h2>
            <button className="text-xs font-semibold text-orange-500 hover:underline">View All</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3">INSTRUCTOR</th>
                  <th className="pb-3">CREATED AT</th>
                  <th className="pb-3">ACCOUNT STATUS</th>
                  <th className="pb-3">ONLINE</th>
                  <th className="pb-3">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-xs text-gray-400">
                      Loading instructors...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-xs text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : filteredInstructors.length > 0 ? (
                  filteredInstructors.map((item) => {
                    const id = item._id || item.id;
                    const name = item.fullName || 'Unknown';
                    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f97316&color=fff`;

                    return (
                      <tr key={id} className="hover:bg-gray-50/50 transition">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover" />
                            <div>
                              <p className="font-bold text-gray-800 leading-tight">{name}</p>
                              <p className="text-xs text-gray-400 leading-tight">{item.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-gray-500">{formatDate(item.createdAt)}</td>
                        <td className="py-4">{renderStatusBadge(item)}</td>
                        <td className="py-4">{renderOnlineStatus(item.onlineStatus)}</td>
                        <td className="py-4">{renderActions(item)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-xs text-gray-400">
                      No instructors found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}