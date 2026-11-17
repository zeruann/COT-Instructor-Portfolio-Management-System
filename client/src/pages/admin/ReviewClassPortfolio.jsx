import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  ArrowLeft,
  BookOpen,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Folder,
} from 'lucide-react';
import { fetchClasses } from '../../api/classes';
import { API_BASE } from '../../api/config';

export default function ReviewClassPortfolio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const instructorId = searchParams.get('instructorId');
  const navigate = useNavigate();

  const [instructors, setInstructors] = useState([]);
  const [loadingInstructors, setLoadingInstructors] = useState(true);
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [viewBy, setViewBy] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, departmentFilter, viewBy]);

  // Load instructor list
  useEffect(() => {
    fetch(`${API_BASE}/instructors`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.instructors || [];
        setInstructors(list);
      })
      .catch((err) => console.error('Failed to load instructors:', err))
      .finally(() => setLoadingInstructors(false));
  }, []);

  const getDisplayName = (inst) => {
    const p = inst?.profile || {};
    const parts = [p.firstName, p.middleName, p.lastName].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    return inst?.fullName || inst?.name || inst?.email || '';
  };

  const departments = useMemo(() => {
    return [...new Set(instructors.map((i) => i.department).filter(Boolean))].sort();
  }, [instructors]);

  const viewByOptions = [
    { value: 'all', label: 'All' },
    { value: 'last_updated', label: 'Last Updated' },
    { value: 'name_asc', label: 'Name (A to Z)' },
    { value: 'name_desc', label: 'Name (Z to A)' },
  ];

  // Selected instructor object
  const selectedInstructor = useMemo(() => {
    if (!instructorId || instructors.length === 0) return null;
    return instructors.find((inst) => String(inst._id || inst.id) === String(instructorId)) || null;
  }, [instructorId, instructors]);

  // Load classes for selected instructor
  useEffect(() => {
    if (!instructorId) {
      setClasses([]);
      return;
    }

    let isCurrent = true;
    setLoadingClasses(true);

    fetchClasses({ instructorId })
      .then((data) => {
        if (!isCurrent) return;
        const classList = Array.isArray(data) ? data : data.classes || [];
        setClasses(classList);
      })
      .catch((err) => {
        if (!isCurrent) return;
        console.error('Failed to load classes for instructor:', err);
      })
      .finally(() => {
        if (isCurrent) setLoadingClasses(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [instructorId]);

  // Filter instructors
  const filteredInstructors = useMemo(() => {
    const query = searchQuery.toLowerCase();

    const result = instructors.filter((inst) => {
      if (inst.accountType === 'Administrator') return false;

      const name = getDisplayName(inst);
      const email = inst.email || '';
      const matchSearch = name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
      const matchDept = departmentFilter === 'all' || inst.department === departmentFilter;

      return matchSearch && matchDept;
    });

    return result.sort((a, b) => {
      if (viewBy === 'last_updated') {
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return dateB - dateA;
      }
      if (viewBy === 'name_asc') {
        return getDisplayName(a).localeCompare(getDisplayName(b));
      }
      if (viewBy === 'name_desc') {
        return getDisplayName(b).localeCompare(getDisplayName(a));
      }
      return 0;
    });
  }, [instructors, searchQuery, departmentFilter, viewBy]);

  const selectInstructor = (inst) => {
    const id = inst._id || inst.id;
    setSearchParams({ instructorId: id });
  };

  const clearSelectedInstructor = () => {
    setSearchParams({});
  };

  const instructorGridClass =
    'grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4 sm:gap-6';

  const totalPages = Math.ceil(filteredInstructors.length / pageSize) || 1;
  const paginatedInstructors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInstructors.slice(start, start + pageSize);
  }, [filteredInstructors, currentPage, pageSize]);

  // ================= VIEW 2: INSTRUCTOR'S CLASSES =================
  if (selectedInstructor) {
    const instName = getDisplayName(selectedInstructor) || 'Instructor';
    const dept = selectedInstructor.department || 'College of Technology';

    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearSelectedInstructor}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-brand-purple text-brand-purple hover:opacity-70 transition cursor-pointer"
              aria-label="Back to Instructors"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#2e2a72] tracking-tight">
                {instName}&apos;s Class Portfolios
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">{dept} · Select a class to review documents</p>
            </div>
          </div>
        </div>

        {/* Classes Listing */}
        {loadingClasses ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 size={32} className="animate-spin text-brand-orange mb-3" />
            <p className="text-sm">Loading classes...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-xs">
            <Folder size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-base font-bold text-gray-700">No classes found</h3>
            <p className="text-xs text-gray-400 mt-1">This instructor does not have any active class portfolios created yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => {
              const classId = c._id || c.id;
              const subjectCode = c.subject?.code || 'Subject';
              const subjectName = c.subject?.name || '';
              const sectionCode = c.section?.code || c.section?.name || 'Section';
              const program = c.section?.name && c.section?.name !== sectionCode ? c.section.name : '';
              const year = c.academicPeriod?.schoolYear || '';
              const semester = c.academicPeriod?.semester ? `${c.academicPeriod.semester} Sem` : '';

              // Avoid repeating subject code if subjectName is identical to subjectCode
              const hasDistinctSubjectName = subjectName && subjectName.toLowerCase() !== subjectCode.toLowerCase();

              return (
                <div
                  key={classId}
                  onClick={() => navigate(`/admin/class-portfolio/${classId}`)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition hover:border-orange-300 hover:shadow-md cursor-pointer"
                >
                  <div>
                    {hasDistinctSubjectName ? (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-50 px-2.5 py-1 text-xs font-semibold text-brand-orange">
                            <BookOpen size={13} />
                            {subjectCode}
                          </span>
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-md px-2 py-0.5">
                            {sectionCode}
                          </span>
                        </div>

                        <h3 className="mt-3 text-base font-bold text-gray-900 group-hover:text-brand-orange transition">
                          {subjectName}
                        </h3>
                      </>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-brand-orange transition">
                            {subjectCode}
                          </h3>
                          {program && (
                            <p className="mt-0.5 text-xs text-gray-400 font-medium">{program}</p>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-md px-2 py-0.5">
                          {sectionCode}
                        </span>
                      </div>
                    )}

                    <div className="mt-4 space-y-1.5 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span>A.Y. {year} {semester ? `· ${semester}` : ''}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-orange uppercase tracking-wider group-hover:underline">
                      Review Class Documents
                    </span>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-brand-orange transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ================= VIEW 1: INSTRUCTORS LIST =================
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-xl font-bold text-brand-purple sm:text-2xl">Class Portfolio</h1>
        <p className="mt-1 text-sm font-medium text-gray-500">
          Review instructor submitted requirement documents
        </p>
      </div>

      {/* Search, Department, View by */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search instructor by name or email.."
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-10 text-sm text-gray-700 placeholder-gray-400 shadow-2xs transition focus:border-brand-orange focus:outline-none"
          />
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Department Filter */}
        <div className="relative shrink-0 sm:w-52 lg:w-60">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full cursor-pointer appearance-none truncate rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-9 text-sm text-gray-700 shadow-2xs transition focus:border-brand-orange focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* View by */}
        <div className="relative shrink-0 sm:w-44 lg:w-48">
          <select
            value={viewBy}
            onChange={(e) => setViewBy(e.target.value)}
            aria-label="View by"
            className="w-full cursor-pointer appearance-none truncate rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-9 text-sm text-gray-700 shadow-2xs transition focus:border-brand-orange focus:outline-none"
          >
            <option value="all">View by</option>
            {viewByOptions.filter((o) => o.value !== 'all').map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Cards Grid */}
      {loadingInstructors ? (
        <div className={instructorGridClass}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:gap-5 sm:p-5"
            >
              <div className="h-20 w-20 shrink-0 rounded-full bg-gray-200 sm:h-24 sm:w-24" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
                <div className="h-3 w-2/3 rounded bg-gray-200" />
                <div className="mt-3 h-8 w-full rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredInstructors.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-2xs sm:p-12">
          <Users size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-base font-semibold text-gray-700">No instructors found</p>
          <p className="mt-1 text-xs text-gray-400">
            Try adjusting your search query or department filter.
          </p>
          {(searchQuery || departmentFilter !== 'all' || viewBy !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDepartmentFilter('all');
                setViewBy('all');
              }}
              className="mt-4 inline-flex items-center rounded-lg bg-purple-50 px-4 py-2 text-xs font-semibold text-brand-purple transition hover:bg-purple-100"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className={instructorGridClass}>
          {paginatedInstructors.map((inst) => {
            const id = inst._id || inst.id;
            const name = getDisplayName(inst) || 'Instructor';
            const rank =
              inst.profile?.rank || inst.profile?.position || 'Assistant Professor IV';
            const department = inst.department || 'IT Department';
            const photoUrl = inst.profile?.photoUrl;

            return (
              <div
                key={id}
                onClick={() => selectInstructor(inst)}
                className="group flex min-w-0 cursor-pointer items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs transition-all hover:border-orange-300 hover:shadow-md sm:gap-5 sm:p-5"
              >
                {/* Left: Avatar */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-50 sm:h-24 sm:w-24">
                  {photoUrl ? (
                    <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fb923c"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-10 w-10 sm:h-12 sm:w-12"
                      aria-hidden="true"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>

                {/* Right: Info + View button */}
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="min-w-0">
                    <h3
                      title={name}
                      className="truncate text-base font-bold leading-snug text-gray-900 transition-colors group-hover:text-brand-orange"
                    >
                      {name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs font-normal text-gray-400">{rank}</p>
                    <p className="truncate text-xs font-normal text-gray-400">{department}</p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectInstructor(inst);
                    }}
                    className="mt-4 w-full rounded-lg bg-brand-orange py-2 text-center text-xs font-bold uppercase tracking-wider text-white shadow-2xs transition hover:bg-orange-600 hover:shadow active:bg-orange-700"
                  >
                    VIEW CLASSES
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {!loadingInstructors && filteredInstructors.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100 text-[13px] text-gray-500">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredInstructors.length)} of{' '}
            {filteredInstructors.length} instructors
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 inline" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    p === currentPage
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 inline" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
