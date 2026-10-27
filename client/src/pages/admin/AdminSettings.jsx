import { useState, useEffect } from "react";
import axios from "axios";
import {
  Mail,
  ShieldCheck,
  HardDrive,
  KeyRound,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Database,
  FileText,
  Trash2,
  ChevronDown,
  Lock,
  Edit3,
  X,
  Check,
} from "lucide-react";

import gmailIcon from "../../assets/Gmail_icon_(2020).svg";
import recaptchaIcon from "../../assets/ReCAPTCHA_icon.svg";
import driveIcon from "../../assets/Google_Drive_icon_(2026).svg";
import googleIcon from "../../assets/Google_Favicon_2025.svg";

const API_URL = "http://localhost:5000/api/settings";

/* ─── Toggle definitions ─────────────────────────────────────── */
const APIS = [
  {
    key: "googleMailEnabled",
    title: "Google Mail (SMTP)",
    description: "Sends invitation links, password reset emails, and notifications.",
    logo: gmailIcon,
  },
  {
    key: "recaptchaEnabled",
    title: "Google reCAPTCHA v2",
    description: "Protects the login page from bots and brute-force attacks.",
    logo: recaptchaIcon,
  },
  {
    key: "googleDriveEnabled",
    title: "Google Drive Storage",
    description: "Stores uploaded portfolio documents in Google Drive.",
    logo: driveIcon,
  },
  {
    key: "googleAuthEnabled",
    title: "Google Sign-In (OAuth 2.0)",
    description: "Allows login via institutional Google accounts.",
    logo: googleIcon,
  },
];

/* ─── Credential group definitions ───────────────────────────── */
const CREDENTIAL_GROUPS = [
  {
    groupKey: "googleMail",
    label: "Google Mail (Nodemailer / SMTP)",
    description: "Used for institutional communications and verification emails.",
    icon: Mail,
    color: "blue",
    fields: [
      {
        key: "emailUser",
        label: "Gmail Address",
        sensitive: false,
        placeholder: "institutional-email@gmail.com",
        help: "The sender Gmail account used by the application.",
      },
      {
        key: "emailPass",
        label: "Gmail App Password",
        sensitive: true,
        placeholder: "16-character app password",
        help: "Generate an App Password from your Google Account (Security → 2-Step Verification → App Passwords).",
      },
    ],
  },
  {
    groupKey: "googleDrive",
    label: "Google Drive Storage API",
    description: "Cloud storage for instructor portfolio documents and assets.",
    icon: HardDrive,
    color: "amber",
    fields: [
      {
        key: "googleDriveClientId",
        label: "OAuth Client ID",
        sensitive: false,
        placeholder: "xxxxxx.apps.googleusercontent.com",
      },
      {
        key: "googleDriveClientSecret",
        label: "Client Secret",
        sensitive: true,
        placeholder: "GOCSPX-…",
      },
      {
        key: "googleDriveRefreshToken",
        label: "Refresh Token",
        sensitive: true,
        placeholder: "1//0g…",
      },
      {
        key: "googleDriveRootFolderId",
        label: "Root Folder ID",
        sensitive: false,
        placeholder: "Google Drive folder ID string",
        help: "The folder ID where all portfolio uploads will be saved.",
      },
    ],
  },
  {
    groupKey: "googleAuth",
    label: "Google Sign-In (OAuth 2.0)",
    description: "Single sign-on authentication for university Google accounts.",
    icon: KeyRound,
    color: "purple",
    fields: [
      {
        key: "googleClientId",
        label: "OAuth Client ID",
        sensitive: false,
        placeholder: "xxxxxx.apps.googleusercontent.com",
        help: "Google Cloud OAuth 2.0 Web Client ID.",
      },
    ],
  },
  {
    groupKey: "recaptcha",
    label: "Google reCAPTCHA v2",
    description: "Bot prevention for login and registration forms.",
    icon: ShieldCheck,
    color: "emerald",
    fields: [
      {
        key: "recaptchaSiteKey",
        label: "Site Key (Public)",
        sensitive: false,
        placeholder: "6L…",
        help: "Client-side public key embedded in the login form.",
      },
      {
        key: "recaptchaSecret",
        label: "Secret Key",
        sensitive: true,
        placeholder: "6L… (server-side secret)",
        help: "Server-side secret key used to verify captcha tokens.",
      },
    ],
  },
];

