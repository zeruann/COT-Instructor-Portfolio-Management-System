// client/src/pages/admin/ReviewFacultyPortfolio.jsx
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, ChevronDown, ArrowRight, ArrowLeft, ShieldCheck, Briefcase } from 'lucide-react';
import { fetchFacultySummary } from '../../api/documents';

const requirementCards = [
  {
    title: 'Educational Attainment',
    description: "TOR, Diploma or Certificate of Units Earned for Bachelor's, Master's and PhD.",
    path: 'educational-attainment',
  },
  { title: 'Service Records', description: 'Upload and review service records.', path: 'service-records' },
  {
    title: 'Seminars and Workshops',
    description: 'Seminars and workshops with certificates.',
    path: 'seminars-and-workshops',
  },
  { title: 'Achievements', description: 'Grants, Awards, Certification of Commendation.', path: 'achievements' },
  {
    title: 'Research',
    description: 'Research proposals and published research.',
    path: 'research',
  },
  {
    title: 'Extension Involvement',
    description: "Certificates of extension involvement, training designs.",
    path: 'extension-involvement',
  },
  {
    title: 'Production',
    description: "Certificates of Copyrighted IM's, Patent or utility model.",
    path: 'production',
  },
  {
    title: 'Other Requirements',
    description: 'Professional organizations, licensure examinations, and IPCR.',
    path: 'other-requirements',
  },
];

export default function ReviewFacultyPortfolio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const instructorId = searchParams.get('instructorId');

  const [instructors, setInstructors] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Load list of instructors
  useEffect(() => {
    fetch('http://localhost:5000/api/instructors')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.instructors || [];
        setInstructors(list);
      })
      .catch((err) => console.error('Failed to load instructors:', err))
      .finally(() => setLoading(false));
  }, []);

  // Derive selected instructor from query param
  const selectedInstructor = useMemo(() => {
    if (!instructorId || instructors.length === 0) return null;
    return instructors.find((inst) => (inst._id || inst.id) === instructorId) || null;
  }, [instructorId, instructors]);

  // Load summary for selected instructor
  useEffect(() => {
    let isCurrent = true;
    if (instructorId) {
      fetchFacultySummary(instructorId)
        .then((sum) => {
          if (isCurrent) setSummaries(sum || {});
        })
        .catch((err) => console.error('Failed to load portfolio summaries:', err));
    }
    return () => {
      isCurrent = false;
    };
  }, [instructorId]);

  const selectInstructor = (inst) => {
    setSearchParams({ instructorId: inst._id || inst.id });
  };

  const clearSelection = () => {
    setSearchParams({});
  };

  const departments = [
    ...new Set(instructors.map((i) => i.department).filter(Boolean)),
  ].sort();

  const filteredInstructors = instructors.filter((inst) => {
    const name = inst.fullName || '';
    const email = inst.email || '';
    const query = searchQuery.toLowerCase();
    const matchSearch = name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
    const matchDept = departmentFilter === 'all' || inst.department === departmentFilter;
    return matchSearch && matchDept;
  });

  // If an instructor is selected, show their faculty portfolio cards
  if (selectedInstructor) {
    return (
      <div className="space-y-6">
        {/* Header bar with switch instructor */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearSelection}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
              title="Back to all instructors"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-800">
                  {selectedInstructor.fullName}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-brand-purple font-semibold">
                  {selectedInstructor.department || 'Faculty'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{selectedInstructor.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={clearSelection}
            className="text-xs font-semibold text-brand-purple hover:underline"
          >
            Change Instructor
          </button>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {requirementCards.map((card) => {
            const sum = summaries[card.path] || {};
            const approved = sum.approved || 0;
            const pending = sum.pendingReview || 0;
            const rejected = sum.rejected || 0;

            return (
              <Link
                key={card.path}
                to={`/admin/portfolio/faculty-portfolio/${card.path}?instructorId=${selectedInstructor._id || selectedInstructor.id}`}
                className="flex flex-col bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm text-gray-800">{card.title}</h3>
                  <Briefcase className="w-4 h-4 text-brand-purple shrink-0" />
                </div>

                <p className="text-xs text-gray-500 flex-1 leading-relaxed">{card.description}</p>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {pending > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 font-medium text-[11px]">
                        {pending} to review
                      </span>
                    )}
                    {approved > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 font-medium text-[11px]">
                        {approved} approved
                      </span>
                    )}
                    {rejected > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-medium text-[11px]">
                        {rejected} rejected
                      </span>
                    )}
                    {pending === 0 && approved === 0 && rejected === 0 && (
                      <span className="text-gray-400 text-[11px]">No documents</span>
                    )}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // Instructor Selection Screen
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Faculty Portfolio Review</h1>
        <p className="text-xs text-gray-500 mt-1">
          Select an instructor to review their faculty portfolio submissions and evidence.
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by instructor name or email..."
              className="w-full text-xs pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-purple"
            />
          </div>

          <div className="relative w-48">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full text-xs appearance-none px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-purple cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Instructors Table / Cards */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/60 text-gray-500 uppercase tracking-wider border-b border-gray-100 font-semibold">
                <th className="py-3.5 px-6">Instructor</th>
                <th className="py-3.5 px-6">Department</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    Loading instructors...
                  </td>
                </tr>
              ) : filteredInstructors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    No instructors found.
                  </td>
                </tr>
              ) : (
                filteredInstructors.map((inst) => {
                  const id = inst._id || inst.id;
                  return (
                    <tr
                      key={id}
                      className="hover:bg-gray-50/60 transition cursor-pointer"
                      onClick={() => selectInstructor(inst)}
                    >
                      <td className="py-3.5 px-6 font-semibold text-gray-800">
                        {inst.fullName}
                      </td>
                      <td className="py-3.5 px-6 text-gray-500">
                        {inst.department || '—'}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
                          {inst.accountStatus || 'Active'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectInstructor(inst);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-purple hover:bg-opacity-90 rounded-xl shadow-2xs transition"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Review Portfolio
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
