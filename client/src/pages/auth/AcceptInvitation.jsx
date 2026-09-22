import { useState } from 'react';
import { CheckCircle2, AlertCircle, UserRoundCheck, LayoutDashboard } from 'lucide-react';
import cotLogo from '../../assets/COT-Orange.png';
import buksuImg from '../../assets/Buksu-img.png';

function AcceptInvitation() {
  const [status, setStatus] = useState('pending'); // 'pending' | 'reject-confirm' | 'accepted' | 'rejected'
  const [reason, setReason] = useState('');

  const handleAccept = () => {
    // TODO: call API to accept invitation
    setStatus('accepted');
  };

  const handleConfirmRejection = () => {
    // TODO: call API to reject invitation, send `reason`
    setStatus('rejected');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover"
      style={{ backgroundImage: `url(${buksuImg})` }}
    >
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">

        {/* PENDING */}
        {status === 'pending' && (
          <>
            <img src={cotLogo} alt="Logo" className="w-20 mx-auto mb-4" />
            <p className="text-orange-600 font-bold text-sm">
              COT INSTRUCTOR PORTFOLIO MANAGEMENT SYSTEM
            </p>
            <h1 className="text-xl font-bold mt-1">System Access Invitation</h1>
            <p className="text-gray-500 text-sm mt-2">
              You have been invited to join the system as an instructor.
              Please review the invitation details below.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mt-4 text-left text-sm space-y-2">
              <p><span className="text-gray-400 block text-xs">INVITED BY</span>Dr. Maria Santos (System Administrator)</p>
              <p><span className="text-gray-400 block text-xs">ROLE</span>Instructor</p>
              <div className="flex justify-between">
                <p><span className="text-gray-400 block text-xs">DATE SENT</span>Sept 19, 2026</p>
                <p><span className="text-gray-400 block text-xs">EXPIRATION</span>Sept 26, 2026</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              By accepting, you will be redirected to complete your profile setup.
            </p>

            <button
              onClick={handleAccept}
              className="w-full bg-orange-500 text-white rounded-full py-2 mt-4 font-semibold hover:bg-orange-600 shadow-lg"
            >
              Accept Invitation
            </button>
            <button
              onClick={() => setStatus('reject-confirm')}
              className="w-full border rounded-full py-2 mt-2 font-semibold hover:bg-gray-50"
            >
              Reject Invitation
            </button>
          </>
        )}

        {/* REJECT CONFIRMATION */}
        {status === 'reject-confirm' && (
          <>
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" strokeWidth={1.5} />
            <h1 className="text-xl font-bold">Reject Invitation?</h1>
            <p className="text-gray-500 text-sm mt-2">
              Are you sure you want to reject the invitation to join the{' '}
              <span className="font-semibold text-gray-700">
                COT Instructor Portfolio Management System
              </span>
              ? This action cannot be undone.
            </p>

            <div className="text-left mt-4">
              <label className="text-gray-400 block text-xs mb-1">
                REASON FOR REJECTION (OPTIONAL)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please let us know why you are declining..."
                className="w-full border rounded-lg p-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            <button
              onClick={handleConfirmRejection}
              className="w-full bg-orange-500 text-white rounded-full py-2 mt-4 font-semibold hover:bg-orange-600 shadow-lg"
            >
              Confirm Rejection
            </button>
            <button
              onClick={() => setStatus('pending')}
              className="w-full border rounded-full py-2 mt-2 font-semibold hover:bg-gray-50"
            >
              Go Back
            </button>
          </>
        )}

        {/* ACCEPTED */}
        {status === 'accepted' && (
          <>
            <div className="relative w-20 mx-auto mb-4">
              <img src={cotLogo} alt="Logo" className="w-20" />
              <CheckCircle2 className="w-6 h-6 text-green-500 bg-white rounded-full absolute -bottom-1 -right-1" fill="white" />
            </div>
            <h1 className="text-xl font-bold">Invitation Accepted!</h1>
            <p className="text-orange-600 font-bold text-xs mt-2">WELCOME TO</p>
            <p className="text-orange-600 font-bold text-sm">
              COT INSTRUCTOR PORTFOLIO MANAGEMENT SYSTEM
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Your account has been successfully activated. You can now proceed
              to set up your professional portfolio and access system features.
            </p>

            <div className="bg-green-50 border border-green-100 rounded-lg p-3 mt-4 text-left text-sm flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <p>
                <span className="font-semibold text-green-700 block">Account Ready</span>
                <span className="text-gray-500 text-xs">
                  Next step: Complete your personal details, teaching materials,
                  and assessment publications.
                </span>
              </p>
            </div>

            <button className="w-full bg-orange-500 text-white rounded-full py-2 mt-4 font-semibold hover:bg-orange-600 shadow-lg flex items-center justify-center gap-2">
              <UserRoundCheck className="w-4 h-4" />
              Complete Your Profile
            </button>
            <button className="w-full border rounded-full py-2 mt-2 font-semibold hover:bg-gray-50 flex items-center justify-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Go to Dashboard
            </button>
          </>
        )}

        {/* REJECTED */}
        {status === 'rejected' && (
          <>
            <h1 className="text-xl font-bold text-gray-700">Invitation Rejected</h1>
            <p className="text-gray-500 text-sm mt-2">
              You have declined this invitation. If this was a mistake,
              please contact your administrator.
            </p>
          </>
        )}

      </div>
    </div>
  );
}

export default AcceptInvitation;