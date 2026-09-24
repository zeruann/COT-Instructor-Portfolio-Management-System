import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://localhost:5000/api/auth";

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Sidebar({ active }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE}/logout`);
    } catch {
      // stateless JWT — logout still succeeds locally even if this call fails
    }
    localStorage.removeItem("token");
    localStorage.removeItem("instructor");
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", key: "dashboard" },
    { label: "My Profile", key: "profile" },
    { label: "Portfolio", key: "portfolio" },
    { label: "Settings", key: "settings" },
  ];

  return (
   <div className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col items-center py-10">
      <img src="/cot_ornge.svg" alt="COT Logo" className="w-28 h-24 mb-10" />

      <nav className="w-full px-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition ${
              active === item.key
                ? "bg-orange-500 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex-grow"></div>

      <button
        onClick={handleLogout}
        className="w-[calc(100%-2rem)] mx-4 px-4 py-2.5 rounded-lg font-medium bg-white border border-orange-500 text-orange-500 hover:bg-orange-50 transition"
      >
        Logout
      </button>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [instructor, setInstructor] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("instructor");
    if (!token || !stored) {
      navigate("/login");
      return;
    }
    setInstructor(JSON.parse(stored));
  }, [navigate]);

  if (!instructor) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar active="profile" />

      <div className="flex-1">
        <div className="flex items-center justify-between bg-white px-8 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src="/cot_ornge.svg" alt="COT Logo" className="w-12 h-10" />
            <h1 className="text-lg font-bold text-orange-500">
              COT Instructor Portfolio Management System
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-semibold text-gray-800">{instructor.fullName}</p>
              <p className="text-sm text-gray-400">Instructor</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-semibold">
              {getInitials(instructor.fullName)}
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-white rounded-2xl shadow p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-semibold">
                {getInitials(instructor.fullName)}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">{instructor.fullName}</p>
                <p className="text-gray-500 text-sm">{instructor.email}</p>
                <p className="text-gray-400 text-xs">id: {instructor.id}</p>
              </div>
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">
              Edit
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-orange-500 font-bold mb-4">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <input className="border border-gray-300 rounded-lg px-3 py-2" placeholder="First Name" />
              <input className="border border-gray-300 rounded-lg px-3 py-2" placeholder="Middle Name" />
              <input className="border border-gray-300 rounded-lg px-3 py-2" placeholder="Last Name" />
              <input className="border border-gray-300 rounded-lg px-3 py-2" placeholder="Civil Status" />
              <input className="border border-gray-300 rounded-lg px-3 py-2 col-span-2" placeholder="Contact Number" />
              <input className="border border-gray-300 rounded-lg px-3 py-2" placeholder="Gender" />
              <input className="border border-gray-300 rounded-lg px-3 py-2" placeholder="Birthdate" type="date" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;