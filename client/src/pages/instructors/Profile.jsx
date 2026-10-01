import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
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

// Shows a value, or a dash when the field is empty
const show = (value) =>
  value === undefined || value === null || value === "" ? "—" : value;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

// Read-only label + value
function Info({ label, value, className = "" }) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-800 break-words">{show(value)}</p>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <section className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-orange-500 font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Profile() {
  const navigate = useNavigate();

  const [instructor, setInstructor] = useState(null); // from localStorage (login)
  const [profile, setProfile] = useState(null);       // from GET /api/profile/me
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // 1. Check login
  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("instructor");

    if (!token || !stored) {
      navigate("/login");
      return;
    }

    setInstructor(JSON.parse(stored));
  }, [navigate]);

  // 2. Load the saved profile
  useEffect(() => {
    if (!instructor) return;

    fetch("/api/profile/me", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((me) => {
        setProfile(me.profile || {});
        // Keep the displayed name in sync with the database
        if (me.fullName) setInstructor((prev) => ({ ...prev, fullName: me.fullName }));
      })
      .catch(() => setLoadError("Couldn’t load your profile. Refresh the page to try again."))
      .finally(() => setLoading(false));
  }, [instructor?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------------------------------------------ */
  /*  EDIT                                                               */
  /*  TODO (groupmate): put the edit functionality here.                 */
  /*  Suggested pieces:                                                  */
  /*   - an `isEditing` state that switches this page to editable fields */
  /*   - a form state pre-filled from `profile`                          */
  /*   - save with PUT /api/profile/me, then update `profile` state      */
  /* ------------------------------------------------------------------ */
  const handleEdit = () => {
    // TODO: edit functionality goes here
  };

  if (!instructor) return null;

  const p = profile || {};
  const education = p.education || [];

  return (
    <div className="flex h-screen bg-gray-50">
      <InstructorSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <InstructorHeader instructor={instructor} />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="space-y-6">
            {/* Profile card */}
            <div className="bg-white rounded-2xl shadow p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {p.photoUrl ? (
                  <img
                    src={p.photoUrl}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-orange-500 text-white flex items-center justify-center text-2xl font-semibold">
                    {getInitials(instructor.fullName)}
                  </div>
                )}

                <div>
                  <p className="text-lg font-bold text-gray-800">{instructor.fullName}</p>
                  <p className="text-gray-500 text-sm">{instructor.email}</p>
                  <p className="text-gray-400 text-xs">id: {instructor.id}</p>
                  {loadError && <p className="text-red-500 text-xs mt-1">{loadError}</p>}
                </div>
              </div>

              {/* EDIT button (no functionality yet, see handleEdit above) */}
              <button
                type="button"
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600"
              >
                <Pencil size={16} />
                Edit Profile
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-400">Loading profile…</p>
            ) : (
              <>
                {/* Basic Information */}
                <Section title="Basic Information">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Info label="First Name" value={p.firstName} />
                    <Info label="Middle Name" value={p.middleName} />
                    <Info label="Last Name" value={p.lastName} />
                    <Info label="Gender" value={p.gender} />
                    <Info label="Civil Status" value={p.civilStatus} />
                    <Info label="Birthdate" value={formatDate(p.birthdate)} />
                  </div>
                </Section>

                {/* Contact Information */}
                <Section title="Contact Information">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Info label="Contact Number" value={p.contactNumber} />
                    <Info label="Alternate Email" value={p.alternateEmail} />
                    <Info label="Address" value={p.address} className="md:col-span-2" />
                  </div>
                </Section>

                {/* Educational Background */}
                <Section title="Educational Background">
                  {education.length === 0 ? (
                    <p className="text-sm text-gray-400">No educational background added yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {education.map((ed, i) => (
                        <div
                          key={ed._id || i}
                          className="border border-gray-100 rounded-xl p-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <Info label="Level" value={ed.level} />
                            <Info label="Degree / Program" value={ed.degree} />
                            <Info label="School / University" value={ed.school} />
                            <Info label="Year Graduated" value={ed.yearGraduated} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Position / Rank */}
                <Section title="Position / Rank">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Info label="Position" value={p.position} />
                    <Info label="Academic Rank" value={p.rank} />
                  </div>
                </Section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Profile;