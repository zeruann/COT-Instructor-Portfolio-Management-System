import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Bell, BookOpen, Check, CheckCircle2, Clock3, FileCheck2, Info,
  FolderOpen, Loader2, RefreshCw, TriangleAlert,
} from 'lucide-react';
import { fetchClasses } from '../../api/classes';
import { fetchNotifications } from '../../api/notifications';
import { getNotificationTitle } from '../../utils/notificationDisplay';

const number = (value) => new Intl.NumberFormat().format(value || 0);
const className = (item) => `${item.subject?.code || 'Course'} · ${item.section?.code || 'Section'}`;
const periodName = (item) => {
  const period = item.academicPeriod;
  return [period?.schoolYear, period?.semester ? `${period.semester} Semester` : null]
    .filter(Boolean).join(' · ') || 'Academic period not set';
};

function getNotificationStyle(type) {
  if (type === 'approved' || type === 'document_approved') {
    return { icon: <Check size={18} className="text-emerald-600 stroke-[2.5]" />, background: 'bg-emerald-100', title: 'text-emerald-700' };
  }
  if (type === 'resubmission' || type === 'document_rejected') {
    return { icon: <RefreshCw size={17} className="text-orange-600 stroke-[2.3]" />, background: 'bg-orange-100', title: 'text-orange-600' };
  }
  if (type === 'reminder') {
    return { icon: <span className="text-base font-bold text-amber-700">!</span>, background: 'bg-amber-100', title: 'text-amber-700' };
  }
  return { icon: <Info size={18} className="text-purple-600 stroke-[2.3]" />, background: 'bg-purple-100', title: 'text-[#474378]' };
}

