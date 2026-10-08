import cotLogo from '../assets/COT-Orange.png';

const ROLE_CONFIG = {
  admin: {
    logo: cotLogo,
    roleLabel: 'Administrator',
    defaultName: 'Admin User',
    containerClass: 'flex items-center justify-between mb-8',
  },
  instructor: {
    logo: '/cot_ornge.svg',
    roleLabel: 'Instructor',
    defaultName: 'Instructor',
    containerClass:
      'shrink-0 flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100',
  },
};

function Header({ role, user }) {
  const config = ROLE_CONFIG[role];
  if (!config) return null; // unknown role: render nothing

  const { logo, roleLabel, defaultName, containerClass } = config;
  const name = user?.fullName || defaultName;

  return (
    <header className={containerClass}>
      <div className="flex items-center gap-3">
        <img src={logo} alt="Logo" className="w-10" />
        <h1 className="text-orange-600 font-bold text-lg">
          COT Instructor Portfolio Management System
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right text-sm">
          <p className="font-semibold text-gray-800">{name}</p>
          <p className="text-gray-400 text-xs">{roleLabel}</p>
        </div>
        <img
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f97316&color=fff`}
          alt={name}
          className="w-10 h-10 rounded-full object-cover"
        />
      </div>
    </header>
  );
}

export default Header;