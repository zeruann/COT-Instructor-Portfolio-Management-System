import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  Trash2 
} from 'lucide-react';

import Sidebar from "../../components/Sidebar";
import cotLogo from '../../assets/COT-Orange.png';

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

  // Filter instructors live based on search query
  const filteredInstructors = instructors.filter((inst) => {
    const name = inst.fullName || inst.name || '';
    const email = inst.email || '';
    const dept = inst.department || '';
    const query = searchQuery.toLowerCase();

    return (
      name.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query) ||
      dept.toLowerCase().includes(query)
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

  // Status Badge Renderer
  const renderStatusBadge = (status = '') => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case 'PENDING':
        return (
          <span className="px-3 py-1 text-[11px] font-bold rounded-full bg-amber-100 text-amber-600 tracking-wider">
            PENDING
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="px-3 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-600 tracking-wider">
            ACCEPTED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-3 py-1 text-[11px] font-bold rounded-full bg-rose-100 text-rose-600 tracking-wider">
            REJECTED
          </span>
        );
      default:
        return null;
    }
  };

  // Action Buttons Renderer
  const renderActions = (item) => {
    const status = (item.status || '').toUpperCase();
    const id = item._id || item.id;

    if (status === 'PENDING') {
      return (
        <div className="flex items-center gap-3 text-gray-400">
          <button className="hover:text-gray-700 transition" title="Resend/Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(id)} className="hover:text-red-500 transition" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      );
    }
    if (status === 'ACCEPTED') {
      return <button className="text-xs font-medium text-sky-500 hover:underline">View Profile</button>;
    }
    if (status === 'REJECTED') {
      return <button className="text-xs font-medium text-orange-500 hover:underline">Resend</button>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex font-sans text-gray-800">

      {/* REUSABLE SIDEBAR COMPONENT */}
      <Sidebar />

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* TOP HEADER BAR */}
        <header className="px-8 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={cotLogo} alt="COT Logo" className="w-9 h-9 object-contain" />
            <h1 className="text-sm font-bold text-orange-500 tracking-wide">
              COT Instructor Portfolio Management System
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-gray-800">Admin User</p>
              <p className="text-[10px] text-gray-400">Administrator</p>
            </div>
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
              alt="Admin User"
              className="w-9 h-9 rounded-full object-cover border border-gray-200"
            />
          </div>
        </header>

        {/* MAIN DASHBOARD CONTENT */}
        <main className="p-8">
          
          {/* SEARCH & FILTER BAR */}
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-72">
              <input
                type="text"
                placeholder="Search by name, email, department..."
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
                    <th className="pb-3">DEPARTMENT</th>
                    <th className="pb-3">DATE SENT</th>
                    <th className="pb-3">STATUS</th>
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
                      const name = item.fullName || item.name;
                      const avatar = item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f97316&color=fff`;

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
                          <td className="py-4 text-gray-600 font-medium">{item.department}</td>
                          <td className="py-4 text-gray-500">{formatDate(item.dateSent)}</td>
                          <td className="py-4">{renderStatusBadge(item.status)}</td>
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
        </main>
      </div>

    </div>
  );
}