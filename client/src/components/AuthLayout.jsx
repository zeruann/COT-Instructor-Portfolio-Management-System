import { Link } from "react-router-dom";

function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden font-sans">
      {/* Background Campus Image Full Screen */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none z-0"
        style={{ backgroundImage: "url('/buksu_bg.png')" }}
      />

      {/* Purple Overlay across Left Half with visible texture from underlying campus image */}
      <div
        className="absolute inset-y-0 left-0 w-full lg:w-1/2 pointer-events-none z-0"
        style={{
          background: "linear-gradient(135deg, rgba(84,77,232,0.85) 0%, rgba(129,137,248,0.85) 100%)",
        }}
      />

      {/* Soft Light Overlay on Right Half so background image shows cleanly behind form card */}
      <div
        className="absolute inset-y-0 right-0 w-full lg:w-1/2 pointer-events-none z-0 bg-white/75"
      />

      {/* Top Navigation Links (Top Right on light side) */}
      <header className="relative z-20 w-full px-8 sm:px-14 py-8 flex justify-end">
        <nav className="flex items-center gap-10 text-sm font-medium">
          <Link
            to="/"
            className="text-[#575488] font-bold hover:text-[#ff6900] transition-colors cursor-pointer"
          >
            BukSU
          </Link>
          <Link
            to={{ pathname: "/", hash: "#about" }}
            className="text-[#575488] hover:text-[#ff6900] transition-colors cursor-pointer"
          >
            About
          </Link>
          <Link
            to={{ pathname: "/", hash: "#contact" }}
            className="text-[#575488] hover:text-[#ff6900] transition-colors cursor-pointer"
          >
            Contact
          </Link>
        </nav>
      </header>

      {/* Main Split Section */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center">
        {/* Left Half: Seal Logo & Title */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center text-white text-center px-6 py-10 lg:py-16">
          <img
            src="/cot_logo.svg"
            alt="BukSU College of Technologies Logo"
            className="w-60 sm:w-72 lg:w-80 h-auto object-contain mb-8 drop-shadow-md select-none"
          />
          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-white leading-tight drop-shadow-sm">
            COT Faculty Portfolio
            <br />
            Management System
          </h1>
        </div>

        {/* Right Half: Form Card */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 py-8 lg:py-12">
          <div className="w-full max-w-[480px] bg-white rounded-3xl shadow-[0_12px_45px_rgba(0,0,0,0.12)] border border-gray-100/90 p-8 sm:p-11 transition-all">
            {children}
          </div>
        </div>
      </div>

      {/* Bottom spacer for centering balance */}
      <div className="relative z-10 py-4" />
    </div>
  );
}

export default AuthLayout;