import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Plus, Trash2 } from "lucide-react";
import InstructorHeader from "../../components/InstructorsHeader";
import InstructorSidebar from "../../components/InstructorsSidebar";

const RANKS = [
  "Instructor I",
  "Instructor II",
  "Instructor III",
  "Assistant Professor I",
  "Assistant Professor II",
  "Assistant Professor III",
  "Assistant Professor IV",
  "Associate Professor I",
  "Associate Professor II",
  "Associate Professor III",
  "Associate Professor IV",
  "Associate Professor V",
  "Professor I",
  "Professor II",
  "Professor III",
  "Professor IV",
  "Professor V",
  "Professor VI",
];

const emptyEducation = { level: "", degree: "", school: "", yearGraduated: "" };

const emptyForm = {
  // Basic information
  firstName: "",
  middleName: "",
  lastName: "",
  gender: "",
  civilStatus: "",
  birthdate: "",
  // Contact info (IN-008)
  contactNumber: "",
  alternateEmail: "",
  address: "",
  // Educational background (IN-008)
  education: [{ ...emptyEducation }],
  // Position / rank (IN-008)
  position: "",
  rank: "",
};

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 " +
  "focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 " +
  "disabled:bg-gray-50 disabled:text-gray-600 disabled:cursor-default";

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      {children}
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
  const fileInputRef = useRef(null);

  const [instructor, setInstructor] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [savedForm, setSavedForm] = useState(emptyForm); // restored on Cancel
  const [isEditing, setIsEditing] = useState(false);

  // Profile photo (IN-010)
  const [photoFile, setPhotoFile] = useState(null); // file to upload later
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("instructor");
    if (!token || !stored) {
      navigate("/login");
      return;
    }
    setInstructor(JSON.parse(stored));
  }, [navigate]);

  // Free the temporary preview URL when it changes or the page unmounts
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const updateEducation = (index, field, value) =>
    setForm({
      ...form,
      education: form.education.map((ed, i) => (i === index ? { ...ed, [field]: value } : ed)),
    });

  const addEducation = () =>
    setForm({ ...form, education: [...form.education, { ...emptyEducation }] });

  const removeEducation = (index) =>
    setForm({ ...form, education: form.education.filter((_, i) => i !== index) });

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setPhotoError("Use a JPG or PNG image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Image must be 2 MB or smaller.");
      return;
    }
    setPhotoError("");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleEdit = () => {
    setSavedForm(form);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setForm(savedForm);
    setPhotoFile(null);
    setPhotoPreview("");
    setPhotoError("");
    setIsEditing(false);
  };

  const handleSave = () => {
    // TODO: send `form` (and `photoFile`) to the backend
    setSavedForm(form);
    setIsEditing(false);
  };

  if (!instructor) return null;

  return (
  <div className="flex h-screen bg-gray-50">
    <InstructorSidebar />

    <div className="flex-1 flex flex-col min-w-0">
      <InstructorHeader instructor={instructor} />

        <main className="flex-1 overflow-y-auto p-8">
        <div className="space-y-6">
          {/* Profile card: photo, account details, edit / save actions */}
          <div className="bg-white rounded-2xl shadow p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-orange-500 text-white flex items-center justify-center text-2xl font-semibold">
                    {getInitials(instructor.fullName)}
                  </div>
                )}
                {isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Change profile photo"
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center text-gray-600 hover:text-orange-600"
                    >
                      <Camera size={16} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </>
                )}
              </div>

              <div>
                <p className="text-lg font-bold text-gray-800">{instructor.fullName}</p>
                <p className="text-gray-500 text-sm">{instructor.email}</p>
                <p className="text-gray-400 text-xs">id: {instructor.id}</p>
                {photoError && <p className="text-red-500 text-xs mt-1">{photoError}</p>}
              </div>
            </div>

            {isEditing ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600"
                >
                  Save changes
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleEdit}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
            )}
          </div>

          {/* Basic information */}
          <Section title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="First Name">
                <input name="firstName" value={form.firstName} onChange={handleChange} disabled={!isEditing} className={inputClass} placeholder="First name" />
              </Field>
              <Field label="Middle Name">
                <input name="middleName" value={form.middleName} onChange={handleChange} disabled={!isEditing} className={inputClass} placeholder="Middle name" />
              </Field>
              <Field label="Last Name">
                <input name="lastName" value={form.lastName} onChange={handleChange} disabled={!isEditing} className={inputClass} placeholder="Last name" />
              </Field>
              <Field label="Gender">
                <select name="gender" value={form.gender} onChange={handleChange} disabled={!isEditing} className={inputClass}>
                  <option value="">Select gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Prefer not to say</option>
                </select>
              </Field>
              <Field label="Civil Status">
                <select name="civilStatus" value={form.civilStatus} onChange={handleChange} disabled={!isEditing} className={inputClass}>
                  <option value="">Select civil status</option>
                  <option>Single</option>
                  <option>Married</option>
                  <option>Widowed</option>
                  <option>Separated</option>
                </select>
              </Field>
              <Field label="Birthdate">
                <input name="birthdate" type="date" value={form.birthdate} onChange={handleChange} disabled={!isEditing} className={inputClass} />
              </Field>
            </div>
          </Section>

          {/* Contact information */}
          <Section title="Contact Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Contact Number">
                <input name="contactNumber" type="tel" value={form.contactNumber} onChange={handleChange} disabled={!isEditing} className={inputClass} placeholder="09XX XXX XXXX" />
              </Field>
              <Field label="Alternate Email">
                <input name="alternateEmail" type="email" value={form.alternateEmail} onChange={handleChange} disabled={!isEditing} className={inputClass} placeholder="name@example.com" />
              </Field>
              <Field label="Address" className="md:col-span-2">
                <input name="address" value={form.address} onChange={handleChange} disabled={!isEditing} className={inputClass} placeholder="Street, Barangay, City, Province" />
              </Field>
            </div>
          </Section>

          {/* Educational background */}
          <Section
            title="Educational Background"
            action={
              isEditing && (
                <button
                  type="button"
                  onClick={addEducation}
                  className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  <Plus size={16} /> Add
                </button>
              )
            }
          >
            {form.education.length === 0 && (
              <p className="text-sm text-gray-400">
                No educational background yet. Select Edit, then Add to create an entry.
              </p>
            )}

            <div className="space-y-4">
              {form.education.map((ed, i) => (
                <div key={i} className="relative border border-gray-100 rounded-xl p-4 pr-10">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Field label="Level">
                      <select value={ed.level} onChange={(e) => updateEducation(i, "level", e.target.value)} disabled={!isEditing} className={inputClass}>
                        <option value="">Select level</option>
                        <option>Bachelor's</option>
                        <option>Master's</option>
                        <option>Doctorate</option>
                      </select>
                    </Field>
                    <Field label="Degree / Program">
                      <input value={ed.degree} onChange={(e) => updateEducation(i, "degree", e.target.value)} disabled={!isEditing} className={inputClass} placeholder="e.g. BS Information Technology" />
                    </Field>
                    <Field label="School / University">
                      <input value={ed.school} onChange={(e) => updateEducation(i, "school", e.target.value)} disabled={!isEditing} className={inputClass} placeholder="School name" />
                    </Field>
                    <Field label="Year Graduated">
                      <input value={ed.yearGraduated} onChange={(e) => updateEducation(i, "yearGraduated", e.target.value)} disabled={!isEditing} className={inputClass} placeholder="YYYY" maxLength={4} inputMode="numeric" />
                    </Field>
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => removeEducation(i)}
                      aria-label="Remove education entry"
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* Position / rank */}
          <Section title="Position / Rank">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Position">
                <input name="position" value={form.position} onChange={handleChange} disabled={!isEditing} className={inputClass} placeholder="e.g. Program Chair" />
              </Field>
              <Field label="Academic Rank">
                <select name="rank" value={form.rank} onChange={handleChange} disabled={!isEditing} className={inputClass}>
                  <option value="">Select rank</option>
                  {RANKS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>
        </div>
        </main>
      </div>
    </div>
  );
}

export default Profile;