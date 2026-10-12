import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function AdminInstructorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [instructor, setInstructor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInstructor = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`http://localhost:5000/api/instructors/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load instructor.");
        }

        setInstructor(data);
      } catch (err) {
        console.error("Failed to load instructor:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructor();
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getNameParts = (fullName = "") => {
    const parts = fullName.trim().split(/\s+/);
    return {
      firstName: parts[0] || "",
      middleName:
        parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
      lastName:
        parts.length > 1 ? parts[parts.length - 1] : "",
    };
  };

  if (loading) {
    return <p className="text-gray-500">Loading instructor profile...</p>;
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => navigate("/admin/instructors")}
          className="mt-4 text-sm text-orange-500 hover:underline"
        >
          ← Back to Instructors
        </button>
      </div>
    );
  }

  if (!instructor) {
    return null;
  }

  const { firstName, middleName, lastName } = getNameParts(instructor.fullName);

  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    instructor.fullName || "Instructor"
  )}&background=f97316&color=fff`;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">

      {/* PROFILE HEADER CARD */}
      <div className="flex items-center justify-between pb-8 border-b border-gray-100">
        <div className="flex items-center gap-6">
          {/* Avatar with Orange Border Ring */}
          <div className="p-1 rounded-full border-2 border-orange-500">
            <img
              src={avatar}
              alt={instructor.fullName}
              className="w-24 h-24 rounded-full object-cover"
            />
          </div>

          {/* Name and Role */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {instructor.fullName || "Erica L. Egama"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {instructor.position || "Instructor"}, {instructor.department || "IT Department"}
            </p>
          </div>

          {/* Vertical Separator Line */}
          <div className="h-16 w-[1px] bg-gray-200 mx-2 hidden md:block"></div>

          {/* Details Stack */}
          <div className="text-sm text-gray-500 space-y-1">
            <p>
              <span className="text-gray-400">Instructor ID: </span>
              {instructor._id || "241108179124971"}
            </p>
            <p>
              <span className="text-gray-400">Email: </span>
              {instructor.email || "ericaegama@gmail.com"}
            </p>
            <p>
              <span className="text-gray-400">Contact: </span>
              {instructor.contactNumber || "093435 0384 335"}
            </p>
          </div>
        </div>

        {/* ACTION BUTTONS (Upper Right) */}
        <div className="flex items-center gap-3 self-start">
          <button
            onClick={() => navigate("/admin/instructors")}
            className="px-6 py-2 border border-gray-300 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-50 transition"
          >
            Back
          </button>
          <button
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-medium transition shadow-sm"
          >
            Deactivate
          </button>
        </div>
      </div>

      {/* MAIN FORM / INFORMATION SECTION */}
      <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* LEFT COLUMN: BASIC INFORMATION */}
        <div className="lg:col-span-7">
          <h2 className="text-base font-bold text-orange-500 mb-4">
            Basic Information
          </h2>

          <div className="space-y-4">
            {/* First Name & Middle Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">First Name</label>
                <div className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 bg-white">
                  {firstName || "First Name"}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Middle Name</label>
                <div className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 bg-white">
                  {middleName || "Middle Name"}
                </div>
              </div>
            </div>

            {/* Last Name & Civil Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Last Name</label>
                <div className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 bg-white">
                  {lastName || "Last Name"}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Civil Status</label>
                <div className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 bg-white">
                  {instructor.civilStatus || "Civil Status"}
                </div>
              </div>
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Contact Number</label>
              <div className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 bg-white">
                {instructor.contactNumber || "Contact Number"}
              </div>
            </div>

            {/* Gender & Birthdate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Gender</label>
                <div className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 bg-white">
                  {instructor.gender || "Gender"}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Birthdate</label>
                <div className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 bg-white">
                  {formatDate(instructor.birthdate) || "Birthdate"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LOGIN INFORMATION */}
        <div className="lg:col-span-5">
          <h2 className="text-base font-bold text-orange-500 mb-4">
            Login Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <div className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 bg-white truncate">
                {instructor.email || "Email"}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Password</label>
              <div className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 bg-white">
                ••••••••
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AdminInstructorProfile;
