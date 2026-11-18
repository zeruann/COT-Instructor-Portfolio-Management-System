import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Pencil, Trash2 } from "lucide-react";
import {
  resizeProfileImage,
  isCustomPhotoUrl,
  resolveAvatarUrl,
} from "../../utils/profilePhoto";

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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

export default function AdminProfile({ embedded = false } = {}) {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  // Check authentication & get logged-in admin
  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("admin") || localStorage.getItem("user");

    if (!token) {
      navigate("/login");
      return;
    }

    if (stored) {
      try {
        setAdmin(JSON.parse(stored));
      } catch (err) {
        console.error("Error parsing stored admin details:", err);
      }
    }
  }, [navigate]);

  // Load profile details from backend
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/profile/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to load profile.");
        }
        return res.json();
      })
      .then((me) => {
        const p = { ...(me.profile || me || {}) };
        if (p.photoUrl && !isCustomPhotoUrl(p.photoUrl, me.googlePhotoUrl)) {
          p.photoUrl = "";
        }
        setProfile(p);

        const fetchedName =
          me.fullName ||
          [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");

        setAdmin((prev) => ({
          ...prev,
          fullName: fetchedName || prev?.fullName,
          email: me.email || prev?.email,
          googlePhotoUrl: me.googlePhotoUrl || prev?.googlePhotoUrl,
        }));
      })
      .catch(() => {
        // Fallback for UI testing when API isn't ready
        const stored = localStorage.getItem("admin") || localStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          const nameParts = (parsed.fullName || "").split(" ");
          setProfile((prev) => prev || {
            firstName: nameParts[0] || "Admin",
            lastName: nameParts.slice(1).join(" ") || "",
            role: parsed.role || "System Administrator",
            department: "College of Technology (COT)",
            officeLocation: "Admin Building, Room 204",
          });
        } else {
          setLoadError("Couldn’t load profile data. Refresh to try again.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [admin?.id]);

  // Start editing form
  const handleEdit = () => {
    const p = profile || {};

    setForm({
      firstName: p.firstName || "",
      middleName: p.middleName || "",
      lastName: p.lastName || "",
      gender: p.gender || "",
      civilStatus: p.civilStatus || "",
      birthdate: p.birthdate
        ? new Date(p.birthdate).toISOString().split("T")[0]
        : "",
      contactNumber: p.contactNumber || "",
      alternateEmail: p.alternateEmail || "",
      officeLocation: p.officeLocation || "",
      department: p.department || "",
      role: p.role || "System Administrator",
      photoUrl: isCustomPhotoUrl(p.photoUrl, admin?.googlePhotoUrl) ? p.photoUrl : "",
    });

    setSaveError("");
    setSaveSuccess("");
    setIsEditing(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setSaveError("");
      const dataUrl = await resizeProfileImage(file);
      setForm((prev) => ({ ...prev, photoUrl: dataUrl }));
    } catch (err) {
      setSaveError(err.message || "Failed to process profile photo.");
    }
  };

  const handleDeletePhoto = () => {
    setForm((prev) => ({ ...prev, photoUrl: "" }));
  };

  // Normal input handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Save profile to server & local state
  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch("/api/profile/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          gender: form.gender,
          civilStatus: form.civilStatus,
          birthdate: form.birthdate || null,
          contactNumber: form.contactNumber,
          alternateEmail: form.alternateEmail,
          officeLocation: form.officeLocation,
          department: form.department,
          role: form.role,
          photoUrl: form.photoUrl ?? "",
        }),
      });

      let data = {};
      if (response.ok) {
        data = await response.json();
      }

      const updatedProfile = data.profile || {
        ...profile,
        ...form,
      };

      setProfile(updatedProfile);

      const updatedFullName = [
        form.firstName,
        form.middleName,
        form.lastName,
      ]
        .filter(Boolean)
        .join(" ");

      setAdmin((prev) => ({
        ...prev,
        fullName: updatedFullName || prev?.fullName,
        googlePhotoUrl: data.googlePhotoUrl || prev?.googlePhotoUrl,
        profile: updatedProfile,
      }));

      // Update localStorage
      const storageKey = localStorage.getItem("admin") ? "admin" : "user";
      const storedAdmin = localStorage.getItem(storageKey);

      if (storedAdmin) {
        const parsedAdmin = JSON.parse(storedAdmin);
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            ...parsedAdmin,
            fullName: updatedFullName || parsedAdmin.fullName,
            googlePhotoUrl: data.googlePhotoUrl || parsedAdmin.googlePhotoUrl,
            profile: updatedProfile,
          })
        );
      }

      // Notify TopBar header to refresh displayed name
      window.dispatchEvent(new Event("admin-updated"));

      setSaveSuccess("Profile updated successfully.");
      setIsEditing(false);
    } catch (error) {
      console.error("Save profile error:", error);
      setSaveError(error.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    setSaveError("");
    setSaveSuccess("");
  };

  if (loading) {
    return <p className="text-sm text-gray-400 p-6">Loading profile…</p>;
  }

  const p = profile || {};
  const currentAdmin = admin || { fullName: "Admin User", email: "admin@cot.edu.ph" };
  const activePhotoUrl = isEditing ? form.photoUrl : p.photoUrl;
  const hasCustomPhoto = isCustomPhotoUrl(activePhotoUrl, currentAdmin.googlePhotoUrl);
  const avatarUrl = resolveAvatarUrl(activePhotoUrl, currentAdmin.googlePhotoUrl || currentAdmin.photoUrl);

  return (
    <div className={embedded ? "space-y-6" : "space-y-6 max-w-6xl mx-auto p-2 sm:p-6"}>
      {/* PAGE HEADER */}
      {!embedded && (
        <div>
          <h1 className="text-xl font-bold text-brand-purple sm:text-2xl">
            Profile
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            View and manage your administrator profile and contact details.
          </p>
        </div>
      )}

      {/* PROFILE HEADER CARD */}
      <div className="bg-white rounded-2xl shadow p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full object-cover border-2 border-orange-500"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-orange-500 text-white flex items-center justify-center text-2xl font-semibold">
              {getInitials(currentAdmin.fullName || "Admin")}
            </div>
          )}

          <div>
            <p className="text-lg font-bold text-gray-800">
              {currentAdmin.fullName || "Admin User"}
            </p>
            <p className="text-gray-500 text-sm">
              {currentAdmin.email || "admin@cot.edu.ph"}
            </p>
            {currentAdmin.id && (
              <p className="text-gray-400 text-xs">id: {currentAdmin.id}</p>
            )}

            {isEditing && (
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold hover:bg-orange-100 transition cursor-pointer">
                  <Camera size={14} />
                  <span>{hasCustomPhoto ? "Change Photo" : "Upload Photo"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {hasCustomPhoto && (
                  <button
                    type="button"
                    onClick={handleDeletePhoto}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-semibold hover:bg-red-100 transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Delete Photo</span>
                  </button>
                )}

                {!hasCustomPhoto && currentAdmin.googlePhotoUrl && (
                  <span className="text-[11px] text-gray-400">
                    Using Gmail photo by default
                  </span>
                )}
              </div>
            )}

            {loadError && (
              <p className="text-red-500 text-xs mt-1">{loadError}</p>
            )}
            {saveSuccess && (
              <p className="text-green-600 text-xs font-semibold mt-1">
                {saveSuccess}
              </p>
            )}
          </div>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition"
          >
            <Pencil size={16} />
            Edit Profile
          </button>
        )}
      </div>

      {/* BASIC INFORMATION SECTION */}
      <Section title="Basic Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isEditing ? (
            <>
              {/* First Name */}
              <div>
                <label className="text-sm font-medium text-gray-500">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Middle Name */}
              <div>
                <label className="text-sm font-medium text-gray-500">Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={form.middleName}
                  onChange={handleChange}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="text-sm font-medium text-gray-500">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="text-sm font-medium text-gray-500">Gender</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              {/* Civil Status */}
              <div>
                <label className="text-sm font-medium text-gray-500">Civil Status</label>
                <select
                  name="civilStatus"
                  value={form.civilStatus}
                  onChange={handleChange}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Civil Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Separated">Separated</option>
                </select>
              </div>

              {/* Birthdate */}
              <div>
                <label className="text-sm font-medium text-gray-500">Birthdate</label>
                <input
                  type="date"
                  name="birthdate"
                  value={form.birthdate}
                  onChange={handleChange}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </>
          ) : (
            <>
              <Info label="First Name" value={p.firstName} />
              <Info label="Middle Name" value={p.middleName} />
              <Info label="Last Name" value={p.lastName} />
              <Info label="Gender" value={p.gender} />
              <Info label="Civil Status" value={p.civilStatus} />
              <Info label="Birthdate" value={formatDate(p.birthdate)} />
            </>
          )}
        </div>
      </Section>

      {/* CONTACT & ADMINISTRATIVE DETAILS SECTION */}
      <Section title="Contact & Administrative Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isEditing ? (
            <>
              {/* Contact Number */}
              <div>
                <label className="text-sm font-medium text-gray-500">Contact Number</label>
                <input
                  type="text"
                  name="contactNumber"
                  value={form.contactNumber}
                  onChange={handleChange}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Alternate Email */}
              <div>
                <label className="text-sm font-medium text-gray-500">Alternate Email</label>
                <input
                  type="email"
                  name="alternateEmail"
                  value={form.alternateEmail}
                  onChange={handleChange}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Role / Title */}
              <div>
                <label className="text-sm font-medium text-gray-500">Role Title</label>
                <input
                  type="text"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Department */}
              <div>
                <label className="text-sm font-medium text-gray-500">Department / Office</label>
                <input
                  type="text"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Office Location */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-500">Office Location</label>
                <input
                  type="text"
                  name="officeLocation"
                  value={form.officeLocation}
                  onChange={handleChange}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </>
          ) : (
            <>
              <Info label="Contact Number" value={p.contactNumber} />
              <Info label="Alternate Email" value={p.alternateEmail} />
              <Info label="Role Title" value={p.role || "System Administrator"} />
              <Info label="Department / Office" value={p.department || "College of Technology (COT)"} />
              <Info label="Office Location" value={p.officeLocation} className="md:col-span-2" />
            </>
          )}
        </div>
      </Section>

      {/* SAVE / CANCEL ACTION BUTTONS */}
      {isEditing && (
        <div className="bg-white rounded-2xl shadow p-6">
          {saveError && (
            <p className="text-red-500 text-sm mb-4">{saveError}</p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 transition"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}