import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppModal, { useAppModal } from "../../components/common/AppModal";

// ---------- helpers ----------
const show = (value) =>
  value === undefined || value === null || value === "" ? "—" : value;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const getNameParts = (fullName = "") => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  };
};

function Info({ label, value, className = "" }) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-800 break-words">{show(value)}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-orange-500 font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  deactivated: "bg-red-50 text-red-700 border-red-200",
  inactive: "bg-gray-50 text-gray-600 border-gray-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
};

function AdminInstructorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [instructor, setInstructor] = useState(null); // account record
  const [profile, setProfile] = useState({}); // full profile (same shape as /api/profile/me)
  const [avatarError, setAvatarError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { modal, close: closeModal, notify, confirm: showConfirm } = useAppModal();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    const fetchInstructorProfile = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch instructor account and profile details
        const res = await fetch(`/api/instructors/${id}`, { headers });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to load instructor.");
        }

        setInstructor(data);

        // Populate profile from embedded profile field or via /api/profile/:id
        if (data.profile && Object.keys(data.profile).length > 0) {
          setProfile(data.profile);
        } else {
          try {
            const profileRes = await fetch(`/api/profile/${id}`, { headers });
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              setProfile(profileData.profile || profileData || {});
            } else {
              setProfile(data.profile || {});
            }
          } catch {
            setProfile(data.profile || {});
          }
        }
      } catch (err) {
        console.error("Failed to load instructor:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructorProfile();
  }, [id]);

  // Handle Deactivate / Reactivate status toggle
  const handleToggleStatus = () => {
    if (!instructor) return;
    const isActive = (instructor.accountStatus || "").toLowerCase() === "active";
    const newStatus = isActive ? "Deactivated" : "Active";
    const verb = isActive ? "deactivate" : "reactivate";
    const name = displayName;

    showConfirm({
      title: `${isActive ? 'Deactivate' : 'Reactivate'} Instructor?`,
      message: `Are you sure you want to ${verb} ${name}?`,
      confirmLabel: isActive ? 'Deactivate' : 'Reactivate',
      cancelLabel: 'Cancel',
      tone: isActive ? 'warning' : 'info',
      onConfirm: async () => {
        try {
          setUpdatingStatus(true);
          const token = localStorage.getItem("token");
          const res = await fetch(`/api/instructors/${id}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ accountStatus: newStatus }),
          });
          if (!res.ok) throw new Error(`Failed to ${verb} instructor.`);
          const updated = await res.json();
          setInstructor((prev) => ({
            ...prev,
            accountStatus: updated.accountStatus ?? newStatus,
          }));
          notify('success', 'Status Updated', `Instructor account has been ${verb}d successfully.`);
        } catch (err) {
          notify('error', 'Update Failed', err.message);
        } finally {
          setUpdatingStatus(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-2xl shadow">
        <p className="text-gray-500 font-medium">Loading instructor profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow">
        <p className="text-red-500 font-medium">{error}</p>
        <button
          onClick={() => navigate("/admin/instructors")}
          className="mt-4 text-sm text-orange-500 hover:underline cursor-pointer"
        >
          ← Back to Instructors
        </button>
      </div>
    );
  }

  if (!instructor) return null;

  const p = profile || {};
  const education = p.education || [];

  // Name: profile parts first, then the account's full name
  const fallbackParts = getNameParts(instructor.fullName);
  const firstName = p.firstName || fallbackParts.firstName;
  const middleName = p.middleName || fallbackParts.middleName;
  const lastName = p.lastName || fallbackParts.lastName;

  const displayName =
    [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ").trim() ||
    instructor.fullName ||
    "Instructor";

  const position = p.position || instructor.position;
  const rank = p.rank || instructor.rank;
  const contactNumber = p.contactNumber || instructor.contactNumber;
  const statusKey = (instructor.accountStatus || "active").toLowerCase();
  const isActive = statusKey === "active";

  const avatar = p.photoUrl || instructor.googlePhotoUrl || instructor.profile?.photoUrl;

  return (
    <div className="space-y-6">
      {/* PROFILE HEADER CARD */}
      <div className="bg-white rounded-2xl shadow p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-2xl border-2 border-orange-500 shrink-0 overflow-hidden">
            {avatar && !avatarError ? (
              <img
                src={avatar}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(displayName)
            )}
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[statusKey] || statusStyles.inactive
                  }`}
              >
                {instructor.accountStatus ? instructor.accountStatus.charAt(0).toUpperCase() + instructor.accountStatus.slice(1).toLowerCase() : "Active"}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {[position, instructor.department].filter(Boolean).join(", ") ||
                "Instructor"}
            </p>
          </div>

          <div className="h-16 w-[1px] bg-gray-200 mx-2 hidden md:block"></div>

          <div className="text-sm text-gray-500 space-y-1">
            <p>
              <span className="text-gray-400">Instructor ID: </span>
              {show(instructor._id)}
            </p>
            <p>
              <span className="text-gray-400">Email: </span>
              {show(instructor.email)}
            </p>
            <p>
              <span className="text-gray-400">Contact: </span>
              {show(contactNumber)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start">
          <button
            onClick={() => navigate("/admin/instructors")}
            className="px-6 py-2 border border-gray-300 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-50 transition cursor-pointer"
          >
            Back
          </button>
          <button
            onClick={handleToggleStatus}
            disabled={updatingStatus}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition shadow-sm cursor-pointer disabled:opacity-50 ${isActive
              ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white"
              : "border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white"
              }`}
          >
            {updatingStatus
              ? "Saving..."
              : isActive
                ? "Deactivate"
                : "Reactivate"}
          </button>
        </div>
      </div>

      {/* BASIC INFORMATION */}
      <Section title="Basic Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Info label="First Name" value={firstName} />
          <Info label="Middle Name" value={middleName} />
          <Info label="Last Name" value={lastName} />
          <Info label="Gender" value={p.gender || instructor.gender} />
          <Info
            label="Civil Status"
            value={p.civilStatus || instructor.civilStatus}
          />
          <Info
            label="Birthdate"
            value={formatDate(p.birthdate || instructor.birthdate)}
          />
        </div>
      </Section>

      {/* CONTACT INFORMATION */}
      <Section title="Contact Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Info label="Contact Number" value={contactNumber} />
          <Info label="Alternate Email" value={p.alternateEmail} />
          <Info label="Address" value={p.address} className="md:col-span-2" />
        </div>
      </Section>

      {/* EDUCATIONAL BACKGROUND */}
      <Section title="Educational Background">
        {education.length === 0 ? (
          <p className="text-sm text-gray-400">
            No educational background added yet.
          </p>
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

      {/* POSITION / RANK */}
      <Section title="Position / Rank">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Info label="Position" value={position} />
          <Info label="Academic Rank" value={rank} />
        </div>
      </Section>

      {/* LOGIN INFORMATION */}
      <Section title="Login Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Info label="Email" value={instructor.email} />
          <Info label="Password" value="••••••••" />
        </div>
      </Section>

      <AppModal modal={modal} onClose={closeModal} />
    </div>
  );
}

export default AdminInstructorProfile;
