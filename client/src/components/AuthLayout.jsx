import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogIn } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "About", to: { pathname: "/", hash: "#about" } },
  { label: "Contact", to: { pathname: "/", hash: "#contact" } },
];

const GRADIENT = "linear-gradient(140deg, #423ca6 0%, #575488 48%, #7f8bf3 100%)";

function AuthLayout({ children }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div key={pathname} className="relative min-h-screen w-full flex flex-col overflow-x-hidden font-sans bg-[#f6f5fb] motion-safe:animate-page-fade-in">
      {/* Mobile: compact purple hero backdrop */}
      <div
        className="lg:hidden absolute top-0 inset-x-0 h-[430px] sm:h-[470px] overflow-hidden pointer-events-none z-0"
        style={{ background: GRADIENT }}
      >
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="absolute -left-20 -top-10 h-64 w-64 rounded-full bg-[#9a8dff]/35 blur-3xl" />
        <div className="absolute -right-16 top-28 h-56 w-56 rounded-full bg-[#ff6900]/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_30%,rgba(30,26,80,0.32)_100%)]" />
      </div>

      {/* Desktop: campus image background */}
      <div
        className="hidden lg:block absolute inset-0 bg-cover bg-center pointer-events-none z-0"
        style={{ backgroundImage: "url('/buksu_bg.png')" }}
      />

      {/* Desktop: soft light overlay on the form side */}
      <div className="hidden lg:block absolute inset-y-0 right-0 w-1/2 pointer-events-none z-0 bg-white/78 backdrop-blur-[2px]" />

      {/* Desktop: purple hero panel */}
      <div
        className="hidden lg:block absolute inset-y-0 left-0 w-1/2 pointer-events-none z-0 overflow-hidden"
        style={{ background: GRADIENT }}
      >
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          className="absolute -left-24 top-[12%] h-[26rem] w-[26rem] rounded-full bg-[#9a8dff]/35 blur-3xl"
          style={{ animation: "authFloat 16s ease-in-out infinite" }}
        />
        <div
          className="absolute -right-16 bottom-[6%] h-80 w-80 rounded-full bg-[#ff6900]/20 blur-3xl"
          style={{ animation: "authFloat 20s ease-in-out infinite reverse" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(30,26,80,0.35)_100%)]" />
      </div>

      {/* Header */}
      <header className="relative z-30 w-full px-5 sm:px-8 lg:px-14 py-5 sm:py-7 lg:py-8 flex items-center justify-between gap-4">
        {/* Mobile brand */}
        <Link to="/" className="lg:hidden flex items-center gap-2.5 min-w-0">
          <img
            src="/cot_logo.svg"
            alt="Bukidnon State University College of Technologies Logo"
            className="h-9 w-9 shrink-0 object-contain drop-shadow"
          />
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-bold text-white tracking-tight">
              COT <span className="text-[#ffd9bd]">Portfolio</span>
            </span>
            <span className="block truncate text-[10px] font-medium text-white/70 tracking-wide">
              Bukidnon State University
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex lg:ml-auto items-center gap-1 rounded-full bg-white/70 px-2 py-1.5 shadow-[0_6px_24px_-10px_rgba(40,36,90,0.35)] ring-1 ring-white/70 backdrop-blur-md">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="px-4 py-1.5 rounded-full text-sm font-medium text-[#575488]/85 hover:text-white hover:bg-[#575488] transition-all duration-200 cursor-pointer"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-white backdrop-blur-md transition-all duration-200 hover:bg-white/25 active:scale-95 cursor-pointer"
        >
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
        {/* Mobile dropdown nav (overlay, same behavior as the landing page) */}
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMenuOpen(false)}
              className="lg:hidden fixed inset-0 z-20 bg-black/25 backdrop-blur-[1px] cursor-default"
            />
            <div
              className="lg:hidden absolute left-0 right-0 top-full z-30 px-5 sm:px-8 mt-2 auth-anim"
              style={{ animation: "authFadeUp 0.25s ease-out both" }}
            >
              <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-5 py-3.5 text-sm font-medium text-gray-700 border-b border-gray-100 last:border-b-0 hover:bg-orange-50 hover:text-[#ff6900] transition-colors"
                  >
                    {link.label}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
                <div className="p-3">
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff6900] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition-all duration-200 hover:bg-[#e05d00] active:scale-[0.99]"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Main Split Section */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row lg:items-center lg:justify-center">
        {/* Left Half: Seal Logo & Title */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center text-white text-center px-6 pt-2 pb-10 lg:py-16">
          <div
            className="relative mb-6 lg:mb-10 flex h-44 w-44 sm:h-56 sm:w-56 lg:h-auto lg:w-auto items-center justify-center"
            style={{ animation: "authFadeUp 0.8s ease-out both" }}
          >
            {/* Decorative rings behind the seal */}
            <div className="absolute inset-0 rounded-full border border-white/20" />
            <div className="absolute inset-3 rounded-full border border-dashed border-white/25" />
            <div className="absolute -inset-4 rounded-full bg-white/5 blur-2xl" />
            <img
              src="/cot_logo.svg"
              alt="BukSU College of Technologies Logo"
              className="relative w-32 sm:w-44 lg:w-80 h-auto object-contain drop-shadow-[0_18px_35px_rgba(20,16,70,0.45)] select-none"
            />
          </div>

          <p
            className="mb-2 lg:mb-3 text-[9px] sm:text-[10px] lg:text-xs uppercase tracking-[0.3em] text-white/70 font-semibold"
            style={{ animation: "authFadeUp 0.8s ease-out 0.1s both" }}
          >
            Bukidnon State University
          </p>
          <h1
            className="text-[26px] sm:text-4xl lg:text-[42px] font-bold tracking-tight text-white leading-[1.18] drop-shadow-sm max-w-md"
            style={{ animation: "authFadeUp 0.8s ease-out 0.2s both" }}
          >
            COT Faculty Portfolio
            <br />
            <span className="bg-gradient-to-r from-white via-white to-[#ffd9bd] bg-clip-text text-transparent">
              Management System
            </span>
          </h1>
        </div>

        {/* Right Half: Form Card */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 -mt-7 sm:-mt-8 lg:mt-0 pb-6 lg:py-12">
          <div className="relative w-full max-w-[480px]">
            {/* Ambient glow behind the card */}
            <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-[#575488]/20 via-transparent to-[#ff6900]/15 blur-2xl pointer-events-none" />

            <div
              className="relative w-full rounded-[26px] bg-white/95 backdrop-blur-sm shadow-[0_28px_80px_-24px_rgba(40,36,90,0.45)] ring-1 ring-white/70 border border-white p-6 sm:p-9 lg:p-11"
              style={{ animation: "authFadeUp 0.7s ease-out 0.15s both" }}
            >
              {/* Hairline highlight along the top edge */}
              <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#575488]/35 to-transparent" />
              {children}
            </div>

            <p
              className="mt-5 lg:mt-6 text-center text-[10px] lg:text-[11px] text-gray-400 tracking-wide px-2"
              style={{ animation: "authFadeUp 0.7s ease-out 0.3s both" }}
            >
              © {new Date().getFullYear()} Bukidnon State University · College of Technologies
            </p>
          </div>
        </div>
      </div>

      {/* Bottom spacer for centering balance */}
      <div className="relative z-10 hidden lg:block py-4" />
    </div>
  );
}

export default AuthLayout;