const MASK = "••••••••••••••••";

const colorStyles = {
  blue: {
    bg: "bg-blue-50 text-blue-600 border-blue-200",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  amber: {
    bg: "bg-amber-50 text-amber-600 border-amber-200",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  purple: {
    bg: "bg-purple-50 text-purple-600 border-purple-200",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
  },
  emerald: {
    bg: "bg-emerald-50 text-emerald-600 border-emerald-200",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    googleMailEnabled: true,
    recaptchaEnabled: true,
    googleDriveEnabled: true,
    googleAuthEnabled: true,
  });

  const [credentials, setCredentials] = useState({});
  const [initialCredentials, setInitialCredentials] = useState({});
  const [credentialStatus, setCredentialStatus] = useState({});
  const [unmaskedCredentials, setUnmaskedCredentials] = useState({});

  const [loading, setLoading] = useState(true);
  const [globalSaving, setGlobalSaving] = useState(false);
  const [globalFeedback, setGlobalFeedback] = useState({ type: "", message: "" });

  // Accordion & Edit State
  const [openGroup, setOpenGroup] = useState(null); // Accordion toggle (one open at a time, or null)
  const [editingGroup, setEditingGroup] = useState(null); // Currently editing groupKey
  const [groupSaving, setGroupSaving] = useState({}); // { [groupKey]: boolean }
  const [groupFeedback, setGroupFeedback] = useState({}); // { [groupKey]: { type, message } }

  // Security Verification State
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState("");
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { groupKey, action: 'reveal' | 'edit', fieldKey?: string }
  const [revealedFields, setRevealedFields] = useState({}); // { [fieldKey]: boolean }

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setGlobalFeedback({ type: "", message: "" });
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.settings) setSettings(res.data.settings);
      if (res.data?.credentials) {
        setCredentials(res.data.credentials);
        setInitialCredentials(res.data.credentials);
      }
      if (res.data?.credentialStatus) setCredentialStatus(res.data.credentialStatus);
    } catch (err) {
      setGlobalFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to load current settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ─── Toggle handler ─────────────────────────────────────────── */
  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    if (globalFeedback.message) setGlobalFeedback({ type: "", message: "" });
  };

  /* ─── Global Save (Toggles) ──────────────────────────────────── */
  const handleGlobalSave = async () => {
    setGlobalSaving(true);
    setGlobalFeedback({ type: "", message: "" });
    try {
      await axios.put(
        API_URL,
        { settings },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGlobalFeedback({
        type: "success",
        message: "System toggles saved successfully!",
      });
    } catch (err) {
      setGlobalFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to save settings.",
      });
    } finally {
      setGlobalSaving(false);
    }
  };

  /* ─── Accordion Toggle ───────────────────────────────────────── */
  const toggleAccordion = (groupKey) => {
    setOpenGroup((prev) => (prev === groupKey ? null : groupKey));
  };

  /* ─── Password Verification Modal Trigger ────────────────────── */
  const requestSecurityVerification = (actionPayload) => {
    if (isPasswordVerified) {
      executeAction(actionPayload);
    } else {
      setPendingAction(actionPayload);
      setVerifyPassword("");
      setVerifyError("");
      setShowVerifyModal(true);
    }
  };

  const handleVerifySubmit = async (e) => {
    e?.preventDefault();
    if (!verifyPassword.trim()) {
      setVerifyError("Please enter your administrator password.");
      return;
    }

    setVerifying(true);
    setVerifyError("");
    try {
      const res = await axios.post(
        `${API_URL}/verify-password`,
        { password: verifyPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        setIsPasswordVerified(true);
        if (res.data.unmaskedCredentials) {
          setUnmaskedCredentials(res.data.unmaskedCredentials);
        }
        setShowVerifyModal(false);

        if (pendingAction) {
          executeAction(pendingAction, res.data.unmaskedCredentials);
          setPendingAction(null);
        }
      }
    } catch (err) {
      setVerifyError(
        err.response?.data?.message || "Incorrect password. Please try again."
      );
    } finally {
      setVerifying(false);
    }
  };

  const executeAction = (actionPayload, unmasked = unmaskedCredentials) => {
    const { action, groupKey, fieldKey } = actionPayload;

    if (action === "reveal" && fieldKey) {
      setRevealedFields((prev) => ({
        ...prev,
        [fieldKey]: !prev[fieldKey],
      }));
    } else if (action === "edit" && groupKey) {
      setEditingGroup(groupKey);
      // Ensure the accordion is open when editing
      setOpenGroup(groupKey);

      // Populate editable credentials with unmasked values if available
      if (unmasked) {
        const group = CREDENTIAL_GROUPS.find((g) => g.groupKey === groupKey);
        if (group) {
          setCredentials((prev) => {
            const next = { ...prev };
            group.fields.forEach((f) => {
              if (f.sensitive && unmasked[f.key] !== undefined) {
                next[f.key] = unmasked[f.key];
              }
            });
            return next;
          });
        }
      }
    }
  };

  /* ─── Credential Form Handlers ───────────────────────────────── */
  const handleCredentialChange = (key, value) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearField = (key) => {
    setCredentials((prev) => ({ ...prev, [key]: "" }));
  };

  const handleCancelEdit = (groupKey) => {
    const group = CREDENTIAL_GROUPS.find((g) => g.groupKey === groupKey);
    if (group) {
      setCredentials((prev) => {
        const next = { ...prev };
        group.fields.forEach((f) => {
          next[f.key] = initialCredentials[f.key] ?? "";
        });
        return next;
      });
    }
    setEditingGroup(null);
    setGroupFeedback((prev) => ({ ...prev, [groupKey]: null }));
  };

  /* ─── Per-card Save Handler ──────────────────────────────────── */
  const handleSaveGroup = async (group) => {
    const groupKey = group.groupKey;
    setGroupSaving((prev) => ({ ...prev, [groupKey]: true }));
    setGroupFeedback((prev) => ({ ...prev, [groupKey]: null }));

    // Prepare credentials payload strictly for this group's fields
    const groupPayload = {};
    group.fields.forEach((f) => {
      const val = credentials[f.key];
      // If unchanged masked placeholder, don't overwrite server secret
      if (f.sensitive && val === MASK) {
        groupPayload[f.key] = MASK;
      } else {
        groupPayload[f.key] = val !== undefined ? val : "";
      }
    });

    try {
      await axios.put(
        API_URL,
        { credentials: groupPayload },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGroupFeedback((prev) => ({
        ...prev,
        [groupKey]: {
          type: "success",
          message: `${group.label} credentials saved successfully!`,
        },
      }));

      // Refresh settings to update credential status badges
      const refreshRes = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refreshRes.data?.credentialStatus) {
        setCredentialStatus(refreshRes.data.credentialStatus);
      }
      if (refreshRes.data?.credentials) {
        setInitialCredentials(refreshRes.data.credentials);
      }

      setEditingGroup(null);
    } catch (err) {
      setGroupFeedback((prev) => ({
        ...prev,
        [groupKey]: {
          type: "error",
          message: err.response?.data?.message || "Failed to save credentials.",
        },
      }));
    } finally {
      setGroupSaving((prev) => ({ ...prev, [groupKey]: false }));
    }
  };

  /* ─── Group Status Summary Helper ────────────────────────────── */
  const getGroupSummary = (group) => {
    let configuredCount = 0;
    let hasDatabaseKey = false;

    group.fields.forEach((f) => {
      const status = credentialStatus[f.key];
      if (status?.isConfigured) configuredCount++;
      if (status?.source?.startsWith("Database")) hasDatabaseKey = true;
    });

    const total = group.fields.length;
    if (configuredCount === total) {
      return {
        label: hasDatabaseKey ? "Institutional (DB)" : "Configured (.env)",
        tone: hasDatabaseKey ? "violet" : "slate",
        isReady: true,
      };
    }
    if (configuredCount > 0) {
      return {
        label: `${configuredCount}/${total} Set`,
        tone: "amber",
        isReady: false,
      };
    }
    return {
      label: "Not Set",
      tone: "red",
      isReady: false,
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-orange" />
        <p className="text-sm text-gray-500">Loading system settings…</p>
      </div>
    );
  }

  return (


    <div className="bg-white rounded-3xl pt-8 pr-8 pl-8">

      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Page Header */}
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-brand-purple tracking-tight">
            API &amp; Integration Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage system feature toggles and configure institutional API credentials stored securely in the database.
          </p>
        </div>

        {/* Global Alert */}
        {globalFeedback.message && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border transition-all ${globalFeedback.type === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : "bg-red-50 text-red-800 border-red-200"
              }`}
          >
            {globalFeedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{globalFeedback.message}</span>
          </div>
        )}

        {/* Two-column layout */}
        {/* <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start"> */}

        <div className="grid grid-cols-1 gap-6 items-start">
          {/* ── LEFT COLUMN: Feature Toggles ──────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              {/* <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                API Feature Toggles
              </h2> */}
              {/* <span className="text-xs text-gray-400">Controls service availability</span> */}
            </div>

            {APIS.map((api) => {
              const isEnabled = settings[api.key];
              return (
                <div
                  key={api.key}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 gap-4 ${isEnabled
                    ? "bg-white border-gray-100 shadow-xs hover:border-gray-300"
                    : "bg-gray-50 border-gray-200 opacity-70"
                    }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-lg shrink-0 transition-colors ${isEnabled
                        ? "bg-gray-50 "
                        : "bg-gray-100"
                        }`}
                    >
                      <img
                        src={api.logo}
                        alt=""
                        className={`h-7 w-7 object-contain transition ${isEnabled ? "" : "grayscale opacity-60"
                          }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {api.title}
                        </h3>
                        {/* <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${isEnabled
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}
                      >
                        {isEnabled ? "Enabled" : "Disabled"}
                      </span> */}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {api.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    onClick={() => handleToggle(api.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-orange/30 ${isEnabled ? "bg-brand-orange" : "bg-gray-300"
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>
              );
            })}

            {/* Save Toggles Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleGlobalSave}
                disabled={globalSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-orange text-white text-sm font-medium hover:bg-orange-600 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {globalSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {globalSaving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </section>

          {/* ── RIGHT COLUMN: API Credentials Accordion Cards ─────── */}
          <section className="hidden space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                API Credentials &amp; Keys
              </h2>

            </div>

            <div className="space-y-3">
              {CREDENTIAL_GROUPS.map((group) => {
                const Icon = group.icon;
                const isOpen = openGroup === group.groupKey;
                const isEditing = editingGroup === group.groupKey;
                const isSaving = groupSaving[group.groupKey];
                const feedback = groupFeedback[group.groupKey];
                const summary = getGroupSummary(group);

                return (
                  <div
                    key={group.groupKey}
                    className="bg-white border border-gray-200 rounded-xl shadow-xs transition-all duration-200 overflow-hidden"
                  >
                    {/* Accordion Header */}
                    <div
                      onClick={() => toggleAccordion(group.groupKey)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/70 select-none transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2.5 rounded-lg shrink-0 ${colorStyles[group.color]?.bg || "bg-gray-100 text-gray-600"
                            }`}
                        >
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {group.label}
                            </h3>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${summary.tone === "violet"
                                ? "bg-violet-50 text-violet-700 border-violet-200"
                                : summary.tone === "slate"
                                  ? "bg-slate-50 text-slate-600 border-slate-200"
                                  : summary.tone === "amber"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-red-50 text-red-600 border-red-200"
                                }`}
                            >
                              {summary.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {group.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div
                          className={`transform transition-transform duration-200 text-gray-400 p-1 rounded-md hover:bg-gray-100 ${isOpen ? "rotate-180 text-gray-600" : ""
                            }`}
                        >
                          <ChevronDown size={18} />
                        </div>
                      </div>
                    </div>

                    {/* Accordion Content */}
                    {isOpen && (
                      <div className="border-t border-gray-100 bg-gray-50/40 p-4 space-y-4">
                        {/* Inline feedback if any */}
                        {feedback && (
                          <div
                            className={`flex items-center gap-2 p-3 rounded-lg text-xs font-medium border ${feedback.type === "success"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                              }`}
                          >
                            {feedback.type === "success" ? (
                              <CheckCircle2 size={14} className="shrink-0 text-green-600" />
                            ) : (
                              <AlertCircle size={14} className="shrink-0 text-red-600" />
                            )}
                            <span>{feedback.message}</span>
                          </div>
                        )}

                        {/* Fields List */}
                        <div className="space-y-3.5">
                          {group.fields.map((field) => {
                            const status = credentialStatus[field.key];
                            const isConfigured = status?.isConfigured;
                            const sourceLabel = status?.source || "Not Set";
                            const isFromDB = sourceLabel.startsWith("Database");

                            const currentValue = credentials[field.key] ?? "";
                            const isMaskedValue =
                              field.sensitive &&
                              (currentValue === MASK || currentValue === "");
                            const isRevealed = revealedFields[field.key];
                            const unmaskedVal = unmaskedCredentials[field.key];

                            // In read-only mode, what text do we display?
                            let displayValue = "";
                            if (!isConfigured) {
                              displayValue = "Not configured";
                            } else if (!field.sensitive) {
                              displayValue = currentValue || unmaskedVal || "Configured in system";
                            } else {
                              // Sensitive field
                              if (isRevealed && unmaskedVal) {
                                displayValue = unmaskedVal;
                              } else {
                                displayValue = MASK;
                              }
                            }

                            return (
                              <div
                                key={field.key}
                                className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-2xs space-y-1.5"
                              >
                                {/* Label & Status Badge */}
                                <div className="flex items-center justify-between gap-2">
                                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                    <span>{field.label}</span>
                                    {field.sensitive && (
                                      <Lock size={11} className="text-gray-400" />
                                    )}
                                  </label>
                                  {isConfigured ? (
                                    <span
                                      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${isFromDB
                                        ? "bg-violet-50 text-violet-700 border-violet-200"
                                        : "bg-slate-50 text-slate-600 border-slate-200"
                                        }`}
                                    >
                                      {isFromDB ? (
                                        <Database size={9} />
                                      ) : (
                                        <FileText size={9} />
                                      )}
                                      {sourceLabel}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-200">
                                      Not Set
                                    </span>
                                  )}
                                </div>

                                {/* Input or Read-Only Display */}
                                {isEditing ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="relative flex-1">
                                      <input
                                        type={
                                          field.sensitive && !isRevealed
                                            ? "password"
                                            : "text"
                                        }
                                        value={currentValue}
                                        onChange={(e) =>
                                          handleCredentialChange(
                                            field.key,
                                            e.target.value
                                          )
                                        }
                                        placeholder={field.placeholder}
                                        autoComplete="off"
                                        className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition-all pr-8"
                                      />
                                      {field.sensitive && (
                                        <button
                                          type="button"
                                          title={
                                            isRevealed
                                              ? "Hide sensitive value"
                                              : "Reveal value"
                                          }
                                          onClick={() =>
                                            setRevealedFields((prev) => ({
                                              ...prev,
                                              [field.key]: !prev[field.key],
                                            }))
                                          }
                                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                        >
                                          {isRevealed ? (
                                            <EyeOff size={13} />
                                          ) : (
                                            <Eye size={13} />
                                          )}
                                        </button>
                                      )}
                                    </div>

                                    {/* Clear Button if customized in DB */}
                                    {isFromDB && (
                                      <button
                                        type="button"
                                        title="Clear from database (revert to .env)"
                                        onClick={() => handleClearField(field.key)}
                                        className="p-2 rounded-lg border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  /* Read-Only View */
                                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                                    <span
                                      className={`text-xs font-mono truncate select-all ${!isConfigured
                                        ? "text-gray-400 italic"
                                        : "text-gray-800"
                                        }`}
                                    >
                                      {displayValue}
                                    </span>

                                    {field.sensitive && isConfigured && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          requestSecurityVerification({
                                            groupKey: group.groupKey,
                                            action: "reveal",
                                            fieldKey: field.key,
                                          })
                                        }
                                        className="flex items-center gap-1 text-[11px] font-medium text-gray-600 hover:text-brand-purple bg-white px-2 py-1 rounded border border-gray-200 hover:border-gray-300 transition-all shrink-0 cursor-pointer shadow-2xs"
                                      >
                                        {isRevealed ? (
                                          <>
                                            <EyeOff size={12} />
                                            <span>Hide</span>
                                          </>
                                        ) : (
                                          <>
                                            <Eye size={12} />
                                            <span>Reveal</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {field.help && (
                                  <p className="text-[11px] text-gray-400 leading-tight">
                                    {field.help}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Card Action Controls */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCancelEdit(group.groupKey)}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                              >
                                <X size={13} />
                                <span>Cancel</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveGroup(group)}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-orange text-white text-xs font-medium hover:bg-orange-600 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                              >
                                {isSaving ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check size={13} />
                                )}
                                <span>{isSaving ? "Saving…" : "Save Changes"}</span>
                              </button>
                            </>
                          ) : (
                            <div className="ml-auto">
                              <button
                                type="button"
                                onClick={() =>
                                  requestSecurityVerification({
                                    groupKey: group.groupKey,
                                    action: "edit",
                                  })
                                }
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shadow-2xs"
                              >
                                <Edit3 size={12} className="text-gray-500" />
                                <span>Edit Credentials</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>



        </div>
      </div>

      {/* ── Security Password Verification Modal ──────────────── */}
      {
        showVerifyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-violet-50 text-violet-700 border border-violet-100">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Administrator Verification
                    </h3>
                    <p className="text-xs text-gray-500">Security confirmation required</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowVerifyModal(false);
                    setPendingAction(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleVerifySubmit} className="p-6 space-y-4">
                <p className="text-xs text-gray-600 leading-relaxed">
                  To view or edit sensitive institutional API credentials, please enter your administrator password.
                </p>

                {verifyError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                    <AlertCircle size={14} className="shrink-0 text-red-600" />
                    <span>{verifyError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Administrator Password
                  </label>
                  <div className="relative">
                    <input
                      type={showModalPassword ? "text" : "password"}
                      value={verifyPassword}
                      onChange={(e) => setVerifyPassword(e.target.value)}
                      placeholder="Enter your login password"
                      autoFocus
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition-all pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showModalPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVerifyModal(false);
                      setPendingAction(null);
                    }}
                    disabled={verifying}
                    className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={verifying}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-brand-purple text-white text-xs font-medium hover:bg-purple-900 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {verifying ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>{verifying ? "Verifying…" : "Confirm & Unlock"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >


  );
}
