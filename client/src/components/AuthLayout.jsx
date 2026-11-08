

function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/buksu_bg.png')", opacity: 0.15 }}
      ></div>
      <div
        className="absolute inset-y-0 left-0 w-1/2"
        style={{
          background: "linear-gradient(135deg, rgba(84,77,232,0.95) 0%, rgba(129,137,248,0.95) 100%)",
        }}
      ></div>
      <nav className="absolute top-8 right-10 z-10 flex gap-10 text-[#575488] font-medium">
        <span className="font-bold">BukSU</span>
        <span>About</span>
        <span>Contact</span>
      </nav>
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