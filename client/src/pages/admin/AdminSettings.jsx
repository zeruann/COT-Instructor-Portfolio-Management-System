import { useState, useEffect } from "react";
import axios from "axios";
import {
  Mail,
  ShieldCheck,
  HardDrive,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
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

/* ─── Integrated API & Credential Definitions ────────────────── */
const INTEGRATIONS = [
  {
    groupKey: "googleMail",
    toggleKey: "googleMailEnabled",
    title: "Google Mail (SMTP)",
    description: "Sends invitation links, password reset emails, and notifications.",
    logo: gmailIcon,
    icon: Mail,
    fields: [
      {
        key: "emailUser",
        label: "Gmail Address",
        sensitive: false,
        isEmail: true,
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
    toggleKey: "googleDriveEnabled",
    title: "Google Drive Storage",
    description: "Stores and organizes uploaded portfolio documents in Google Drive.",
    logo: driveIcon,
    icon: HardDrive,
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
    toggleKey: "googleAuthEnabled",
    title: "Google Sign-In (OAuth 2.0)",
    description: "Single sign-on authentication for university Google accounts.",
    logo: googleIcon,
    icon: KeyRound,
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
    toggleKey: "recaptchaEnabled",
    title: "Google reCAPTCHA v2",
    description: "Protects the login page from automated bots and brute-force attacks.",
    logo: recaptchaIcon,
    icon: ShieldCheck,
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

/**
 * Helper to censor email address (reveals some characters, hides the rest with bullets)
 */
function censorEmail(email) {
  if (!email || typeof email !== "string") return "";
  const atIndex = email.indexOf("@");
  if (atIndex === -1) {
    if (email.length <= 4) return "••••";
    return email.slice(0, 2) + "••••" + email.slice(-2);
  }
  const user = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  if (user.length <= 2) {
    return user[0] + "•" + domain;
  }
  if (user.length <= 4) {
    return user[0] + "••" + user.slice(-1) + domain;
  }
  const visibleStart = user.slice(0, 2);
  const visibleEnd = user.slice(-2);
  const maskedPart = "•".repeat(Math.min(user.length - 4, 5));
  return `${visibleStart}${maskedPart}${visibleEnd}${domain}`;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    googleMailEnabled: true,
    recaptchaEnabled: true,
    googleDriveEnabled: true,
    googleAuthEnabled: true,
  });

  // Credentials state for Custom and Default APIs
  const [customCredentials, setCustomCredentials] = useState({});
  const [defaultCredentials, setDefaultCredentials] = useState({});
  const [initialCustomCredentials, setInitialCustomCredentials] = useState({});
  const [initialDefaultCredentials, setInitialDefaultCredentials] = useState({});
  const [unmaskedCustomCredentials, setUnmaskedCustomCredentials] = useState({});
  const [unmaskedDefaultCredentials, setUnmaskedDefaultCredentials] = useState({});
  const [credentialStatus, setCredentialStatus] = useState({});
  const [allowDefaultEdit, setAllowDefaultEdit] = useState(false);

  const [loading, setLoading] = useState(true);
  const [globalFeedback, setGlobalFeedback] = useState({ type: "", message: "" });

  // Accordion & Edit State
  const [openGroup, setOpenGroup] = useState(null); // groupKey currently expanded
  const [editingGroup, setEditingGroup] = useState(null); // { groupKey, target: 'custom' | 'default' } | null
  const [groupSaving, setGroupSaving] = useState({}); // { [groupKey]: boolean }
  const [groupFeedback, setGroupFeedback] = useState({}); // { [groupKey]: { type, message } }

  // Security Verification State
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState("");
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // action object to execute once verified
  const [revealedFields, setRevealedFields] = useState({}); // { [compositeKey]: boolean }

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
      if (res.data?.customCredentials) {
        setCustomCredentials(res.data.customCredentials);
        setInitialCustomCredentials(res.data.customCredentials);
      }
      if (res.data?.defaultCredentials) {
        setDefaultCredentials(res.data.defaultCredentials);
        setInitialDefaultCredentials(res.data.defaultCredentials);
      }
      if (res.data?.credentialStatus) setCredentialStatus(res.data.credentialStatus);
      if (res.data?.allowDefaultEdit !== undefined) {
        setAllowDefaultEdit(res.data.allowDefaultEdit);
      }
    } catch (err) {
      setGlobalFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to load current settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ─── Toggle handler (Auto-saves toggle state smoothly) ──────── */
  const handleToggle = async (key, e) => {
    e?.stopPropagation?.();
    const nextVal = !settings[key];
    const newSettings = { ...settings, [key]: nextVal };
    setSettings(newSettings);
    setGlobalFeedback({ type: "", message: "" });
    try {
      await axios.put(
        API_URL,
        { settings: newSettings },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGlobalFeedback({
        type: "success",
        message: "API service status updated successfully!",
      });
    } catch (err) {
      setSettings((prev) => ({ ...prev, [key]: !nextVal }));
      setGlobalFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to update API status.",
      });
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
        if (res.data.unmaskedCustomCredentials) {
          setUnmaskedCustomCredentials(res.data.unmaskedCustomCredentials);
        }
        if (res.data.unmaskedDefaultCredentials) {
          setUnmaskedDefaultCredentials(res.data.unmaskedDefaultCredentials);
        }
        setShowVerifyModal(false);

        if (pendingAction) {
          executeAction(pendingAction, {
            custom: res.data.unmaskedCustomCredentials || {},
            default: res.data.unmaskedDefaultCredentials || {},
          });
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

  const executeAction = (actionPayload, unmaskedData = null) => {
    const { action, groupKey, target, fieldKey, rawKey } = actionPayload;

    if (action === "reveal" && fieldKey) {
      setRevealedFields((prev) => ({
        ...prev,
        [fieldKey]: !prev[fieldKey],
      }));
    } else if (action === "edit" && groupKey) {
      setEditingGroup({ groupKey, target: target || "custom" });
      setOpenGroup(groupKey);

      const group = INTEGRATIONS.find((g) => g.groupKey === groupKey);
      if (!group) return;

      const unmaskedCust = unmaskedData?.custom || unmaskedCustomCredentials;
      const unmaskedDef = unmaskedData?.default || unmaskedDefaultCredentials;

      if (target === "custom" && unmaskedCust) {
        setCustomCredentials((prev) => {
          const next = { ...prev };
          group.fields.forEach((f) => {
            if (f.sensitive && unmaskedCust[f.key] !== undefined) {
              next[f.key] = unmaskedCust[f.key];
            }
          });
          return next;
        });
      } else if (target === "default" && unmaskedDef) {
        setDefaultCredentials((prev) => {
          const next = { ...prev };
          group.fields.forEach((f) => {
            if (f.sensitive && unmaskedDef[f.key] !== undefined) {
              next[f.key] = unmaskedDef[f.key];
            }
          });
          return next;
        });
      }
    }
  };

  /* ─── Field Change Handlers ──────────────────────────────────── */
  const handleCustomChange = (key, value) => {
    setCustomCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const handleDefaultChange = (key, value) => {
    setDefaultCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const handleCancelEdit = (groupKey, target) => {
    const group = INTEGRATIONS.find((g) => g.groupKey === groupKey);
    if (group) {
      if (target === "custom") {
        setCustomCredentials((prev) => {
          const next = { ...prev };
          group.fields.forEach((f) => {
            next[f.key] = initialCustomCredentials[f.key] ?? "";
          });
          return next;
        });
      } else {
        setDefaultCredentials((prev) => {
          const next = { ...prev };
          group.fields.forEach((f) => {
            next[f.key] = initialDefaultCredentials[f.key] ?? "";
          });
          return next;
        });
      }
    }
    setEditingGroup(null);
    setGroupFeedback((prev) => ({ ...prev, [groupKey]: null }));
  };

  /* ─── Save Credentials Handler (Custom or Default) ───────────── */
  const handleSaveGroup = async (group, target) => {
    const groupKey = group.groupKey;
    setGroupSaving((prev) => ({ ...prev, [groupKey]: true }));
    setGroupFeedback((prev) => ({ ...prev, [groupKey]: null }));

    const payload = {};
    const sourceCredentials =
      target === "custom" ? customCredentials : defaultCredentials;

    group.fields.forEach((f) => {
      const val = sourceCredentials[f.key];
      if (f.sensitive && val === MASK) {
        payload[f.key] = MASK;
      } else {
        payload[f.key] = val !== undefined ? val : "";
      }
    });

    const body =
      target === "custom"
        ? { customCredentials: payload }
        : { defaultCredentials: payload };

    try {
      await axios.put(API_URL, body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setGroupFeedback((prev) => ({
        ...prev,
        [groupKey]: {
          type: "success",
          message: `${target === "custom" ? "Custom" : "Default"} ${group.title} credentials saved successfully!`,
        },
      }));

      // Refresh settings from server
      const refreshRes = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refreshRes.data) {
        if (refreshRes.data.customCredentials) {
          setCustomCredentials(refreshRes.data.customCredentials);
          setInitialCustomCredentials(refreshRes.data.customCredentials);
        }
        if (refreshRes.data.defaultCredentials) {
          setDefaultCredentials(refreshRes.data.defaultCredentials);
          setInitialDefaultCredentials(refreshRes.data.defaultCredentials);
        }
        if (refreshRes.data.credentialStatus) {
          setCredentialStatus(refreshRes.data.credentialStatus);
        }
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

  /* Helper to check if a group has a custom API configured */
  const isCustomConfigured = (group) => {
    return group.fields.some((f) => {
      const status = credentialStatus[f.key];
      return status?.hasCustom;
    });
  };

  /* Helper to check if default API exists for a group */
  const isDefaultAvailable = (group) => {
    return group.fields.some((f) => {
      const status = credentialStatus[f.key];
      return status?.hasDefault;
    });
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
            Configure institutional API credentials or use the built-in system defaults.
          </p>
        </div>

        {/* Global Popup Message with smooth expand/collapse and close button */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${globalFeedback.message
            ? "max-h-24 opacity-100 translate-y-0 mb-4"
            : "max-h-0 opacity-0 -translate-y-2 pointer-events-none mb-0"
            }`}
        >
          <div
            className={`flex items-center justify-between p-4 rounded-xl text-sm font-medium border shadow-xs transition-colors ${globalFeedback.type === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : "bg-red-50 text-red-800 border-red-200"
              }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {globalFeedback.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span className="truncate">{globalFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setGlobalFeedback({ type: "", message: "" })}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-black/5 transition-colors cursor-pointer shrink-0 ml-3"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── UNIFIED API & CREDENTIALS SECTION ──────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Connected APIs &amp; Services
            </h2>
          </div>

          <div className="space-y-3.5">
            {INTEGRATIONS.map((group) => {
              const isEnabled = settings[group.toggleKey];
              const isOpen = openGroup === group.groupKey;
              const hasCustom = isCustomConfigured(group);
              const hasDefault = isDefaultAvailable(group);
              const isSaving = groupSaving[group.groupKey];
              const feedback = groupFeedback[group.groupKey];

              const isEditingCustom =
                editingGroup?.groupKey === group.groupKey &&
                editingGroup?.target === "custom";
              const isEditingDefault =
                editingGroup?.groupKey === group.groupKey &&
                editingGroup?.target === "default";

              return (
                <div
                  key={group.groupKey}
                  className={`bg-white border rounded-2xl shadow-xs transition-all duration-300 overflow-hidden ${isOpen
                    ? "border-brand-purple/40 ring-1 ring-brand-purple/15 shadow-sm"
                    : isEnabled
                      ? "border-gray-200 hover:border-gray-300"
                      : "border-gray-200 bg-gray-50/50 opacity-80"
                    }`}
                >
                  {/* Card Header */}
                  <div
                    onClick={() => toggleAccordion(group.groupKey)}
                    className={`flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-gray-50/70 select-none transition-colors gap-3 ${isOpen ? "bg-gray-50/70 border-b border-gray-100" : ""
                      }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 transition-all ${isEnabled
                          ? "bg-gray-50 border border-gray-200/80 shadow-2xs"
                          : "bg-gray-100 grayscale opacity-60 border border-gray-200"
                          }`}
                      >
                        <img
                          src={group.logo}
                          alt=""
                          className="h-7 w-7 object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {group.title}
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {group.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 shrink-0">
                      {/* Toggle Switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isEnabled}
                        onClick={(e) => handleToggle(group.toggleKey, e)}
                        title={isEnabled ? "Click to disable API" : "Click to enable API"}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-orange/30 ${isEnabled ? "bg-brand-orange" : "bg-gray-300"
                          }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                      </button>

                      {/* Dropdown Chevron */}
                      <div
                        className={`transform transition-transform duration-300 text-gray-400 p-1.5 rounded-lg hover:bg-gray-100 ${isOpen ? "rotate-180 text-brand-purple bg-purple-50" : ""
                          }`}
                        title={isOpen ? "Collapse" : "Expand"}
                      >
                        <ChevronDown size={18} />
                      </div>
                    </div>
                  </div>

                  {/* Smooth Dropdown Content */}
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0 pointer-events-none"
                      }`}
                  >
                    <div className="overflow-hidden">
                      <div className="border-t border-gray-100 bg-gray-50/40 p-4 sm:p-5 space-y-4">
                        {/* Inline card feedback if any */}
                        {feedback && (
                          <div
                            className={`flex items-center justify-between p-3 rounded-lg text-xs font-medium border ${feedback.type === "success"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                              }`}
                          >
                            <div className="flex items-center gap-2">
                              {feedback.type === "success" ? (
                                <CheckCircle2 size={14} className="shrink-0 text-green-600" />
                              ) : (
                                <AlertCircle size={14} className="shrink-0 text-red-600" />
                              )}
                              <span>{feedback.message}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setGroupFeedback((prev) => ({ ...prev, [group.groupKey]: null }))
                              }
                              className="text-gray-400 hover:text-gray-700"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}

                        {/* Two Columns: Custom API (Left) vs Default API (Right) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* ── LEFT COLUMN: Custom API ───────────── */}
                          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3.5 shadow-2xs">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                    Custom API
                                  </h4>
                                  <span
                                    className={`w-2 h-2 rounded-full ${hasCustom ? "bg-emerald-500" : "bg-gray-300"
                                      }`}
                                    title={hasCustom ? "Custom API is active" : "Not configured"}
                                  />
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  {hasCustom
                                    ? "Active and in use by the system"
                                    : "Not configured (using Default API)"}
                                </p>
                              </div>

                              {!isEditingCustom && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    requestSecurityVerification({
                                      groupKey: group.groupKey,
                                      target: "custom",
                                      action: "edit",
                                    })
                                  }
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 transition-all cursor-pointer shadow-2xs"
                                >
                                  <Edit3 size={12} className="text-gray-500" />
                                  <span>{hasCustom ? "Edit Custom API" : "Set Custom API"}</span>
                                </button>
                              )}
                            </div>

                            {/* Custom Fields */}
                            <div className="space-y-3">
                              {group.fields.map((field) => {
                                const val = customCredentials[field.key] || "";
                                const isRevealed = revealedFields[`custom_${field.key}`];
                                const unmasked = unmaskedCustomCredentials[field.key];
                                const isSet = Boolean(val && val !== MASK);

                                let displayVal = "Not configured";
                                if (isSet || unmasked) {
                                  if (field.isEmail || field.key === "emailUser") {
                                    displayVal = censorEmail(unmasked || val);
                                  } else if (field.sensitive) {
                                    displayVal = isRevealed && unmasked ? unmasked : MASK;
                                  } else {
                                    displayVal = unmasked || val;
                                  }
                                }

                                return (
                                  <div key={field.key} className="space-y-1">
                                    <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                      <span>{field.label}</span>
                                      {field.sensitive && <Lock size={10} className="text-gray-400" />}
                                    </label>

                                    {isEditingCustom ? (
                                      <div className="flex items-center gap-1.5">
                                        <div className="relative flex-1">
                                          <input
                                            type={field.sensitive && !isRevealed ? "password" : "text"}
                                            value={val}
                                            onChange={(e) =>
                                              handleCustomChange(field.key, e.target.value)
                                            }
                                            placeholder={field.placeholder}
                                            className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition-all pr-8"
                                          />
                                          {field.sensitive && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setRevealedFields((prev) => ({
                                                  ...prev,
                                                  [`custom_${field.key}`]: !prev[`custom_${field.key}`],
                                                }))
                                              }
                                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                            >
                                              {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                                            </button>
                                          )}
                                        </div>
                                        {val && (
                                          <button
                                            type="button"
                                            title="Clear field to fallback to default"
                                            onClick={() => handleCustomChange(field.key, "")}
                                            className="p-2 rounded-lg border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                                        <span
                                          className={`text-xs font-mono truncate select-all ${!isSet && !unmasked
                                            ? "text-gray-400 italic"
                                            : "text-gray-800"
                                            }`}
                                        >
                                          {displayVal}
                                        </span>

                                        {field.sensitive && isSet && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              requestSecurityVerification({
                                                groupKey: group.groupKey,
                                                target: "custom",
                                                action: "reveal",
                                                fieldKey: `custom_${field.key}`,
                                              })
                                            }
                                            className="flex items-center gap-1 text-[11px] font-medium text-gray-600 hover:text-brand-purple bg-white px-2 py-1 rounded border border-gray-200 hover:border-gray-300 transition-all shrink-0 cursor-pointer shadow-2xs"
                                          >
                                            {isRevealed ? (
                                              <>
                                                <EyeOff size={11} />
                                                <span>Hide</span>
                                              </>
                                            ) : (
                                              <>
                                                <Eye size={11} />
                                                <span>Reveal</span>
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Custom Actions if Editing */}
                            {isEditingCustom && (
                              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <button
                                  type="button"
                                  onClick={() => handleCancelEdit(group.groupKey, "custom")}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                  <X size={12} />
                                  <span>Cancel</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveGroup(group, "custom")}
                                  disabled={isSaving}
                                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-orange text-white text-xs font-medium hover:bg-orange-600 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                                >
                                  {isSaving ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check size={12} />
                                  )}
                                  <span>{isSaving ? "Saving…" : "Save Custom API"}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* ── RIGHT COLUMN: Default API ──────────── */}
                          <div className="bg-gray-50/80 rounded-xl border border-gray-200/90 p-4 space-y-3.5 shadow-2xs">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Default API
                                  </h4>
                                  <span
                                    className={`w-2 h-2 rounded-full ${!hasCustom && hasDefault ? "bg-blue-500" : "bg-gray-300"
                                      }`}
                                    title={
                                      !hasCustom && hasDefault
                                        ? "Active system fallback"
                                        : "Standby fallback"
                                    }
                                  />
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  {hasCustom
                                    ? "Standby (overridden by Custom API)"
                                    : hasDefault
                                      ? "Active system fallback"
                                      : "No default configured"}
                                </p>
                              </div>

                              {allowDefaultEdit ? (
                                !isEditingDefault && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      requestSecurityVerification({
                                        groupKey: group.groupKey,
                                        target: "default",
                                        action: "edit",
                                      })
                                    }
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 transition-all cursor-pointer shadow-2xs"
                                  >
                                    <Edit3 size={12} className="text-gray-500" />
                                    <span>Edit Default API</span>
                                  </button>
                                )
                              ) : (
                                <div className="flex items-center gap-1 text-[11px] text-gray-400 bg-gray-200/60 px-2 py-0.5 rounded-md">
                                  <Lock size={10} />
                                  <span>System Locked</span>
                                </div>
                              )}
                            </div>

                            {/* Default Fields */}
                            <div className="space-y-3">
                              {group.fields.map((field) => {
                                const val = defaultCredentials[field.key] || "";
                                const isRevealed = revealedFields[`default_${field.key}`];
                                const unmasked = unmaskedDefaultCredentials[field.key];
                                const isSet = Boolean(val);

                                let displayVal = "Not available";
                                if (isSet || unmasked) {
                                  if (field.isEmail || field.key === "emailUser") {
                                    displayVal = censorEmail(unmasked || val);
                                  } else if (field.sensitive) {
                                    displayVal =
                                      isRevealed && unmasked && allowDefaultEdit
                                        ? unmasked
                                        : MASK;
                                  } else {
                                    displayVal = unmasked || val;
                                  }
                                }

                                return (
                                  <div key={field.key} className="space-y-1">
                                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                      <span>{field.label}</span>
                                      {field.sensitive && <Lock size={10} className="text-gray-400" />}
                                    </label>

                                    {isEditingDefault && allowDefaultEdit ? (
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type={
                                            field.sensitive && !isRevealed ? "password" : "text"
                                          }
                                          value={val}
                                          onChange={(e) =>
                                            handleDefaultChange(field.key, e.target.value)
                                          }
                                          placeholder={field.placeholder}
                                          className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition-all"
                                        />
                                      </div>
                                    ) : (
                                      <div className="p-2 rounded-lg bg-white/70 border border-gray-200/70">
                                        <span className="text-xs font-mono text-gray-700 truncate block select-all">
                                          {displayVal}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Default Actions if Editing */}
                            {isEditingDefault && allowDefaultEdit && (
                              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                <button
                                  type="button"
                                  onClick={() => handleCancelEdit(group.groupKey, "default")}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                  <X size={12} />
                                  <span>Cancel</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveGroup(group, "default")}
                                  disabled={isSaving}
                                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-purple text-white text-xs font-medium hover:bg-purple-900 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                                >
                                  {isSaving ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check size={12} />
                                  )}
                                  <span>{isSaving ? "Saving…" : "Save Default API"}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>




                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── Security Password Verification Modal ──────────────── */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full overflow-hidden">
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
      )}
    </div>
  );
}
