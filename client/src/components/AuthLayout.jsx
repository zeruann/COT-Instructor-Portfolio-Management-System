

import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";

function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: "url('/buksu_bg.png')", opacity: 0.15 }}
      ></div>
      <div
        className="absolute inset-y-0 left-0 w-1/2 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(84,77,232,0.95) 0%, rgba(129,137,248,0.95) 100%)",
        }}
      ></div>

      {/* Top Navbar */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 sm:px-10 py-6 flex justify-end">
        <div className="flex items-center gap-6 sm:gap-8">
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link 
              to="/" 
              className="text-gray-700 hover:text-[#ff6900] transition-colors cursor-pointer py-1"
            >
              Home
            </Link>
            <Link 
              to={{ pathname: "/", hash: "#about" }}
              className="text-gray-700 hover:text-[#ff6900] transition-colors cursor-pointer py-1"
            >
              About
            </Link>
            <Link 
              to={{ pathname: "/", hash: "#contact" }}
              className="text-gray-700 hover:text-[#ff6900] transition-colors cursor-pointer py-1"
            >
              Contact
            </Link>
          </nav>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-sm font-semibold shadow-md shadow-orange-200 hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </Link>
        </div>
      </header>

      <div className="relative z-10 min-h-screen flex">
        <div className="w-1/2 flex flex-col items-center justify-center text-white text-center p-10">
          <img src="/cot_logo.svg" alt="COT Logo" className="w-100 h-90 mb-8" />
          <h1 className="text-4xl font-bold leading-tight text-white">
            COT Instructor Portfolio
            <br />
            Management System
          </h1>
        </div>
        <div className="w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;