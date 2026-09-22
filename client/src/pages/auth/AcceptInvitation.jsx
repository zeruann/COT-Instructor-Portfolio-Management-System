import cotLogo from '../../assets/COT-Orange.png';
import buksuImg from '../../assets/Buksu-img.png';

function AcceptInvitation() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover"
      style={{ backgroundImage: `url(${buksuImg})` }}
    >
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        {/* logo */}
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

        <button className="w-full bg-orange-500 text-white rounded-full py-2 mt-4 font-semibold hover:bg-orange-600 shadow-lg">
          Accept Invitation
        </button>
        <button className="w-full border rounded-full py-2 mt-2 font-semibold hover:bg-gray-50">
          Reject Invitation
        </button>
      </div>
    </div>
  );
}

export default AcceptInvitation;