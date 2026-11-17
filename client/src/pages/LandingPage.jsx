import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  FolderGit2, 
  ShieldCheck, 
  FileCheck2, 
  ArrowRight, 
  LogIn, 
  Layers,
  Building2,
  Target,
  Award,
  ExternalLink,
  MapPin,
  Mail,
  Clock
} from "lucide-react";
import cotLogo from "../assets/COT-Orange.png";

// Reveals children with a gentle fade-up once they scroll into view.
function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} auth-anim transition-all duration-700 ease-out will-change-transform ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// Facebook Icon SVG component
function FacebookIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function LandingPage() {
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollToHash = (hash) => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const targetId = hash.startsWith("#") ? hash.slice(1) : hash;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (location.hash) {
      // Small timeout to guarantee DOM is rendered before scrolling
      const timer = setTimeout(() => {
        scrollToHash(location.hash);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location.hash, location.pathname]);

  const handleNavClick = (e, hash) => {
    e.preventDefault();
    scrollToHash(hash);
    window.history.pushState(null, "", hash || window.location.pathname);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#fbfbfb] flex flex-col font-sans text-gray-800">
      {/* Navigation Header */}
      <header
        className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-orange-100/80 shadow-xs auth-anim"
        style={{ animation: "authFadeUp 0.6s ease-out both" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer shrink-0">
            <img 
              src={cotLogo} 
              alt="COT Logo" 
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-sm transition-transform duration-500 group-hover:rotate-[8deg] group-hover:scale-105" 
            />
            <div className="leading-tight">
              <span className="block font-bold text-base sm:text-lg tracking-tight text-gray-900 whitespace-nowrap">
                COT <span className="text-[#ff6900]">Portfolio</span>
              </span>
              <span className="block text-[10px] sm:text-xs text-gray-500 font-medium whitespace-nowrap">
                Bukidnon State University
              </span>
            </div>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
              {[
                { label: "Home", hash: "" },
                { label: "About", hash: "#about" },
                { label: "Contact", hash: "#contact" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.hash || "#"}
                  onClick={(e) => handleNavClick(e, item.hash)}
                  className="group relative hover:text-[#ff6900] text-gray-700 transition-colors cursor-pointer py-1"
                >
                  {item.label}
                  <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 rounded-full bg-[#ff6900] transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </nav>

            <Link
              to="/login"
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-sm font-semibold shadow-md shadow-orange-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              <LogIn className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span>Sign In</span>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            className="md:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-white text-[#ff6900] shadow-xs transition-all duration-200 hover:bg-orange-50 active:scale-95 cursor-pointer"
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
        </div>

        {/* Mobile dropdown nav (overlay so the page doesn't shift) */}
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMenuOpen(false)}
              className="md:hidden fixed inset-0 z-20 bg-black/25 backdrop-blur-[1px] cursor-default"
            />
            <div
              className="md:hidden absolute left-0 right-0 top-full z-30 px-4 sm:px-6 mt-2 auth-anim"
              style={{ animation: "authFadeUp 0.25s ease-out both" }}
            >
              <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                {[
                  { label: "Home", hash: "" },
                  { label: "About", hash: "#about" },
                  { label: "Contact", hash: "#contact" },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.hash || "#"}
                    onClick={(e) => handleNavClick(e, item.hash)}
                    className="flex items-center justify-between px-5 py-3.5 text-sm font-medium text-gray-700 border-b border-gray-100 last:border-b-0 transition-colors hover:bg-orange-50 hover:text-[#ff6900]"
                  >
                    {item.label}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
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

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section id="home" className="relative overflow-hidden py-16 sm:py-24">
          {/* Background image & overlays */}
          <div 
            className="absolute inset-0 bg-cover bg-center pointer-events-none auth-anim"
            style={{
              backgroundImage: "url('/buksu_bg.png')",
              animation: "authKenBurns 24s ease-in-out infinite alternate",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/92 via-orange-50/85 to-[#fbfbfb] pointer-events-none" />

          {/* Subtle background glows */}
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-orange-200/30 rounded-full blur-3xl pointer-events-none -z-10 auth-anim"
            style={{ animation: "authPulse 9s ease-in-out infinite" }}
          />
          <div
            className="absolute top-10 right-[12%] w-40 h-40 bg-amber-200/30 rounded-full blur-2xl pointer-events-none -z-10 auth-anim"
            style={{ animation: "authFloat 12s ease-in-out infinite" }}
          />
          <div
            className="absolute bottom-4 left-[10%] w-48 h-48 bg-orange-300/20 rounded-full blur-2xl pointer-events-none -z-10 auth-anim"
            style={{ animation: "authFloat 15s ease-in-out infinite reverse" }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <div
                className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-orange-100 text-[#ff6900] text-xs font-semibold mb-6 border border-orange-200/70 auth-anim"
                style={{ animation: "authFadeUp 0.7s ease-out both" }}
              >
                College of Technologies
              </div>

              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15] auth-anim"
                style={{ animation: "authFadeUp 0.8s ease-out 0.12s both" }}
              >
                Instructor E-Portfolio <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6900] via-orange-500 to-amber-500">
                  Management System
                </span>
              </h1>

              <p
                className="mt-6 text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto auth-anim"
                style={{ animation: "authFadeUp 0.8s ease-out 0.24s both" }}
              >
                A centralized, secure platform for faculty and administrators to organize, 
                submit, and review academic requirements, class portfolios, and professional achievements.
              </p>

              <div
                className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 auth-anim"
                style={{ animation: "authFadeUp 0.8s ease-out 0.36s both" }}
              >
                <Link
                  to="/login"
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white font-semibold text-base shadow-lg shadow-orange-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
                >
                  Access Your Portal
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="py-16 bg-white border-t border-orange-100/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Key Capabilities
              </h2>
              <p className="mt-3 text-gray-500 text-sm sm:text-base">
                Designed to make faculty compliance smooth, transparent, and paperless.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <Reveal delay={0} className="h-full">
                <div className="group h-full bg-[#fbfbfb] border border-orange-100 rounded-2xl p-6 hover:shadow-xl hover:shadow-orange-100/60 hover:border-orange-200 hover:-translate-y-1.5 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-orange-100/80 text-[#ff6900] flex items-center justify-center mb-5 border border-orange-200/50 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <FolderGit2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Portfolio Tracking
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Seamlessly organize your educational attainment, research, extension involvement, and class portfolios in one place.
                  </p>
                </div>
              </Reveal>

              {/* Card 2 */}
              <Reveal delay={120} className="h-full">
                <div className="group h-full bg-[#fbfbfb] border border-orange-100 rounded-2xl p-6 hover:shadow-xl hover:shadow-orange-100/60 hover:border-orange-200 hover:-translate-y-1.5 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-orange-100/80 text-[#ff6900] flex items-center justify-center mb-5 border border-orange-200/50 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Review & Compliance
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Real-time status updates, approval checklists, and instant notifications for requirements and document reviews.
                  </p>
                </div>
              </Reveal>

              {/* Card 3 */}
              <Reveal delay={240} className="h-full">
                <div className="group h-full bg-[#fbfbfb] border border-orange-100 rounded-2xl p-6 hover:shadow-xl hover:shadow-orange-100/60 hover:border-orange-200 hover:-translate-y-1.5 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-orange-100/80 text-[#ff6900] flex items-center justify-center mb-5 border border-orange-200/50 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Secure Cloud Storage
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Safe storage integrated with Google Drive and institutional access control to keep faculty records protected.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-20 bg-[#fbfbfb] border-t border-orange-100/70 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="max-w-3xl mx-auto text-center mb-14">
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-orange-100 text-[#ff6900] text-xs font-semibold mb-3 border border-orange-200/70">
                About the System
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                Empowering BukSU Educators Through <span className="text-[#ff6900]">Digital Excellence</span>
              </h2>
              <p className="mt-4 text-base text-gray-600 leading-relaxed">
                The BukSU College of Technologies Instructor E-Portfolio Management System modernizes faculty portfolio submissions, replaces paper-intensive document audits, and provides a continuous compliance trail.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <Reveal delay={0} className="h-full">
                <div className="group h-full bg-white border border-orange-100 rounded-2xl p-8 shadow-xs hover:shadow-xl hover:shadow-orange-100/60 hover:-translate-y-1.5 hover:border-orange-200 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 text-[#ff6900] flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <Target className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Our Mission</h3>
                  <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                    To provide faculty members with an intuitive environment for archiving instructional materials, syllabi, grading sheets, and achievements while enabling administrators to review and approve requirements swiftly.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={140} className="h-full">
                <div className="group h-full bg-white border border-orange-100 rounded-2xl p-8 shadow-xs hover:shadow-xl hover:shadow-orange-100/60 hover:-translate-y-1.5 hover:border-orange-200 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 text-[#ff6900] flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <Award className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Accreditation Ready</h3>
                  <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                    All teaching evidence, community outreach records, and professional licensures are standardized, version-controlled, and preserved to fulfill institutional quality assurance audits.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20 bg-white border-t border-orange-100/70 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="max-w-3xl mx-auto text-center mb-14">
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-orange-100 text-[#ff6900] text-xs font-semibold mb-3 border border-orange-200/70">
                Contact & Support
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                Connect With <span className="text-[#ff6900]">BukSU COT</span>
              </h2>
              <p className="mt-4 text-base text-gray-600 leading-relaxed">
                Stay updated with the latest college announcements or reach out directly to the College of Technologies dean's office.
              </p>
            </Reveal>

            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Facebook Card - Primary highlight */}
              <Reveal delay={0} className="h-full">
                <div className="group h-full bg-gradient-to-br from-orange-50 to-amber-50/60 border-2 border-orange-200 rounded-2xl p-7 flex flex-col justify-between shadow-xs hover:shadow-xl hover:shadow-orange-100/70 hover:-translate-y-1.5 transition-all duration-300">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-[#ff6900] text-white flex items-center justify-center mb-4 shadow-sm shadow-orange-200 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                      <FacebookIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Official Facebook Page</h3>
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                      Follow BukSU College of Technologies for real-time news, memos, and events.
                    </p>
                  </div>
                  <a
                    href="https://facebook.com/BukSUCOTOfficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/btn inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-sm font-semibold transition-all duration-200 cursor-pointer shadow-md shadow-orange-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span>facebook.com/BukSUCOTOfficial</span>
                    <ExternalLink className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                  </a>
                </div>
              </Reveal>

              {/* Location Card */}
              <Reveal delay={120} className="h-full">
                <div className="group h-full bg-[#fbfbfb] border border-orange-100 rounded-2xl p-7 flex flex-col justify-between shadow-xs hover:shadow-xl hover:shadow-orange-100/60 hover:border-orange-200 hover:-translate-y-1.5 transition-all duration-300">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-orange-100 text-[#ff6900] flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Campus Location</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      College of Technologies Building<br />
                      Bukidnon State University Main Campus<br />
                      Fortich St., Malaybalay City, Bukidnon
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-orange-100/80 text-xs text-gray-500">
                    Northern Mindanao, Philippines
                  </div>
                </div>
              </Reveal>

              {/* Office Hours / Email */}
              <Reveal delay={240} className="h-full">
                <div className="group h-full bg-[#fbfbfb] border border-orange-100 rounded-2xl p-7 flex flex-col justify-between shadow-xs hover:shadow-xl hover:shadow-orange-100/60 hover:border-orange-200 hover:-translate-y-1.5 transition-all duration-300">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-orange-100 text-[#ff6900] flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                      <Clock className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Office Hours</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Monday to Friday<br />
                      8:00 AM – 5:00 PM<br />
                      (Excluding University Holidays)
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-orange-100/80 text-xs text-gray-500">
                    Inquiries: cot@buksu.edu.ph
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Bottom Call to Action Banner */}
            <Reveal className="mt-14 max-w-5xl mx-auto">
              <div className="relative overflow-hidden bg-gradient-to-br from-[#ff6900] to-amber-600 rounded-3xl p-8 sm:p-10 text-white shadow-xl shadow-orange-500/15 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Soft moving sheen */}
                <div className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-white/15 blur-2xl auth-anim" style={{ animation: "authFloat 10s ease-in-out infinite" }} />
                <div className="pointer-events-none absolute -bottom-28 right-0 h-64 w-64 rounded-full bg-amber-200/20 blur-2xl auth-anim" style={{ animation: "authFloat 13s ease-in-out infinite reverse" }} />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 text-orange-100 text-xs font-semibold uppercase tracking-wider mb-2">
                    <Layers className="w-4 h-4" /> Ready to get started?
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white">
                    BukSU College of Technologies
                  </h3>
                  <p className="text-orange-50 text-sm sm:text-base mt-1 max-w-xl">
                    Sign in with your institutional credentials to manage deliverables and review faculty portfolios.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="group relative shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[#ff6900] font-bold text-sm hover:bg-orange-50 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  Sign In Now
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-orange-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-500">
          <p>© {currentYear} Bukidnon State University - College of Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
