import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BookOpen, BriefcaseBusiness, Check, CheckCircle2, ClipboardCheck,
  FileClock, Info, Loader2, RefreshCw, UserRoundCheck,
  UserRoundPlus, Users,
} from 'lucide-react';
import { fetchClasses } from '../../api/classes';
import { fetchDocuments } from '../../api/documents';
import { fetchNotifications } from '../../api/notifications';

function MetricCard({ icon: Icon, label, value, note, tone }) {
  const tones = {
    orange: 'bg-orange-50 text-brand-orange',
    purple: 'bg-purple-50 text-brand-purple',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-[#eaf5e7] text-[#5cab5f]',
  };
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{note}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={20} /></span>
      </div>
    </article>
  );
}

function getDisplayName(user) {
  const profile = user?.profile || {};
  const name = [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ');
  return name || user?.fullName || 'Administrator';
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [instructors, setInstructors] = useState([]);
  const [classes, setClasses] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [admin, setAdmin] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    const [instructorResult, classResult, documentResult, notificationResult] = await Promise.allSettled([
      fetch('/api/instructors').then(async (response) => {
        if (!response.ok) throw new Error('Could not load instructors');
        return response.json();
      }),
      fetchClasses(),
      fetchDocuments(),
      fetchNotifications(),
    ]);
    let failed = false;
    if (instructorResult.status === 'fulfilled') {
      const data = instructorResult.value;
      setInstructors(Array.isArray(data) ? data : data.instructors || []);
    } else failed = true;
    if (classResult.status === 'fulfilled') {
      const data = classResult.value;
      setClasses(Array.isArray(data) ? data : data?.classes || []);
    } else failed = true;
    if (documentResult.status === 'fulfilled') {
      setDocuments(Array.isArray(documentResult.value) ? documentResult.value : []);
    } else failed = true;
    if (notificationResult.status === 'fulfilled') {
      setNotifications(Array.isArray(notificationResult.value) ? notificationResult.value : []);
    }
    if (failed) setError('Some dashboard information could not be loaded. Refresh to try again.');
    setLoading(false);
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('admin') || localStorage.getItem('user');
      if (stored) setAdmin(JSON.parse(stored));
    } catch {
      setAdmin(null);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, []);

  const counts = useMemo(() => ({
    activeInstructors: instructors.filter((item) => (item.accountStatus || '').toLowerCase() === 'active').length,
    pendingInstructors: instructors.filter((item) => (item.accountStatus || '').toLowerCase() === 'pending').length,
    pendingDocuments: documents.filter((item) => item.status === 'pending_review').length,
    approvedDocuments: documents.filter((item) => item.status === 'approved').length,
  }), [instructors, documents]);

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-gray-500"><Loader2 size={20} className="animate-spin text-brand-orange" /> Loading administrator dashboard…</div>;
  }

  return (
    <div className="w-full min-w-0 space-y-6 pb-6">
      <section className="rounded-xl border border-gray-200 bg-white px-5 py-6 sm:px-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-brand-purple"><BriefcaseBusiness size={23} /></span>
            <div className="min-w-0"><h1 className="text-xl font-bold text-brand-purple sm:text-2xl">Welcome, {getDisplayName(admin).split(' ')[0]}</h1><p className="mt-1 text-sm font-medium text-gray-500">Instructor accounts and portfolio reviews</p></div>
          </div>
          <button type="button" onClick={loadDashboard} aria-label="Refresh dashboard" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"><RefreshCw size={17} /></button>
        </div>
      </section>

      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><span>{error}</span><button type="button" onClick={loadDashboard} className="inline-flex shrink-0 items-center gap-1 font-semibold"><RefreshCw size={14} /> Retry</button></div>}

      <section aria-label="Portfolio summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Instructors" value={instructors.length} note={`${counts.activeInstructors} active accounts`} tone="purple" />
        <MetricCard icon={UserRoundPlus} label="Pending accounts" value={counts.pendingInstructors} note="Invitations awaiting setup" tone="orange" />
        <MetricCard icon={FileClock} label="Awaiting review" value={counts.pendingDocuments} note="Documents across all portfolios" tone="amber" />
        <MetricCard icon={CheckCircle2} label="Active classes" value={classes.length} note={`${counts.approvedDocuments} documents approved`} tone="green" />
      </section>

      <div className="grid w-full min-w-0 grid-cols-1 items-stretch gap-5 xl:grid-cols-3">
        <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4"><div className="flex items-center gap-3"><span className="rounded-lg bg-orange-50 p-2 text-brand-orange"><Users size={18} /></span><div><h2 className="text-lg font-semibold text-indigo-900">Instructor overview</h2><p className="mt-1 text-sm text-gray-500">Account status across the college</p></div></div><button type="button" onClick={() => navigate('/admin/instructors')} className="shrink-0 text-sm font-semibold text-brand-purple hover:underline">View all <ArrowRight size={14} className="ml-1 inline" /></button></div>
          <div className="divide-y divide-gray-100">
            {instructors.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">No instructor accounts found.</div> : instructors.slice(0, 5).map((item) => {
              const id = item._id || item.id;
              const status = item.accountStatus || 'Pending';
              const active = status.toLowerCase() === 'active';
              return <button key={id} type="button" onClick={() => navigate(`/admin/instructors/${id}`)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${active ? 'bg-[#eaf5e7] text-[#5cab5f]' : 'bg-orange-50 text-brand-orange'}`}><UserRoundCheck size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-gray-800">{getDisplayName(item)}</span><span className="mt-0.5 block truncate text-xs text-gray-500">{item.department || item.email || 'Instructor account'}</span></span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-[#eaf5e7] text-[#5cab5f]' : status.toLowerCase() === 'deactivated' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-700'}`}>{status}</span></button>;
            })}
          </div>
          <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 border-t border-gray-100 px-4 py-3 text-xs text-gray-500"><span className="inline-flex items-center gap-1"><UserRoundCheck size={14} className="text-[#5cab5f]" />{counts.activeInstructors} active</span><span className="inline-flex items-center gap-1"><UserRoundPlus size={14} className="text-amber-600" />{counts.pendingInstructors} pending</span><span className="inline-flex items-center gap-1"><BookOpen size={14} className="text-brand-purple" />{classes.length} classes</span></div>
        </section>

        <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 p-4"><div className="flex items-center gap-3"><span className="rounded-lg bg-orange-50 p-2 text-brand-orange"><ClipboardCheck size={18} /></span><div><h2 className="text-lg font-semibold text-indigo-900">Action center</h2><p className="mt-1 text-sm text-gray-500">Items worth a closer look</p></div></div><span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">{counts.pendingDocuments + counts.pendingInstructors}</span></div>
          <div className="flex flex-1 flex-col space-y-3 p-5">
            <button type="button" onClick={() => navigate('/admin/review/faculty-portfolio')} className="flex w-full items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-left hover:bg-amber-50"><span className="mt-0.5 text-amber-700"><FileClock size={18} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-gray-800">Portfolio documents to review</span><span className="mt-0.5 block text-xs text-gray-600">{counts.pendingDocuments} submission{counts.pendingDocuments === 1 ? '' : 's'} awaiting an administrator decision.</span></span><ArrowRight size={16} className="mt-1 shrink-0 text-amber-700" /></button>
            <button type="button" onClick={() => navigate('/admin/instructors')} className="flex w-full items-start gap-3 rounded-xl border border-gray-200 p-3 text-left hover:bg-gray-50"><span className="mt-0.5 text-brand-purple"><UserRoundPlus size={18} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-gray-800">Instructor accounts</span><span className="mt-0.5 block text-xs text-gray-600">{counts.pendingInstructors} account{counts.pendingInstructors === 1 ? '' : 's'} pending setup or review.</span></span><ArrowRight size={16} className="mt-1 shrink-0 text-gray-400" /></button>
            <button type="button" onClick={() => navigate('/admin/review/class-portfolio')} className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-brand-purple hover:underline">Review class portfolios <ArrowRight size={15} /></button>
          </div>
        </section>

        <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white">
          <div className="flex items-center gap-3 border-b border-gray-200 p-4"><span className="rounded-lg bg-orange-50 p-2 text-brand-orange"><RefreshCw size={18} /></span><div><h2 className="text-lg font-semibold text-indigo-900">Recent updates</h2><p className="mt-1 text-sm text-gray-500">Latest administrator notifications</p></div></div>
          <div className="flex-1 divide-y divide-gray-100">
            {notifications.length === 0 ? <p className="p-4 text-sm text-gray-500">No recent notifications.</p> : notifications.slice(0, 3).map((item, index) => {
              const approved = item.type === 'approved' || item.type === 'document_approved';
              const updated = item.type === 'resubmission' || item.type === 'document_rejected';
              return <button type="button" key={item._id || item.id || index} onClick={() => item.actionLink ? navigate(item.actionLink) : navigate('/admin/notifications')} className="flex w-full items-start gap-3 p-4 text-left hover:bg-gray-50"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${approved ? 'bg-emerald-100 text-emerald-700' : updated ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>{approved ? <Check size={17} /> : updated ? <RefreshCw size={16} /> : <Info size={17} />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-gray-800">{item.title || 'Notification'}</span><span className="mt-1 block line-clamp-2 text-xs text-gray-600">{item.message || ''}</span><span className="mt-1 block text-[11px] text-gray-400">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</span></span></button>;
            })}
          </div>
          <div className="mt-auto border-t border-gray-100 p-4"><button type="button" onClick={() => navigate('/admin/notifications')} className="text-sm font-semibold text-brand-purple hover:underline">See all notifications</button></div>
        </section>
      </div>
    </div>
  );
}

export default AdminDashboard;
