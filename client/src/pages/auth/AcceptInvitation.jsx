import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, ShieldCheck, ChevronDown, AlertCircle, ArrowRight, LogIn } from 'lucide-react';
import {
  PRIVACY_NOTICE_VERSION,
  PRIVACY_NOTICE_EFFECTIVE_DATE,
  PRIVACY_SUMMARY,
} from '../../config/privacyNotice';

// Reads the JSON body (if any) and throws an Error using the server's message.
async function parseResponse(res, fallbackMessage) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || fallbackMessage);
  return data;
}

function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState(null);
  // 'idle' | 'accepting' | 'rejecting' | 'accepted' | 'rejected'
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    fetch(`/api/invitations/token/${token}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(data.message || 'Invalid or expired invitation');
          err.code = data.code;
          err.status = data.status;
          throw err;
        }
        return data;
      })
      .then((data) => {
        if (data.needsSetup) {
          navigate(`/profile-setup?token=${token}`, { replace: true });
          return;
        }
        setInvitation(data);
      })
      .catch((err) => {
        setError({
          message: err.message,
          code: err.code,
          status: err.status,
        });
      });
  }, [token, navigate]);

  const handleAccept = async () => {
    if (status === 'accepting' || status === 'rejecting') return;
    setStatus('accepting');
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacyNoticeVersion: PRIVACY_NOTICE_VERSION }),
      });
      await parseResponse(res, 'Failed to accept invitation');
      setStatus('accepted');
    } catch (err) {
      setStatus('idle');
      setError({ message: err.message });
    }
  };

  const handleReject = async () => {
    if (status === 'accepting' || status === 'rejecting') return;
    setStatus('rejecting');
    try {
      const res = await fetch(`/api/invitations/${token}/reject`, { method: 'PATCH' });
      await parseResponse(res, 'Failed to reject invitation');
      setStatus('rejected');
    } catch (err) {
      setStatus('idle');
      setError({ message: err.message });
    }
  };

  const isBusy = status === 'accepting' || status === 'rejecting';

  return (
    <div className="min-h-screen bg-[#fbfbfb] flex items-center justify-center p-4 sm:p-8 font-sans text-gray-800 relative overflow-hidden">
      {/* Landing Page Campus Image & Warm Gradient Overlays */}
      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: "url('/buksu_bg.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/92 via-orange-50/85 to-[#fbfbfb] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-orange-200/35 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Content Card */}
      <div className="relative z-10 w-full max-w-md">
        {error && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_12px_45px_rgba(0,0,0,0.08)] p-8 sm:p-10 text-center border border-orange-100/80">
            {error.status === 'Accepted' || error.code === 'INVITATION_ALREADY_ACCEPTED' || error.message?.includes('already been accepted') ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
                  <CheckCircle2 size={30} />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Invitation Already Accepted</h1>
                <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                  This invitation has already been accepted. If you have already created your password, you can proceed directly to sign in.
                </p>
                <div className="mt-6 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#ff6900] text-white rounded-xl py-3 font-semibold hover:bg-[#e05d00] shadow-md shadow-orange-200 transition-all cursor-pointer"
                  >
                    <LogIn size={18} />
                    Go to Login
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/profile-setup?token=${token}`)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-gray-500 hover:text-brand-purple transition-colors cursor-pointer"
                  >
                    Finish profile setup <ArrowRight size={14} />
                  </button>
                </div>
              </>
            ) : error.status === 'Expired' || error.message?.includes('expired') ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
                  <AlertCircle size={30} />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Invitation Expired</h1>
                <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                  {error.message || 'This invitation has expired. Please contact your college administrator to request a new invitation link.'}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full mt-6 bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-200 transition-all cursor-pointer text-sm"
                >
                  Return to Home
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 shadow-xs">
                  <XCircle size={28} />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Invitation Unavailable</h1>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                  {error.message || 'This invitation is invalid or has already been used.'}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full mt-6 bg-[#ff6900] text-white rounded-xl py-3 font-semibold hover:bg-[#e05d00] shadow-md shadow-orange-200 transition-all cursor-pointer text-sm"
                >
                  Go to Login
                </button>
              </>
            )}
          </div>
        )}

        {!error && !invitation && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_12px_45px_rgba(0,0,0,0.08)] p-8 sm:p-10 text-center border border-orange-100/80 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-[#ff6900] mb-3" size={34} />
            <p className="text-sm text-gray-600 font-medium">Loading invitation details…</p>
          </div>
        )}

        {!error && invitation && status === 'accepted' && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_12px_45px_rgba(0,0,0,0.08)] p-8 sm:p-10 text-center border border-orange-100/80">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-5 shadow-xs">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Invitation accepted</h1>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              Welcome aboard, {invitation.fullName || 'instructor'}. Let’s finish setting up your profile
              for the {invitation.department} department.
            </p>
            <button
              onClick={() => navigate(`/profile-setup?token=${token}`)}
              className="w-full bg-[#ff6900] text-white rounded-xl py-3 mt-6 font-semibold hover:bg-[#e05d00] shadow-md shadow-orange-200 transition-all cursor-pointer"
            >
              Continue to profile setup
            </button>
          </div>
        )}

        {!error && invitation && status === 'rejected' && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_12px_45px_rgba(0,0,0,0.08)] p-8 sm:p-10 text-center border border-orange-100/80">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-5 shadow-xs">
              <XCircle size={32} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Invitation declined</h1>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              You’ve declined this invitation to join as an instructor. No account was created, and
              you can safely close this page.
            </p>
          </div>
        )}

        {!error && invitation && status !== 'accepted' && status !== 'rejected' && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_12px_45px_rgba(0,0,0,0.08)] p-8 sm:p-10 text-center border border-orange-100/80">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 text-[#ff6900] text-xs font-semibold mb-4 border border-orange-200/70">
              College of Technologies
            </div>
            <h1 className="text-2xl font-bold text-gray-900">System Access Invitation</h1>
            <p className="text-gray-500 text-sm mt-2">
              You have been invited to join the system as an instructor.
            </p>

            <div className="bg-orange-50/50 rounded-2xl p-4 mt-5 text-left text-sm space-y-2 border border-orange-100">
              <p><span className="text-gray-400 block text-xs font-medium uppercase tracking-wider">Invited By</span>{invitation.invitedBy}</p>
              <p><span className="text-gray-400 block text-xs font-medium uppercase tracking-wider">Department</span>{invitation.department}</p>
            </div>

            {/* What we collect and why (Layer 1 of the privacy notice) */}
            <details className="group mt-4 rounded-2xl border border-orange-100 bg-white text-left">
              <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-gray-800 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#ff6900]" />
                  What we collect and why
                </span>
                <ChevronDown
                  size={16}
                  className="text-gray-400 transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="space-y-3 border-t border-orange-100 px-4 pb-4 pt-3">
                <ul className="space-y-2 text-xs leading-relaxed text-gray-600">
                  {PRIVACY_SUMMARY.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6900]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500">
                  <Link
                    to="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#ff6900] underline underline-offset-2 hover:text-[#e05d00]"
                  >
                    Read the full Privacy Notice
                  </Link>{' '}
                  <span className="text-gray-400">
                    (v{PRIVACY_NOTICE_VERSION}, effective {PRIVACY_NOTICE_EFFECTIVE_DATE})
                  </span>
                </p>
              </div>
            </details>

            <button
              onClick={handleAccept}
              disabled={isBusy}
              className="w-full bg-[#ff6900] text-white rounded-xl py-3 mt-6 font-semibold hover:bg-[#e05d00] shadow-md shadow-orange-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {status === 'accepting' && <Loader2 size={16} className="animate-spin" />}
              {status === 'accepting' ? 'Accepting…' : 'Accept Invitation'}
            </button>
            <p className="mt-2.5 text-[11px] leading-relaxed text-gray-400">
              By accepting, you acknowledge that your information is collected and used as described
              in the Privacy Notice (v{PRIVACY_NOTICE_VERSION}).
            </p>
            <button
              onClick={handleReject}
              disabled={isBusy}
              className="w-full border border-gray-300 rounded-xl py-3 mt-3 font-semibold hover:bg-gray-50 text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {status === 'rejecting' && <Loader2 size={16} className="animate-spin" />}
              {status === 'rejecting' ? 'Rejecting…' : 'Reject Invitation'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AcceptInvitation;