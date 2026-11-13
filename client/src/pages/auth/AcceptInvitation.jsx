import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

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
  const [error, setError] = useState('');
  // 'idle' | 'accepting' | 'rejecting' | 'accepted' | 'rejected'
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    fetch(`/api/invitations/token/${token}`)
      .then((res) => parseResponse(res, 'Invalid or expired invitation'))
      .then((data) => {
        if (data.needsSetup) {
          navigate(`/profile-setup?token=${token}`, { replace: true });
          return;
        }
        setInvitation(data);
      })
      .catch((err) => setError(err.message));
  }, [token, navigate]);

  const handleAccept = async () => {
    if (status === 'accepting' || status === 'rejecting') return;
    setStatus('accepting');
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, { method: 'PATCH' });
      await parseResponse(res, 'Failed to accept invitation');
      setStatus('accepted');
    } catch (err) {
      setStatus('idle');
      setError(err.message);
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
      setError(err.message);
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
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <XCircle size={28} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">{error}</p>
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

            <button
              onClick={handleAccept}
              disabled={isBusy}
              className="w-full bg-[#ff6900] text-white rounded-xl py-3 mt-6 font-semibold hover:bg-[#e05d00] shadow-md shadow-orange-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {status === 'accepting' && <Loader2 size={16} className="animate-spin" />}
              {status === 'accepting' ? 'Accepting…' : 'Accept Invitation'}
            </button>
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