import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InstructorHeader from "../../components/InstructorsHeader";
import InstructorSidebar from "../../components/InstructorsSidebar";

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
      <InstructorSidebar />

      <div className="flex-1 p-8">
        <InstructorHeader instructor={instructor} />

        <div className="space-y-6">
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