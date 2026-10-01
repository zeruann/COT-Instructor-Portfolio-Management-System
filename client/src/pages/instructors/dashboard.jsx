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
<div className="flex h-screen bg-gray-50">
    <InstructorSidebar />

    <div className="flex-1 flex flex-col min-w-0">
      <InstructorHeader instructor={instructor} />

        <main className="flex-1 overflow-y-auto p-8">
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-orange-500 font-bold mb-2">
            Welcome, {instructor.fullName}
          </h2>
          <p className="text-gray-500 text-sm">Your portfolio overview will appear here.</p>
        </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;