import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  BookOpen,
  FileCheck,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FolderOpen,
  FileSpreadsheet,
  AlertCircle,
  CalendarDays,
  ArrowUpRight,
  X,
  Archive,
  Briefcase,
} from 'lucide-react';
import { fetchClasses } from '../../api/classes';
import AdminViewClassPortfolio from './AdminViewClassPortfolio';
import ClassRequirementDetail from '../instructors/ClassRequirementDetail';
import { API_BASE } from '../../api/config';

const API_PERIODS_URL = `${API_BASE}/academic-periods`;
const API_INSTRUCTORS_URL = `${API_BASE}/instructors`;

function MetricCard({ icon: Icon, label, value, note, tone }) {
  const tones = {
    purple: 'bg-purple-50 text-brand-purple border-purple-100',
    orange: 'bg-orange-50 text-brand-orange border-orange-100',
    green: 'bg-[#eaf5e7] text-[#5cab5f] border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
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

function getInitials(name) {
  return (
    (name || '')
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'IN'
  );
}

export default function AdminArchiveRecordDetail() {
  const { periodId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [period, setPeriod] = useState(null);
  const [summary, setSummary] = useState({
    totalClasses: 0,
    totalInstructors: 0,
    totalDocuments: 0,
    approvedDocs: 0,
    pendingDocs: 0,
    rejectedDocs: 0,
    complianceRate: 0,
  });
  const [periodInstructors, setPeriodInstructors] = useState([]);
  const [allInstructors, setAllInstructors] = useState([]);
  const [periodClasses, setPeriodClasses] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [expandedInstructorId, setExpandedInstructorId] = useState(null);

  const [selectedClassMeta, setSelectedClassMeta] = useState(null);
  const [activeReqPath, setActiveReqPath] = useState(null);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const modalBodyRef = useRef(null);

  const handleOpenClassModal = (cls, instructor) => {
    setIsClosingModal(false);
    setSelectedClassMeta({ cls, instructor });
    setActiveReqPath(null);
  };

  const handleCloseClassModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setSelectedClassMeta(null);
      setActiveReqPath(null);
      setIsClosingModal(false);
    }, 180);
  };

  useEffect(() => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeReqPath]);

  const loadDetails = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const [detailsRes, classesData, instructorsRes] = await Promise.all([
          fetch(`${API_PERIODS_URL}/${periodId}/details`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(async (r) => {
            const json = await r.json();
            if (!r.ok) throw new Error(json.message || 'Failed to load period details.');
            return json;
          }),
          fetchClasses({ academicPeriodId: periodId, includeArchived: true }).catch(() => []),
          fetch(API_INSTRUCTORS_URL, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
        ]);

        setPeriod(detailsRes.period || null);
        setSummary(
          detailsRes.summary || {
            totalClasses: 0,
            totalInstructors: 0,
            totalDocuments: 0,
            approvedDocs: 0,
            pendingDocs: 0,
            rejectedDocs: 0,
            complianceRate: 0,
          }
        );
        setPeriodInstructors(detailsRes.instructors || []);

        const iList = Array.isArray(instructorsRes)
          ? instructorsRes
          : instructorsRes?.instructors || [];
        setAllInstructors(iList);

        const cList = Array.isArray(classesData) ? classesData : classesData?.classes || [];
        const matchedClasses = cList.filter((c) => {
          const cPeriodId = c.academicPeriodId?._id || c.academicPeriodId || c.academicPeriod?._id;
          if (cPeriodId && String(cPeriodId) === String(periodId)) return true;
          if (
            detailsRes.period &&
            c.academicPeriod?.schoolYear === detailsRes.period.schoolYear &&
            c.academicPeriod?.semester === detailsRes.period.semester
          ) {
            return true;
          }
          return false;
        });
        setPeriodClasses(matchedClasses);
      } catch (err) {
        console.error('Error loading archived period details:', err);
        setError(err.message || 'Failed to load archived period details.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [periodId]
  );

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // Merge details.instructors with full instructor profiles & their classes in this period
  const mergedInstructors = useMemo(() => {
    const profileMap = new Map();
    allInstructors.forEach((inst) => {
      profileMap.set(String(inst._id || inst.id), inst);
    });

    const byInstructor = new Map();

    // Seed from periodInstructors returned by /details
    periodInstructors.forEach((inst) => {
      const id = String(inst._id || inst.id);
      const full = profileMap.get(id) || {};
      byInstructor.set(id, {
        id,
        fullName: full.fullName || inst.fullName || 'Instructor',
        email: full.email || inst.email || '',
        department: full.department || inst.department || 'College of Technologies',
        photoUrl: full.profile?.photoUrl || full.googlePhotoUrl || full.photoUrl || '',
        classes: [],
        documentsSubmitted: inst.documentsSubmitted || 0,
        approvedCount: inst.approvedCount || 0,
      });
    });

    // Attach classes from periodClasses
    periodClasses.forEach((cls) => {
      const ownerId = String(cls.ownerId?._id || cls.ownerId || '');
      if (!ownerId) return;
      if (!byInstructor.has(ownerId)) {
        const full = profileMap.get(ownerId) || cls.ownerId || {};
        byInstructor.set(ownerId, {
          id: ownerId,
          fullName: full.fullName || 'Instructor',
          email: full.email || '',
          department: full.department || 'College of Technologies',
          photoUrl: full.profile?.photoUrl || full.googlePhotoUrl || full.photoUrl || '',
          classes: [],
          documentsSubmitted: 0,
          approvedCount: 0,
        });
      }
      byInstructor.get(ownerId).classes.push(cls);
    });

    return Array.from(byInstructor.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName)
    );
  }, [periodInstructors, allInstructors, periodClasses]);

  const availableDepartments = useMemo(() => {
    const set = new Set();
    mergedInstructors.forEach((inst) => {
      if (inst.department) set.add(inst.department);
    });
    return Array.from(set).sort();
  }, [mergedInstructors]);

  const filteredInstructors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return mergedInstructors.filter((inst) => {
      const matchesDept =
        departmentFilter === 'all' || inst.department === departmentFilter;
      if (!matchesDept) return false;
      if (!q) return true;

      const matchesName = inst.fullName.toLowerCase().includes(q);
      const matchesEmail = inst.email.toLowerCase().includes(q);
      const matchesDeptText = inst.department.toLowerCase().includes(q);
      const matchesClass = inst.classes.some(
        (c) =>
          (c.subject?.code || '').toLowerCase().includes(q) ||
          (c.subject?.name || '').toLowerCase().includes(q) ||
          (c.section?.code || '').toLowerCase().includes(q)
      );

      return matchesName || matchesEmail || matchesDeptText || matchesClass;
    });
  }, [mergedInstructors, searchQuery, departmentFilter]);

  return (
    <div className="space-y-6">
      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/archive-records')}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition cursor-pointer"
            aria-label="Back to Archive Records"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                {period
                  ? `AY ${period.schoolYear} · ${formatSemName(period.semester)}`
                  : 'Archived Period Records'}
              </h1>
              <span className="rounded-lg bg-purple-50 border border-purple-200/80 px-2.5 py-0.5 text-xs font-bold text-brand-purple">
                Archived · Read-Only
              </span>
            </div>
            {period && (
              <p className="text-xs sm:text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                <CalendarDays size={14} className="text-gray-400" />
                <span>
                  {formatDate(period.startDate)} – {formatDate(period.endDate)}
                  {period.archivedAt && ` • Archived on ${formatDate(period.archivedAt)}`}
                </span>
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadDetails(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-brand-orange' : 'text-gray-500'} />
          <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
        </button>
      </div>

      {/* ── 4 SUMMARY METRIC CARDS ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Total Instructors"
          value={summary.totalInstructors || mergedInstructors.length}
          note="Faculty handling classes"
          tone="purple"
        />
        <MetricCard
          icon={BookOpen}
          label="Total Classes"
          value={summary.totalClasses || periodClasses.length}
          note="Preserved class portfolios"
          tone="orange"
        />
        <MetricCard
          icon={FileCheck}
          label="Total Documents"
          value={summary.totalDocuments || 0}
          note={`${summary.approvedDocs || 0} approved · ${summary.pendingDocs || 0} pending`}
          tone="amber"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Compliance Rate"
          value={`${summary.complianceRate || 0}%`}
          note="Overall class compliance"
          tone="green"
        />
      </section>

      {/* ── FILTER BOXES ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="relative md:col-span-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by instructor name, email, or subject..."
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

        <div className="relative md:col-span-4">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by department"
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-3 pl-4 pr-9 text-[14px] text-gray-700 focus:outline-none focus:border-orange-500 transition cursor-pointer"
          >
            <option value="all">All departments</option>
            {availableDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* ── INSTRUCTOR CARDS LIST ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
          <RefreshCw size={24} className="animate-spin text-brand-orange" />
          <p className="text-xs sm:text-sm">Loading instructors and class portfolios…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 flex flex-col items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      ) : filteredInstructors.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto">
            <Users size={22} />
          </div>
          <h3 className="text-base font-bold text-gray-800">No instructors found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            No instructors or class portfolios match your current filters for this academic period.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredInstructors.map((inst) => {
            const isExpanded = expandedInstructorId === inst.id;

            // Compute class compliance stats from classes or /details counts
            let approvedFiles = inst.approvedCount;
            let pendingFiles = 0;
            let rejectedFiles = 0;
            let totalFiles = inst.documentsSubmitted;

            if (inst.classes.length > 0) {
              const clsApproved = inst.classes.reduce(
                (acc, c) => acc + (c.approvedCount ?? c.counts?.approved ?? 0),
                0
              );
              const clsPending = inst.classes.reduce(
                (acc, c) => acc + (c.pendingCount ?? c.counts?.pendingReview ?? 0),
                0
              );
              const clsRejected = inst.classes.reduce(
                (acc, c) => acc + (c.rejectedCount ?? c.counts?.rejected ?? 0),
                0
              );
              const clsTotal = clsApproved + clsPending + clsRejected;
              if (clsTotal > 0 || totalFiles === 0) {
                approvedFiles = clsApproved;
                pendingFiles = clsPending;
                rejectedFiles = clsRejected;
                totalFiles = clsTotal;
              }
            } else {
              pendingFiles = Math.max(0, totalFiles - approvedFiles);
            }

            const compliancePct =
              totalFiles > 0 ? Math.round((approvedFiles / totalFiles) * 100) : 0;
            const approvedBarPct = totalFiles > 0 ? (approvedFiles / totalFiles) * 100 : 0;
            const pendingBarPct = totalFiles > 0 ? (pendingFiles / totalFiles) * 100 : 0;
            const rejectedBarPct = totalFiles > 0 ? (rejectedFiles / totalFiles) * 100 : 0;

            return (
              <div
                key={inst.id}
                onClick={() => setExpandedInstructorId(isExpanded ? null : inst.id)}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs transition hover:shadow-xs hover:border-purple-200 space-y-4 cursor-pointer"
              >
                {/* Top Row: Avatar, Info, Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {inst.photoUrl ? (
                      <img
                        src={inst.photoUrl}
                        alt={inst.fullName}
                        className="h-11 w-11 rounded-full object-cover border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-brand-orange text-white font-bold text-sm flex items-center justify-center shrink-0">
                        {getInitials(inst.fullName)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-gray-900 truncate">
                          {inst.fullName}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-brand-purple border border-purple-200/80">
                          {inst.department}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {inst.email ? `${inst.email} • ` : ''}
                        {inst.department} • {inst.classes.length}{' '}
                        {inst.classes.length === 1 ? 'class' : 'classes'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons: Class Portfolio, Faculty Portfolio & View Reports */}
                  <div
                    className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedInstructorId(isExpanded ? null : inst.id)
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-brand-purple font-semibold text-xs transition cursor-pointer"
                    >
                      <FolderOpen size={14} />
                      <span>Class Portfolio</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-300 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/admin/review/faculty-portfolio?instructorId=${inst.id}`)
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-brand-purple/40 text-gray-700 font-semibold text-xs transition cursor-pointer"
                    >
                      <Briefcase size={14} className="text-brand-purple" />
                      <span>Faculty Portfolio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/admin/reports?instructorId=${inst.id}&periodId=${periodId}&from=archive`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-semibold text-xs shadow-2xs transition cursor-pointer"
                    >
                      <FileSpreadsheet size={14} />
                      <span>View Reports</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 flex">
                  {approvedBarPct > 0 && (
                    <div
                      style={{ width: `${approvedBarPct}%` }}
                      className="h-full bg-[#5cab5f] transition-all"
                      title={`Approved: ${approvedFiles}`}
                    />
                  )}
                  {pendingBarPct > 0 && (
                    <div
                      style={{ width: `${pendingBarPct}%` }}
                      className="h-full bg-[#f5a30f] transition-all"
                      title={`In Review: ${pendingFiles}`}
                    />
                  )}
                  {rejectedBarPct > 0 && (
                    <div
                      style={{ width: `${rejectedBarPct}%` }}
                      className="h-full bg-[#ef4444] transition-all"
                      title={`Needs Revision: ${rejectedFiles}`}
                    />
                  )}
                </div>

                {/* Progress Breakdown */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 gap-2">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#5cab5f]" />
                      <strong>{approvedFiles}</strong> Approved Files
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#f5a30f]" />
                      <strong>{pendingFiles}</strong> In Review
                    </span>
                    {rejectedFiles > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                        <strong>{rejectedFiles}</strong> Needs Revision
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-gray-700">
                    {compliancePct}% Class Compliance
                  </span>
                </div>

                {/* Expanded Class Portfolios for this Instructor (smooth accordion) */}
                <div
                  className={`grid transition-all duration-300 ease-in-out cursor-default ${
                    isExpanded
                      ? 'grid-rows-[1fr] opacity-100 mt-4'
                      : 'grid-rows-[0fr] opacity-0 !mt-0'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="overflow-hidden">
                    <div className="pt-3 border-t border-gray-100 space-y-2.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Archived Classes ({inst.classes.length})
                      </p>
                      {inst.classes.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">
                          No class portfolios found for this instructor in this period.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {inst.classes.map((cls) => {
                            const cid = cls._id || cls.id;
                            const isClassArchived = Boolean(cls.archivedAt || period?.isArchived);
                            return (
                              <div
                                key={cid}
                                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 transition hover:border-purple-200 hover:bg-white"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-bold text-gray-900 truncate">
                                      {cls.subject?.code || 'Subject'}{' '}
                                      {cls.section?.code ? `• ${cls.section.code}` : ''}
                                    </p>
                                    {isClassArchived && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-brand-purple border border-purple-200">
                                        <Archive size={10} />
                                        Archived
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 truncate mt-0.5">
                                    {cls.subject?.name || 'Course Portfolio'}
                                    {cls.section?.name ? ` • ${cls.section.name}` : ''} •{' '}
                                    {cls.completionPercent ?? 0}% complete
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenClassModal(cls, inst)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-brand-orange hover:text-brand-orange text-xs font-semibold text-gray-700 transition shrink-0 cursor-pointer"
                                >
                                  <span>View</span>
                                  <ArrowUpRight size={13} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ARCHIVED CLASS PORTFOLIO MODAL (Single Source of Truth) ── */}
      {selectedClassMeta && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-3 sm:p-5 transition-opacity duration-200 ${
            isClosingModal ? 'opacity-0' : 'animate-modal-backdrop'
          }`}
          onClick={handleCloseClassModal}
        >
          <div
            className={`relative flex flex-col w-full max-w-7xl h-[90vh] rounded-2xl bg-[#f8f9fc] shadow-2xl border border-gray-200 overflow-hidden transition-all duration-200 ${
              isClosingModal ? 'opacity-0 scale-[0.985] translate-y-2' : 'animate-modal-panel'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            {(() => {
              const cls = selectedClassMeta.cls;
              const isArchived = Boolean(cls?.archivedAt || period?.isArchived);
              const subjectCode = cls?.subject?.code || 'Subject';
              const subjectName = cls?.subject?.name || '';
              const sectionCode = cls?.section?.code || cls?.section?.name || 'Section';
              const program = cls?.section?.name || cls?.section?.code || '';
              const ay = cls?.academicPeriod?.schoolYear || period?.schoolYear || '';
              const sem = cls?.academicPeriod?.semester || period?.semester || '';
              return (
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4 bg-white">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-bold text-[#2e2a72] truncate">
                        {subjectCode} · {sectionCode}
                      </h2>
                      {isArchived ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-brand-purple border border-purple-200">
                          <Archive size={12} />
                          Archived
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          Closed
                        </span>
                      )}
                    </div>
                    {subjectName && (
                      <p className="text-xs sm:text-sm font-medium text-gray-700 mt-0.5 truncate">
                        {subjectName}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedClassMeta.instructor?.fullName}
                      {program ? ` • ${program}` : ''}
                      {ay ? ` • A.Y. ${ay}` : ''}
                      {sem ? `, ${sem} Semester` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseClassModal}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer shrink-0"
                    aria-label="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>
              );
            })()}

            {/* Modal Body — renders the exact shared class & requirement components */}
            <div ref={modalBodyRef} className="flex-1 overflow-y-auto p-6">
              <div className={activeReqPath ? 'hidden' : 'animate-modal-page-back'}>
                <AdminViewClassPortfolio
                  classId={selectedClassMeta.cls._id || selectedClassMeta.cls.id}
                  embedded
                  onSelectRequirement={(card) => setActiveReqPath(card.path)}
                />
              </div>
              {activeReqPath && (
                <div key={activeReqPath} className="animate-modal-page-forward">
                  <ClassRequirementDetail
                    classId={selectedClassMeta.cls._id || selectedClassMeta.cls.id}
                    reqPath={activeReqPath}
                    isAdminOverride
                    embedded
                    onBack={() => setActiveReqPath(null)}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-6 py-3.5 bg-white">
              <div>
                {activeReqPath && (
                  <button
                    type="button"
                    onClick={() => setActiveReqPath(null)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs sm:text-sm font-semibold text-gray-700 transition cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Checklist</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseClassModal}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs sm:text-sm font-semibold text-gray-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

