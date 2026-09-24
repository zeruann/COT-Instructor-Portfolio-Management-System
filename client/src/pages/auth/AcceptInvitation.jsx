import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import cotLogo from '../../assets/COT-Orange.png';

function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  // 'idle' | 'accepting' | 'rejecting' | 'accepted' | 'rejected'
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    fetch(`/api/invitations/token/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Invalid or expired invitation');
        return res.json();
      })
      .then(setInvitation)
      .catch((err) => setError(err.message));
  }, [token]);

  const handleAccept = async () => {
    if (status === 'accepting' || status === 'rejecting') return;
    setStatus('accepting');
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to accept invitation');
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
      if (!res.ok) throw new Error('Failed to reject invitation');
      setStatus('rejected');
    } catch (err) {
      setStatus('idle');
      setError(err.message);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Something went wrong</h1>
          <p className="text-gray-500 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-orange-400" size={28} />
      </div>
    );
  }

  // ---- Accepted confirmation screen ----
  if (status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Invitation accepted</h1>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Welcome aboard, {invitation.fullName || 'instructor'}. Let\u2019s finish setting up your profile
            for the {invitation.department} department.
          </p>
          <button
            onClick={() => navigate('/profile-setup')}
            className="w-full bg-orange-500 text-white rounded-full py-2.5 mt-6 font-semibold hover:bg-orange-600 shadow-md shadow-orange-200 transition-colors"
          >
            Continue to profile setup
          </button>
        </div>
      </div>
    );
  }

  // ---- Rejected confirmation screen ----
  if (status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-5">
            <XCircle size={32} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Invitation declined</h1>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            You\u2019ve declined this invitation to join as an instructor. No account was created, and
            you can safely close this page.
          </p>
        </div>
      </div>
    );
  }

  // ---- Default: pending decision screen ----
  const isBusy = status === 'accepting' || status === 'rejecting';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <img src={cotLogo} alt="Logo" className="w-20 mx-auto mb-4" />
        <p className="text-orange-600 font-bold text-sm">COT INSTRUCTOR PORTFOLIO MANAGEMENT SYSTEM</p>
        <h1 className="text-xl font-bold mt-1">System Access Invitation</h1>
        <p className="text-gray-500 text-sm mt-2">
          You have been invited to join the system as an instructor.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mt-4 text-left text-sm space-y-2">
          <p><span className="text-gray-400 block text-xs">INVITED BY</span>{invitation.invitedBy}</p>
          <p><span className="text-gray-400 block text-xs">DEPARTMENT</span>{invitation.department}</p>
        </div>

        <button
          onClick={handleAccept}
          disabled={isBusy}
          className="w-full bg-orange-500 text-white rounded-full py-2 mt-4 font-semibold hover:bg-orange-600 shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === 'accepting' && <Loader2 size={16} className="animate-spin" />}
          {status === 'accepting' ? 'Accepting\u2026' : 'Accept Invitation'}
        </button>
        <button
          onClick={handleReject}
          disabled={isBusy}
          className="w-full border rounded-full py-2 mt-2 font-semibold hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === 'rejecting' && <Loader2 size={16} className="animate-spin" />}
          {status === 'rejecting' ? 'Rejecting\u2026' : 'Reject Invitation'}
        </button>
      </div>
    </div>
  );
}

export default AcceptInvitation;