import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";

// Academic ranks shown in the "Academic Rank" dropdown (same list as the Instructor model)
const RANKS = [
  "Instructor I", "Instructor II", "Instructor III",
  "Assistant Professor I", "Assistant Professor II", "Assistant Professor III", "Assistant Professor IV",
  "Associate Professor I", "Associate Professor II", "Associate Professor III", "Associate Professor IV", "Associate Professor V",
  "Professor I", "Professor II", "Professor III", "Professor IV", "Professor V", "Professor VI",
];

// Academic / Administrative positions shown in the "Position" dropdown
const POSITIONS = [
  "Faculty Member",
  "Full-Time Faculty",
  "Part-Time Faculty",
  "Department Chairperson",
  "Program Head",
  "College Dean",
  "Associate Dean",
  "College Secretary",
  "Research Coordinator",
  "Extension Coordinator",
  "OJT / Practicum Coordinator",
  "Quality Assurance Officer",
  "Laboratory In-Charge",
  "Visiting Lecturer",
];

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

function Profile() {
  const navigate = useNavigate();

  const [instructor, setInstructor] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  // Check login
  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("instructor");

    if (!token || !stored) {
      navigate("/login");
      return;
    }

    setInstructor(JSON.parse(stored));
  }, [navigate]);

  // Load profile
  useEffect(() => {
    if (!instructor) return;

    fetch("/api/profile/me", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then(async (res) => {
        fetch
        if (!res.ok) {
          throw new Error("Failed to load profile.");
        }

        return res.json();
      })
      .then((me) => {
        const prof = me.profile || {};
        setProfile(prof);

        const computed = [prof.firstName, prof.middleName, prof.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();
        const activeName = computed || me.fullName;

        if (activeName) {
          setInstructor((prev) => ({
            ...prev,
            fullName: activeName,
          }));

          const stored = localStorage.getItem('instructor');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed.fullName !== activeName) {
                localStorage.setItem(
                  'instructor',
                  JSON.stringify({ ...parsed, fullName: activeName })
                );
                window.dispatchEvent(new Event('instructor-updated'));
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      })
      .catch(() => {
        setLoadError(
          "Couldn’t load your profile. Refresh the page to try again."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [instructor?.id]);

  // Start editing
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
      address: p.address || "",

      education:
        p.education && p.education.length > 0
          ? p.education.map((ed) => ({
            level: ed.level || "",
            degree: ed.degree || "",
            school: ed.school || "",
            yearGraduated: ed.yearGraduated || "",
          }))
          : [],

      position: p.position || "",
      rank: p.rank || "",
    });

    setSaveError("");
    setSaveSuccess("");
    setIsEditing(true);
  };

  // Normal input change
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Education change
  const handleEducationChange = (index, field, value) => {
    setForm((prev) => {
      const updatedEducation = [...prev.education];

      updatedEducation[index] = {
        ...updatedEducation[index],
        [field]: value,
      };

      return {
        ...prev,
        education: updatedEducation,
      };
    });
  };

  // Add education
  const handleAddEducation = () => {
    setForm((prev) => ({
      ...prev,
      education: [
        ...(prev.education || []),
        {
          level: "",
          degree: "",
          school: "",
          yearGraduated: "",
        },
      ],
    }));
  };

  // Remove education
  const handleRemoveEducation = (index) => {
    setForm((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  // Save profile
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
          address: form.address,

          education: (form.education || []).map((ed) => ({
            level: ed.level,
            degree: ed.degree,
            school: ed.school,
            yearGraduated:
              ed.yearGraduated === ""
                ? undefined
                : Number(ed.yearGraduated),
          })),

          position: form.position,
          rank: form.rank,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to save your profile."
        );
      }

      // Update the displayed profile
      setProfile(data.profile || {});

      // Update displayed name
      const updatedFullName = [
        form.firstName,
        form.middleName,
        form.lastName,
      ]
        .filter(Boolean)
        .join(" ");

      setInstructor((prev) => ({
        ...prev,
        fullName: updatedFullName || prev.fullName,
      }));

      // Update localStorage instructor information
      const storedInstructor = localStorage.getItem("instructor");

      if (storedInstructor) {
        const parsedInstructor = JSON.parse(storedInstructor);

        localStorage.setItem(
          "instructor",
          JSON.stringify({
            ...parsedInstructor,
            fullName: updatedFullName || parsedInstructor.fullName,
          })
        );
      }

      // Tell the top bar to show the new name
      window.dispatchEvent(new Event("instructor-updated"));

      setSaveSuccess("Profile updated successfully.");

      setIsEditing(false);
    } catch (error) {
      console.error("Save profile error:", error);

      setSaveError(
        error.message || "Failed to save your profile."
      );
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

  if (!instructor) return null;

  const p = profile || {};
  const education = p.education || [];

  const profileFullName = [p.firstName, p.middleName, p.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const displayName = profileFullName || instructor.fullName || 'Instructor';

  return (
    <div className="space-y-6">

      {/* PROFILE CARD */}
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
              {getInitials(displayName)}
            </div>
          )}

          <div>
            <p className="text-lg font-bold text-gray-800">
              {displayName}
            </p>

            <p className="text-gray-500 text-sm">
              {instructor.email}
            </p>

            <p className="text-gray-400 text-xs">
              id: {instructor.id}
            </p>

            {loadError && (
              <p className="text-red-500 text-xs mt-1">
                {loadError}
              </p>
            )}

            {saveSuccess && (
              <p className="text-green-600 text-xs mt-1">
                {saveSuccess}
              </p>
            )}
          </div>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600"
          >
            <Pencil size={16} />
            Edit Profile
          </button>
        )}

      </div>

      {loading ? (
        <p className="text-sm text-gray-400">
          Loading profile…
        </p>
      ) : (
        <>

          {/* BASIC INFORMATION */}
          <Section title="Basic Information">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {isEditing ? (
                <>
                  {/* First Name */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      First Name
                    </label>

                    <input
                      type="text"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      className="w-full mt-1 border rounded-lg px-3 py-2"
                    />
                  </div>

                  {/* Middle Name */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Middle Name
                    </label>

                    <input
                      type="text"
                      name="middleName"
                      value={form.middleName}
                      onChange={handleChange}
                      className="w-full mt-1 border rounded-lg px-3 py-2"
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Last Name
                    </label>

                    <input
                      type="text"
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      className="w-full mt-1 border rounded-lg px-3 py-2"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Gender
                    </label>

                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      className="w-full mt-1 border rounded-lg px-3 py-2"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  {/* Civil Status */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Civil Status
                    </label>

                    <select
                      name="civilStatus"
                      value={form.civilStatus}
                      onChange={handleChange}
                      className="w-full mt-1 border rounded-lg px-3 py-2"
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
                    <label className="text-sm font-medium text-gray-500">
                      Birthdate
                    </label>

                    <input
                      type="date"
                      name="birthdate"
                      value={form.birthdate}
                      onChange={handleChange}
                      className="w-full mt-1 border rounded-lg px-3 py-2"
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

          {/* CONTACT INFORMATION */}
          <Section title="Contact Information">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {isEditing ? (
                <>
                  {/* Contact Number */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Contact Number
                    </label>

                    <input
                      type="text"
                      name="contactNumber"
                      value={form.contactNumber}
                      onChange={handleChange}
                      className="w-full mt-1 border rounded-lg px-3 py-2"
                    />
                  </div>

                  {/* Alternate Email */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Alternate Email
                    </label>

                    <input
                      type="email"
                      name="alternateEmail"
                      value={form.alternateEmail}
                      onChange={handleChange}
                      className="w-full mt-1 border rounded-lg px-3 py-2"
                    />
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">
                      Address
                    </label>

                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      rows="3"
                      className="w-full mt-1 border rounded-lg px-3 py-2"
                    />
                  </div>
                </>
              ) : (
                <>
                  <Info label="Contact Number" value={p.contactNumber} />
                  <Info label="Alternate Email" value={p.alternateEmail} />
                  <Info label="Address" value={p.address} className="md:col-span-2" />
                </>
              )}

            </div>

          </Section>

          {/* EDUCATIONAL BACKGROUND */}
          <Section
            title="Educational Background"
            action={
              isEditing ? (
                <button
                  type="button"
                  onClick={handleAddEducation}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
                >
                  <Plus size={16} />
                  Add Education
                </button>
              ) : null
            }
          >

            {isEditing ? (

              form.education && form.education.length > 0 ? (

                <div className="space-y-4">

                  {form.education.map((ed, index) => (

                    <div
                      key={index}
                      className="border border-gray-200 rounded-xl p-4"
                    >

                      <div className="flex justify-between items-center mb-4">

                        <p className="font-semibold text-gray-700">
                          Education #{index + 1}
                        </p>

                        <button
                          type="button"
                          onClick={() => handleRemoveEducation(index)}
                          className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm"
                        >
                          <Trash2 size={16} />
                          Remove
                        </button>

                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Level */}
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Level
                          </label>

                          <select
                            value={ed.level}
                            onChange={(e) =>
                              handleEducationChange(index, "level", e.target.value)
                            }
                            className="w-full mt-1 border rounded-lg px-3 py-2"
                          >
                            <option value="">Select Level</option>
                            <option value="Bachelor's">Bachelor's</option>
                            <option value="Master's">Master's</option>
                            <option value="Doctorate">Doctorate</option>
                          </select>
                        </div>

                        {/* Degree */}
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Degree / Program
                          </label>

                          <input
                            type="text"
                            value={ed.degree}
                            onChange={(e) =>
                              handleEducationChange(index, "degree", e.target.value)
                            }
                            className="w-full mt-1 border rounded-lg px-3 py-2"
                          />
                        </div>

                        {/* School */}
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            School / University
                          </label>

                          <input
                            type="text"
                            value={ed.school}
                            onChange={(e) =>
                              handleEducationChange(index, "school", e.target.value)
                            }
                            className="w-full mt-1 border rounded-lg px-3 py-2"
                          />
                        </div>

                        {/* Year Graduated */}
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Year Graduated
                          </label>

                          <input
                            type="number"
                            value={ed.yearGraduated}
                            onChange={(e) =>
                              handleEducationChange(index, "yearGraduated", e.target.value)
                            }
                            className="w-full mt-1 border rounded-lg px-3 py-2"
                          />
                        </div>

                      </div>
                    </div>
                  ))}

                </div>

              ) : (

                <div className="text-center py-6">

                  <p className="text-sm text-gray-400 mb-3">
                    No educational background added yet.
                  </p>

                </div>
              )

            ) : education.length === 0 ? (

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

              {isEditing ? (
                <>
                  {/* Position */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Position
                    </label>

                    <select
                      name="position"
                      value={form.position}
                      onChange={handleChange}
                      className="w-full mt-1 border rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="">Select Position</option>
                      {POSITIONS.map((pos) => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Academic Rank */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Academic Rank
                    </label>

                    <select
                      name="rank"
                      value={form.rank}
                      onChange={handleChange}
                      className="w-full mt-1 border rounded-lg px-3 py-2"
                    >
                      <option value="">Select Academic Rank</option>
                      {RANKS.map((rank) => (
                        <option key={rank} value={rank}>
                          {rank}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <Info label="Position" value={p.position} />
                  <Info label="Academic Rank" value={p.rank} />
                </>
              )}

            </div>

          </Section>

          {/* SAVE / CANCEL */}
          {isEditing && (
            <div className="bg-white rounded-2xl shadow p-6">

              {saveError && (
                <p className="text-red-500 text-sm mb-4">
                  {saveError}
                </p>
              )}

              <div className="flex justify-end gap-3">

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}

export default Profile;
