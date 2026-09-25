import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  Trash2 
} from 'lucide-react';

import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function ViewInstructors() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch accepted instructors from backend API
  useEffect(() => {
    const fetchAcceptedInstructors = async () => {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:5000/api/invitations/accepted');
        if (!res.ok) {
          throw new Error('Failed to load accepted instructors.');
        }
        const data = await res.json();
        setInstructors(data);
      } catch (err) {
        console.error('Error fetching instructors:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAcceptedInstructors();
  }, []);

  // Filter instructors live based on search query (name/email only now)
  const filteredInstructors = instructors.filter((inst) => {
    const name = inst.fullName || '';
    const email = inst.email || '';
    const query = searchQuery.toLowerCase();

    return (
      name.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query)
    );
  });

  // Handle Delete
  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this instructor?')) {
      setInstructors(instructors.filter((inst) => (inst._id || inst.id) !== id));
    }
  };

  // Format MongoDB ISO dates cleanly (e.g. "Sep 24, 2026")
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? dateString
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Account Status Badge — this page only ever lists accepted invitations
// Account Status Badge — derived from the invitation's status
const renderStatusBadge = (item) => {
  const invitationStatus = (item.status || item.invitationStatus || '').toLowerCase();

  if (invitationStatus === 'accepted') {
    return (
      <span className="px-3 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-600 tracking-wider">
        ACTIVE
      </span>
    );
  }

  return (
    <span className="px-3 py-1 text-[11px] font-bold rounded-full bg-gray-100 text-gray-500 tracking-wider">
      N/A
    </span>
  );
};

  // Online Status Renderer — separate from account status
  const renderOnlineStatus = (onlineStatus = '') => {
    const isOnline = onlineStatus.toLowerCase() === 'online';
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
        {onlineStatus || 'Offline'}
      </span>
    );
  };

  // Action Buttons Renderer — all rows here are accepted, so just show View Profile
  const renderActions = (item) => {
    return <button className="text-xs font-medium text-sky-500 hover:underline">View Profile</button>;
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
              className="w-full bg-white border border-gray-200 rounded-full py-2 pl-4 pr-10 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* TABLE CARD CONTAINER */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6">

          {/* Card Header */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-base font-bold text-gray-800">Instructors</h2>
            <button className="text-xs font-semibold text-orange-500 hover:underline">
              View All
            </button>
          </div>

          {/* Table Area */}
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
                    const name = item.fullName;
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
                      No accepted instructors found.
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