function formatNotificationTimestamp(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const diffDays = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getDate()}, ${time}`;
}

function Metric({ icon: Icon, label, value, detail, tone }) {
  const tones = {
    purple: 'bg-purple-50 text-brand-purple',
    orange: 'bg-orange-50 text-orange-600',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-[#eaf5e7] text-[#5cab5f]',
  };
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{number(value)}</p>
          <p className="mt-1 text-xs text-gray-500">{detail}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon size={20} />
        </span>
      </div>
    </article>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [instructor, setInstructor] = useState(null);
  const [classes, setClasses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const stored = localStorage.getItem('instructor') || localStorage.getItem('user');
    if (!token || !stored) {
      navigate('/login');
      return;
    }
    try {
      setInstructor(JSON.parse(stored));
    } catch {
      navigate('/login');
    }
  }, [navigate]);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    const [classResult, notificationResult] = await Promise.allSettled([
      fetchClasses(), fetchNotifications(),
    ]);
    if (classResult.status === 'fulfilled') {
      const data = classResult.value;
      setClasses(Array.isArray(data) ? data : data?.classes || []);
    } else {
      setError('Class portfolio data could not be loaded. Please try again.');
    }
    if (notificationResult.status === 'fulfilled') {
      setNotifications(Array.isArray(notificationResult.value) ? notificationResult.value : []);
    }
    setLoading(false);
  };

  useEffect(() => { loadDashboard(); }, []);

  const periods = useMemo(() => {
    const semesterOrder = {
      Summer: 3,
      '2nd': 2,
      '1st': 1,
    };

    const parseSchoolYearStart = (sy) => {
      if (!sy) return 0;
      const match = String(sy).match(/^(\d{4})/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const unique = new Map();
    classes.forEach((item) => {
      const period = item.academicPeriod;
      if (!period) return;
      const id = period._id || `${period.schoolYear}-${period.semester}`;
      unique.set(id, {
        id,
        label: periodName(item),
        current: period.isCurrent,
        schoolYear: period.schoolYear,
        semester: period.semester,
        syStart: parseSchoolYearStart(period.schoolYear),
        semRank: semesterOrder[period.semester] || 0,
      });
    });

    return [...unique.values()].sort((a, b) => {
      // Sort strictly descending by school year start
      if (b.syStart !== a.syStart) {
        return b.syStart - a.syStart;
      }
      // If same school year, sort descending by semester (Summer > 2nd > 1st)
      if (b.semRank !== a.semRank) {
        return b.semRank - a.semRank;
      }
      // Fallback
      return String(b.label).localeCompare(String(a.label));
    });
  }, [classes]);

  const visibleClasses = useMemo(() => selectedPeriod === 'all'
    ? classes
    : classes.filter((item) => (item.academicPeriod?._id || `${item.academicPeriod?.schoolYear}-${item.academicPeriod?.semester}`) === selectedPeriod),
  [classes, selectedPeriod]);

  const totals = useMemo(() => visibleClasses.reduce((sum, item) => ({
    approved: sum.approved + (item.approvedCount || 0),
    pending: sum.pending + (item.pendingCount || 0),
    action: sum.action + (item.rejectedCount || 0),
    required: sum.required + (item.totalRequired || 0),
  }), { approved: 0, pending: 0, action: 0, required: 0 }), [visibleClasses]);

  const recent = notifications.slice(0, 4);
  const reviewQueue = notifications.filter((item) =>
    ['pending_review', 'resubmission', 'document_rejected'].includes(item.category) ||
    ['resubmission', 'document_rejected'].includes(item.type));
  const completion = totals.required ? Math.round((totals.approved / totals.required) * 100) : 0;
  const greetingName = instructor?.profile?.firstName || instructor?.fullName?.split(' ')[0] || 'Instructor';

  if (!instructor) return null;

  return (
    <div className="w-full min-w-0 space-y-6 pb-6">
      <section className="rounded-xl border border-gray-200 bg-white px-5 py-6 sm:px-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-brand-purple"><BookOpen size={23} /></span>
            <div>
              <h1 className="text-2xl font-semibold leading-8 text-gray-900 sm:text-3xl">Welcome, {greetingName}</h1>
              <p className="mt-1 text-sm text-gray-600">Your classes and portfolio progress</p>
            </div>
          </div>
          <button onClick={() => navigate('/instructors/class-portfolio')} className="inline-flex w-fit items-center gap-2 rounded-lg bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2">View classes <ArrowRight size={16} /></button>
        </div>
      </section>

      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button onClick={loadDashboard} className="inline-flex items-center gap-1 font-semibold"><RefreshCw size={14} /> Retry</button></div>}

      <section aria-label="Portfolio summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={BookOpen} label="Active classes" value={visibleClasses.length} detail="In the selected academic period" tone="purple" />
        <Metric icon={TriangleAlert} label="Needs attention" value={totals.action} detail="Rejected items to update" tone="orange" />
        <Metric icon={Clock3} label="Awaiting review" value={totals.pending} detail="Portfolio items submitted" tone="amber" />
        <Metric icon={CheckCircle2} label="Approved items" value={totals.approved} detail={`${completion}% of required items approved`} tone="green" />
      </section>

      <div className="grid w-full min-w-0 grid-cols-1 items-stretch gap-5 xl:grid-cols-3">
        <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4">
            <div className="flex items-start gap-3"><span className="mt-0.5 rounded-lg bg-purple-50 p-2 text-brand-purple"><FolderOpen size={18} /></span><div className="min-w-0"><h2 className="text-lg font-semibold text-gray-900">Your classes</h2><p className="mt-1 text-sm text-gray-500">Portfolio progress by course and section</p></div></div>
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="dashboard-period" className="sr-only">Filter by academic period</label>
              <select id="dashboard-period" value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20">
                <option value="all">All periods</option>
                {periods.map((period) => <option key={period.id} value={period.id}>{period.label}{period.current ? ' · Current' : ''}</option>)}
              </select>
              <button aria-label="Refresh dashboard" onClick={loadDashboard} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"><RefreshCw size={16} /></button>
            </div>
          </div>
          {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-500"><Loader2 className="animate-spin" size={18} /> Loading dashboard…</div>
            : visibleClasses.length === 0 ? <div className="p-10 text-center"><BookOpen className="mx-auto text-gray-300" size={30} /><p className="mt-3 font-semibold text-gray-700">No classes found</p><p className="mt-1 text-sm text-gray-500">Your class portfolios will show here when they’re available.</p><button onClick={() => navigate('/instructors/class-portfolio')} className="mt-4 text-sm font-semibold text-brand-purple hover:underline">Go to class portfolio</button></div>
              : <div className="divide-y divide-gray-100">
                {visibleClasses.map((item) => {
                  const id = item._id || item.id;
                  const required = item.totalRequired || 0;
                  const pct = required ? Math.min(100, Math.round(((item.approvedCount || 0) / required) * 100)) : 0;
                  return <button key={id} onClick={() => navigate(`/instructors/class-portfolio/${id}`)} className="block w-full p-4 text-left transition hover:bg-gray-50/80">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0"><p className="truncate font-bold text-gray-900">{className(item)}</p><p className="mt-1 text-xs text-gray-500">{periodName(item)}{item.section?.name ? ` · ${item.section.name}` : ''}</p></div>
                      <span className="shrink-0 text-sm font-semibold text-brand-purple">{pct}% complete <ArrowRight className="ml-1 inline" size={14} /></span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand-purple transition-all" style={{ width: `${pct}%` }} /></div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500"><span className="inline-flex items-center gap-1"><CheckCircle2 size={13} className="text-[#5cab5f]" />{item.approvedCount || 0} approved</span><span className="inline-flex items-center gap-1"><Clock3 size={13} className="text-amber-600" />{item.pendingCount || 0} awaiting review</span>{item.rejectedCount > 0 && <span className="inline-flex items-center gap-1 font-medium text-orange-700"><TriangleAlert size={13} />{item.rejectedCount} needs attention</span>}<span className="ml-auto">{required ? `${item.approvedCount || 0} of ${required}` : 'No requirements configured'}</span></div>
                  </button>;
                })}
              </div>}
          {!loading && visibleClasses.length > 0 && <div className="mt-auto border-t border-gray-100 px-5 py-3"><button onClick={() => navigate('/instructors/class-portfolio')} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-purple hover:underline">View all classes <ArrowRight size={15} /></button></div>}
        </section>

        <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 p-4"><div className="flex items-start gap-3"><span className="mt-0.5 rounded-lg bg-orange-50 p-2 text-brand-orange"><TriangleAlert size={18} /></span><div><h2 className="text-lg font-semibold text-gray-900">Needs attention</h2><p className="mt-1 text-sm text-gray-500">Items to review or update</p></div></div><span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">{totals.action + reviewQueue.length}</span></div>
            <div className="flex flex-1 flex-col space-y-3 p-5">
              {totals.action > 0 && <button onClick={() => navigate('/instructors/class-portfolio')} className="flex w-full items-start gap-3 rounded-xl border border-orange-100 bg-orange-50/70 p-3 text-left hover:bg-orange-50"><span className="mt-0.5 text-orange-700"><TriangleAlert size={18} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-gray-800">Rejected portfolio items</span><span className="mt-0.5 block text-xs text-gray-600">{totals.action} item{totals.action === 1 ? '' : 's'} across your classes may need updates.</span></span><ArrowRight size={16} className="mt-1 shrink-0 text-orange-700" /></button>}
              {reviewQueue.slice(0, 3).map((item, index) => <button key={item._id || item.id || index} onClick={() => item.actionLink ? navigate(item.actionLink) : navigate('/instructors/notifications')} className="flex w-full items-start gap-3 rounded-xl border border-gray-100 p-3 text-left hover:bg-gray-50"><span className="mt-0.5 text-brand-purple"><FileCheck2 size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-gray-800">{item.title || 'Portfolio update'}</span><span className="mt-0.5 block line-clamp-2 text-xs text-gray-500">{item.message || item.body || 'A portfolio notification needs your attention.'}</span></span><ArrowRight size={16} className="mt-1 shrink-0 text-gray-400" /></button>)}
              {totals.action === 0 && reviewQueue.length === 0 && <div className="rounded-xl bg-emerald-50 p-4 text-center"><CheckCircle2 className="mx-auto text-emerald-700" size={22} /><p className="mt-2 text-sm font-semibold text-emerald-800">You’re all caught up</p><p className="mt-1 text-xs text-emerald-700">No outstanding portfolio actions right now.</p></div>}
              <button onClick={() => navigate('/instructors/notifications')} className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-brand-purple hover:underline">Open notifications <ArrowRight size={15} /></button>
            </div>
        </section>

        <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 p-4"><div className="flex items-start gap-3"><span className="mt-0.5 rounded-lg bg-purple-50 p-2 text-brand-purple"><Bell size={18} /></span><div><h2 className="text-lg font-semibold text-gray-900">Recent notifications</h2><p className="mt-1 text-sm text-gray-500">Latest updates about your portfolio</p></div></div></div>
            <div className="flex-1 divide-y divide-gray-100">
              {recent.length === 0 ? <div className="p-5 text-sm text-gray-500">No recent notifications.</div> : recent.map((item, index) => {
                const notificationStyle = getNotificationStyle(item.type);
                return <button key={item._id || item.id || index} onClick={() => item.actionLink ? navigate(item.actionLink) : navigate('/instructors/notifications')} className={`flex w-full flex-col items-start gap-4 rounded-xl p-4 text-left transition hover:bg-gray-50/60 sm:flex-row sm:items-center sm:justify-between ${!item.readAt ? 'bg-orange-50/20' : ''}`}><span className="flex min-w-0 items-start gap-4"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${notificationStyle.background}`}>{notificationStyle.icon}</span><span className="min-w-0"><span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className={`block truncate text-sm font-semibold ${notificationStyle.title}`}>{getNotificationTitle(item)}</span>{!item.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-orange" />}<span className="text-xs text-gray-400">{formatNotificationTimestamp(item.createdAt || item.timestamp)}</span></span><span className="mt-1 block line-clamp-2 text-xs text-gray-600 sm:text-sm">{item.message || item.body || ''}</span>{item.comment && item.type !== 'approved' && item.type !== 'document_approved' && <span className="mt-1.5 block rounded-lg border border-gray-200/80 bg-gray-50 px-3 py-1.5 text-xs text-gray-600"><span className="font-semibold text-gray-700">Admin Remarks:</span> {item.comment}</span>}</span></span>{item.actionLink && <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-xl border border-brand-purple/40 bg-white px-4 py-2 text-sm font-medium text-brand-purple sm:self-auto">Open portfolio <ArrowRight size={16} /></span>}</button>;
              })}
            </div>
            <div className="mt-auto border-t border-gray-100 p-4"><button onClick={() => navigate('/instructors/notifications')} className="text-sm font-semibold text-brand-purple hover:underline">See all notifications</button></div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
