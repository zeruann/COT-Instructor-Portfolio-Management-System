import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-orange-500 font-bold mb-2">
        Welcome, {instructor.fullName}
      </h2>
      <p className="text-gray-500 text-sm">Your portfolio overview will appear here.</p>
    </div>
  );
}

export default Dashboard;
