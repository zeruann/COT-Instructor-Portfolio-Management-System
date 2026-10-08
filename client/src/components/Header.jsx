import cotLogo from '../assets/COT-Orange.png';

function Header() {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <img src={cotLogo} alt="Logo" className="w-10" />
        <h1 className="text-orange-600 font-bold text-lg">
          COT Instructor Portfolio Management System
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right text-sm">
          <p className="font-semibold text-gray-800">Admin User</p>
          <p className="text-gray-400 text-xs">Administrator</p>
        </div>
        <img
          src="https://ui-avatars.com/api/?name=Admin+User&background=f97316&color=fff"
          alt="Admin User"
          className="w-10 h-10 rounded-full object-cover"
        />
      </div>
    </div>
  );
}

export default Header;