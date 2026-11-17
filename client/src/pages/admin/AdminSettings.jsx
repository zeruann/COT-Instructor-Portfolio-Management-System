import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Mail,
  ShieldCheck,
  HardDrive,
  KeyRound,
  FileSpreadsheet,
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
  Clock,
  RotateCcw,
} from "lucide-react";

import gmailIcon from "../../assets/Gmail_icon_(2020).svg";
import recaptchaIcon from "../../assets/ReCAPTCHA_icon.svg";
import driveIcon from "../../assets/Google_Drive_icon_(2026).svg";
import googleIcon from "../../assets/Google_Favicon_2025.svg";
import sheetsIcon from "../../assets/google-sheets.svg";
import securityShieldIcon from "../../assets/security-shield.png";

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
  {
    groupKey: "googleSheets",
    toggleKey: "googleSheetsEnabled",
    title: "Google Sheets API",
    description: "Exports Faculty Compliance Checklist reports directly to Google Sheets.",
    logo: sheetsIcon,
    icon: FileSpreadsheet,
    fields: [
      {
        key: "googleSheetsClientEmail",
        label: "Service Account Email",
        sensitive: false,
        isEmail: true,
        placeholder: "service-account@project-id.iam.gserviceaccount.com",
        help: "The client_email address of the Google Cloud Service Account.",
      },
      {
        key: "googleSheetsPrivateKey",
        label: "Private Key",
        sensitive: true,
        placeholder: "-----BEGIN PRIVATE KEY-----\\n…",
        help: "PEM-encoded private_key from your Google Cloud Service Account JSON file.",
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

function censorIdentifier(val) {
  if (!val || typeof val !== "string") return "";
  const trimmed = val.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 10) return "••••••••";
  return `${trimmed.slice(0, 4)}••••••••••••${trimmed.slice(-4)}`;
}

function getInitials(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "AD";
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    googleMailEnabled: true,
    recaptchaEnabled: true,
    googleDriveEnabled: true,
    googleAuthEnabled: true,
    googleSheetsEnabled: true,
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

  // API Modes ('custom' | 'default') per group
  const [apiModes, setApiModes] = useState({});
  const [modeSaving, setModeSaving] = useState({});

  // Restore to Default Modal State
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoringDefaults, setRestoringDefaults] = useState(false);

  // Custom API Save, Test Connection & OTP Modal State
  const [showCustomSaveModal, setShowCustomSaveModal] = useState(false);
  const [pendingCustomSave, setPendingCustomSave] = useState(null); // { group, target, payload }
  const [customSaveStage, setCustomSaveStage] = useState("testing"); // "testing" | "failed" | "otp"
  const [connectionTestError, setConnectionTestError] = useState("");
  const [connectionTestSuccess, setConnectionTestSuccess] = useState("");
  const [customSaveOtpCode, setCustomSaveOtpCode] = useState("");
  const [customSaveOtpSending, setCustomSaveOtpSending] = useState(false);
  const [customSaveOtpVerifying, setCustomSaveOtpVerifying] = useState(false);
  const [customSaveOtpError, setCustomSaveOtpError] = useState("");
  const [customSaveOtpSuccess, setCustomSaveOtpSuccess] = useState("");
  const [customSaveResendTimer, setCustomSaveResendTimer] = useState(0);

  // OTP Security Verification State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [maskedAdminEmail, setMaskedAdminEmail] = useState("");
  const [adminProfile, setAdminProfile] = useState(() => {
    try {
      const stored =
        localStorage.getItem("admin") ||
        localStorage.getItem("user") ||
        localStorage.getItem("instructor");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [adminImgError, setAdminImgError] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [revealedFields, setRevealedFields] = useState({}); // { [compositeKey]: boolean }

  const token = localStorage.getItem("token");

  // Load admin email preview on mount
  useEffect(() => {
    try {
      const adminData = JSON.parse(
        localStorage.getItem("admin") || localStorage.getItem("instructor") || "{}"
      );
      if (adminData && Object.keys(adminData).length > 0) {
        setAdminProfile((prev) => ({ ...(prev || {}), ...adminData }));
      }
      if (adminData?.email) {
        const [u, d] = adminData.email.split("@");
        const censored =
          u.length <= 3
            ? `${u[0]}•••@${d}`
            : `${u.slice(0, 2)}•••••${u.slice(-1)}@${d}`;
        setMaskedAdminEmail(censored);
      }
    } catch { }
  }, []);

  // 30-Second Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // 30-Second Countdown timer for Custom API Save OTP resend
  useEffect(() => {
    let interval = null;
    if (customSaveResendTimer > 0) {
      interval = setInterval(() => {
        setCustomSaveResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [customSaveResendTimer]);

  const didInitialFetchRef = useRef(false);

  useEffect(() => {
    if (didInitialFetchRef.current) return;
    didInitialFetchRef.current = true;
    fetchSettings();
  }, []);

  const fetchSettings = async ({ silent = false } = {}) => {
    setLoading(true);
    setGlobalFeedback({ type: "", message: "" });
    try {
      const res = await axios.get(silent ? `${API_URL}?silent=1` : API_URL, {
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
      if (res.data?.apiModes) setApiModes(res.data.apiModes);
      if (res.data?.allowDefaultEdit !== undefined) {
        setAllowDefaultEdit(res.data.allowDefaultEdit);
      }
      if (res.data?.adminProfile) {
        setAdminProfile((prev) => ({ ...(prev || {}), ...res.data.adminProfile }));
        if (res.data.adminProfile.email) {
          setMaskedAdminEmail(res.data.adminProfile.email);
        }
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

  /* ─── Send OTP Code to Admin's Email ─────────────────────────── */
  const handleSendOtp = async () => {
    if (resendTimer > 0 || otpSending) return;
    setOtpSending(true);
    setOtpError("");
    setOtpSuccess("");

    try {
      const res = await axios.post(
        `${API_URL}/send-otp`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setOtpSent(true);
        if (res.data.email) setMaskedAdminEmail(res.data.email);
        if (res.data.adminProfile) {
          setAdminProfile((prev) => ({ ...(prev || {}), ...res.data.adminProfile }));
        }
        setOtpSuccess("A 6-digit verification code has been sent to your email.");
        setResendTimer(30);
      }
    } catch (err) {
      setOtpError(
        err.response?.data?.message || "Failed to send verification code. Please try again."
      );
    } finally {
      setOtpSending(false);
    }
  };

  /* ─── Verify OTP Code & Unlock API Settings ──────────────────── */
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError("Please enter the complete 6-digit verification code.");
      return;
    }

    setOtpVerifying(true);
    setOtpError("");
    setOtpSuccess("");

    try {
      const res = await axios.post(
        `${API_URL}/verify-otp`,
        { otp: otpCode.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        if (res.data.unmaskedCustomCredentials) {
          setUnmaskedCustomCredentials(res.data.unmaskedCustomCredentials);
        }
        if (res.data.unmaskedDefaultCredentials) {
          setUnmaskedDefaultCredentials(res.data.unmaskedDefaultCredentials);
        }
        setOtpSuccess("Verification successful! Unlocking settings...");
        setIsFadingOut(true);

        setTimeout(() => {
          setIsUnlocked(true);
          setIsFadingOut(false);
          setOtpError("");
        }, 500);
      }
    } catch (err) {
      setOtpError(
        err.response?.data?.message || "Invalid or expired verification code. Please try again."
      );
    } finally {
      setOtpVerifying(false);
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
      // Hide any revealed password/email/sensitive fields in this group
      setRevealedFields((prev) => {
        const next = { ...prev };
        group.fields.forEach((f) => {
          if (f.sensitive || f.isEmail || f.key === "emailUser") {
            delete next[`${target}_${f.key}`];
          }
        });
        return next;
      });

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

  /* ─── Mode Change Handler (Custom vs Default Radio) ────────── */
  const handleModeChange = async (groupKey, mode) => {
    const groupObj = INTEGRATIONS.find((g) => g.groupKey === groupKey);
    if (mode === "custom" && groupObj && !isCustomConfigured(groupObj)) {
      setGlobalFeedback({
        type: "error",
        message: `Please configure and save Custom API credentials for ${groupObj.title} before selecting Custom API.`,
      });
      return;
    }

    const prevMode = apiModes[groupKey] || "default";
    if (prevMode === mode) return;

    setApiModes((prev) => ({ ...prev, [groupKey]: mode }));
    setModeSaving((prev) => ({ ...prev, [groupKey]: true }));

    try {
      const res = await axios.put(
        `${API_URL}/modes`,
        { group: groupKey, mode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.apiModes) {
        setApiModes(res.data.apiModes);
      }
      setGlobalFeedback({
        type: "success",
        message: `Active API set to ${mode === "custom" ? "Custom API" : "Default API"}.`,
      });
    } catch (err) {
      setApiModes((prev) => ({ ...prev, [groupKey]: prevMode }));
      setGlobalFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to update active API mode.",
      });
    } finally {
      setModeSaving((prev) => ({ ...prev, [groupKey]: false }));
    }
  };

  /* ─── Restore to Default Handler ────────────────────────────── */
  const handleRestoreDefaults = async () => {
    setRestoringDefaults(true);
    try {
      const res = await axios.post(
        `${API_URL}/restore-defaults`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.apiModes) {
        setApiModes(res.data.apiModes);
      }
      setShowRestoreModal(false);
      setGlobalFeedback({
        type: "success",
        message: "All connected APIs have been restored to Default APIs. Custom configurations remain preserved.",
      });
    } catch (err) {
      setGlobalFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to restore default APIs.",
      });
    } finally {
      setRestoringDefaults(false);
    }
  };

  /* ─── Test Connection Handler (Inside Save Modal) ────────────── */
  const runCustomConnectionTest = async (group, payload) => {
    setCustomSaveStage("testing");
    setConnectionTestError("");
    setConnectionTestSuccess("");

    try {
      const res = await axios.post(
        `${API_URL}/test-connection`,
        { service: group.groupKey, credentials: payload },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success === false) {
        setCustomSaveStage("failed");
        setConnectionTestError(
          res.data?.message || "Connection test failed. Please verify credentials."
        );
      } else {
        setCustomSaveStage("otp");
        setConnectionTestSuccess(
          res.data?.message || "Connection verified successfully!"
        );
        // Automatically dispatch OTP
        sendCustomSaveOtp();
      }
    } catch (err) {
      setCustomSaveStage("failed");
      setConnectionTestError(
        err.response?.data?.message || "Connection check failed. Please verify credentials."
      );
    }
  };

  /* ─── Send OTP for Custom API Save ───────────────────────────── */
  const sendCustomSaveOtp = async () => {
    if (customSaveResendTimer > 0 || customSaveOtpSending) return;
    setCustomSaveOtpSending(true);
    setCustomSaveOtpError("");
    setCustomSaveOtpSuccess("");

    try {
      const res = await axios.post(
        `${API_URL}/send-otp`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setCustomSaveOtpSuccess("A 6-digit verification code has been sent to your email.");
        setCustomSaveResendTimer(30);
      }
    } catch (err) {
      setCustomSaveOtpError(
        err.response?.data?.message || "Failed to send verification code. Please try again."
      );
    } finally {
      setCustomSaveOtpSending(false);
    }
  };

  /* ─── Close Custom API Save Modal ────────────────────────────── */
  const handleCloseCustomSaveModal = () => {
    setShowCustomSaveModal(false);
    setPendingCustomSave(null);
    setConnectionTestError("");
    setConnectionTestSuccess("");
    setCustomSaveOtpCode("");
    setCustomSaveOtpError("");
    setCustomSaveOtpSuccess("");
  };

  /* ─── Confirm Custom API Save via OTP ────────────────────────── */
  const handleConfirmCustomSaveOtp = async (e) => {
    e?.preventDefault();
    if (!customSaveOtpCode || customSaveOtpCode.trim().length !== 6) {
      setCustomSaveOtpError("Please enter the complete 6-digit verification code.");
      return;
    }
    if (!pendingCustomSave) return;

    setCustomSaveOtpVerifying(true);
    setCustomSaveOtpError("");

    const { group, payload } = pendingCustomSave;
    const body = { customCredentials: payload, otp: customSaveOtpCode.trim() };

    try {
      await axios.put(API_URL, body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setGroupFeedback((prev) => ({
        ...prev,
        [group.groupKey]: {
          type: "success",
          message: `Custom ${group.title} credentials verified and saved successfully!`,
        },
      }));

      // Automatically set active mode to custom once configured
      setApiModes((prev) => ({ ...prev, [group.groupKey]: "custom" }));

      // Refresh settings
      await fetchSettings({ silent: true });
      setEditingGroup(null);
      handleCloseCustomSaveModal();
    } catch (err) {
      setCustomSaveOtpError(
        err.response?.data?.message || "Invalid or expired verification code. Please try again."
      );
    } finally {
      setCustomSaveOtpVerifying(false);
    }
  };

  /* ─── Save Credentials Handler (Custom or Default) ───────────── */
  const handleSaveGroup = (group, target) => {
    const groupKey = group.groupKey;
    const sourceCredentials =
      target === "custom" ? customCredentials : defaultCredentials;

    const payload = {};
    group.fields.forEach((f) => {
      const val = sourceCredentials[f.key];
      if (f.sensitive && val === MASK) {
        payload[f.key] = MASK;
      } else {
        payload[f.key] = val !== undefined ? val : "";
      }
    });

    if (target === "custom") {
      // Trigger modal: automatically test connection, then on success send OTP & show OTP form
      setPendingCustomSave({ group, target, payload });
      setCustomSaveStage("testing");
      setConnectionTestError("");
      setConnectionTestSuccess("");
      setCustomSaveOtpCode("");
      setCustomSaveOtpError("");
      setCustomSaveOtpSuccess("");
      setShowCustomSaveModal(true);
      runCustomConnectionTest(group, payload);
      return;
    }

    commitSaveGroup(group, target, payload);

    commitSaveGroup(group, target, payload);
  };

  const commitSaveGroup = async (group, target, payload) => {
    const groupKey = group.groupKey;
    setGroupSaving((prev) => ({ ...prev, [groupKey]: true }));
    setGroupFeedback((prev) => ({ ...prev, [groupKey]: null }));

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

      await fetchSettings({ silent: true });
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

  const adminName = adminProfile?.fullName || adminProfile?.name || "Gil Nicholas Cagande";
  const adminRole = adminProfile?.accountType || adminProfile?.role || "Administrator";
  const adminDept = adminProfile?.department || "College of Technologies";
  const displayEmail =
    maskedAdminEmail ||
    (adminProfile?.email ? censorEmail(adminProfile.email) : "24•••••2@student.buksu.edu.ph");
  const adminPhoto =
    adminProfile?.photoUrl ||
    adminProfile?.googlePhotoUrl ||
    adminProfile?.profile?.photoUrl;

  return (
    <div className="relative bg-white rounded-3xl pt-8 pr-8 pl-8 min-h-[calc(100vh-140px)] overflow-hidden">
      <div
        className={`max-w-7xl mx-auto space-y-6 pb-12 transition-opacity duration-300 ${!isUnlocked ? "pointer-events-none select-none opacity-40" : "opacity-100"
          }`}
        aria-hidden={!isUnlocked}
      >
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-purple tracking-tight">
              API &amp; Integration Settings
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure institutional API credentials or use the built-in system defaults.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowRestoreModal(true)}
            className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl border border-orange-200/90 bg-orange-50/90 hover:bg-orange-100 active:scale-[0.99] text-brand-orange font-semibold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer"
          >
            <RotateCcw size={15} className="text-brand-orange" />
            <span>Restore to Default</span>
          </button>
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
              const isToggleOnly = Boolean(group.toggleOnly || group.fields.length === 0);
              const isOpen = !isToggleOnly && openGroup === group.groupKey;
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
                    onClick={() => !isToggleOnly && toggleAccordion(group.groupKey)}
                    className={`flex items-center justify-between p-4 sm:p-5 select-none transition-colors gap-3 ${!isToggleOnly ? "cursor-pointer hover:bg-gray-50/70" : ""} ${isOpen ? "bg-gray-50/70 border-b border-gray-100" : ""
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
                        title={isEnabled ? "Click to disable service" : "Click to enable service"}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-orange/30 ${isEnabled ? "bg-brand-orange" : "bg-gray-300"
                          }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                      </button>

                      {/* Dropdown Chevron (or alignment spacer for toggle-only services) */}
                      {!isToggleOnly ? (
                        <div
                          className={`transform transition-transform duration-300 text-gray-400 p-1.5 rounded-lg hover:bg-gray-100 ${isOpen ? "rotate-180 text-brand-purple bg-purple-50" : ""
                            }`}
                          title={isOpen ? "Collapse" : "Expand"}
                        >
                          <ChevronDown size={18} />
                        </div>
                      ) : (
                        <div className="w-[30px]" aria-hidden="true" />
                      )}
                    </div>
                  </div>

                  {/* Smooth Dropdown Content */}
                  {!isToggleOnly && (
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
                            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-4 shadow-2xs">
                              <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                                      Custom API
                                    </h4>
                                    <label
                                      className={`flex items-center select-none ${hasCustom
                                          ? "cursor-pointer"
                                          : "cursor-not-allowed opacity-50"
                                        }`}
                                      title={
                                        hasCustom
                                          ? "Select to use Custom API for this service"
                                          : "Configure and save Custom API credentials first"
                                      }
                                    >
                                      <input
                                        type="radio"
                                        name={`apiMode_${group.groupKey}`}
                                        value="custom"
                                        disabled={!hasCustom || modeSaving[group.groupKey]}
                                        checked={hasCustom && apiModes[group.groupKey] === "custom"}
                                        onChange={() => handleModeChange(group.groupKey, "custom")}
                                        className={`w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 accent-emerald-600 ${hasCustom ? "cursor-pointer" : "cursor-not-allowed"
                                          }`}
                                      />
                                    </label>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {hasCustom
                                      ? apiModes[group.groupKey] === "custom"
                                        ? "Active and in use by the system"
                                        : "Configured (using Default API)"
                                      : "Not configured (using Default API)"}
                                  </p>
                                </div>

                                {!isEditingCustom && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      executeAction({
                                        groupKey: group.groupKey,
                                        target: "custom",
                                        action: "edit",
                                      })
                                    }
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.99] text-gray-700 font-semibold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer"
                                  >
                                    <Edit3 size={14} className="text-gray-500" />
                                    <span>{hasCustom ? "Edit Custom API" : "Set Custom API"}</span>
                                  </button>
                                )}
                              </div>

                              {/* Custom Fields */}
                              <div className="space-y-3.5">
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
                                      displayVal = censorIdentifier(unmasked || val);
                                    }
                                  }

                                  const isEmailField = field.isEmail || field.key === "emailUser";
                                  const showEyeToggle = field.sensitive && isSet;

                                  return (
                                    <div key={field.key} className="space-y-1.5">
                                      <label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                        <span>{field.label}</span>
                                        {field.sensitive && <Lock size={12} className="text-gray-400" />}
                                      </label>

                                      {isEditingCustom ? (
                                        <div className="flex items-center gap-2">
                                          <div className="relative flex-1">
                                            <input
                                              type={
                                                (field.sensitive && !isRevealed)
                                                  ? "password"
                                                  : "text"
                                              }
                                              value={
                                                isEmailField && !isRevealed
                                                  ? censorEmail(val)
                                                  : val
                                              }
                                              readOnly={isEmailField && !isRevealed}
                                              onChange={(e) =>
                                                handleCustomChange(field.key, e.target.value)
                                              }
                                              placeholder={field.placeholder}
                                              className={`w-full text-sm font-mono px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition-all pr-10 ${isEmailField && !isRevealed ? "cursor-default select-none" : ""
                                                }`}
                                            />
                                            {(field.sensitive || isEmailField) && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setRevealedFields((prev) => ({
                                                    ...prev,
                                                    [`custom_${field.key}`]: !prev[`custom_${field.key}`],
                                                  }))
                                                }
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                                                title={isRevealed ? "Hide" : "Show full"}
                                              >
                                                {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
                                              </button>
                                            )}
                                          </div>
                                          {val && (
                                            <button
                                              type="button"
                                              title="Clear field to fallback to default"
                                              onClick={() => handleCustomChange(field.key, "")}
                                              className="p-2.5 rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0 cursor-pointer"
                                            >
                                              <Trash2 size={15} />
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-200/80">
                                          <span
                                            className={`text-sm font-mono truncate select-all ${!isSet && !unmasked
                                              ? "text-gray-400 italic"
                                              : "text-gray-800"
                                              }`}
                                          >
                                            {displayVal}
                                          </span>

                                          {showEyeToggle && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                executeAction({
                                                  groupKey: group.groupKey,
                                                  target: "custom",
                                                  action: "reveal",
                                                  fieldKey: `custom_${field.key}`,
                                                })
                                              }
                                              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-brand-purple bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-all shrink-0 cursor-pointer shadow-2xs"
                                            >
                                              {isRevealed ? (
                                                <>
                                                  <EyeOff size={13} />
                                                  <span>Hide</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Eye size={13} />
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
                                <div className="flex items-center justify-end pt-3 border-t border-gray-100 gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => handleCancelEdit(group.groupKey, "custom")}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer"
                                  >
                                    <X size={14} />
                                    <span>Cancel</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleSaveGroup(group, "custom")}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    {isSaving ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check size={14} />
                                    )}
                                    <span>{isSaving ? "Saving…" : "Save Custom API"}</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* ── RIGHT COLUMN: Default API ──────────── */}
                            <div className="bg-gray-50/80 rounded-2xl border border-gray-200/90 p-4 sm:p-5 space-y-4 shadow-2xs">
                              <div className="flex items-center justify-between pb-3 border-b border-gray-200/60">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                                      Default API
                                    </h4>
                                    <label
                                      className="flex items-center cursor-pointer select-none"
                                      title="Select to use Default API for this service"
                                    >
                                      <input
                                        type="radio"
                                        name={`apiMode_${group.groupKey}`}
                                        value="default"
                                        checked={!hasCustom || (apiModes[group.groupKey] || "default") === "default"}
                                        onChange={() => handleModeChange(group.groupKey, "default")}
                                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 accent-emerald-600 cursor-pointer"
                                      />
                                    </label>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {!hasCustom || (apiModes[group.groupKey] || "default") === "default"
                                      ? "Active and in use by the system"
                                      : "Standby fallback"}
                                  </p>
                                </div>

                                {allowDefaultEdit ? (
                                  !isEditingDefault && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        executeAction({
                                          groupKey: group.groupKey,
                                          target: "default",
                                          action: "edit",
                                        })
                                      }
                                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold text-xs sm:text-sm hover:bg-gray-50 transition-all cursor-pointer shadow-2xs"
                                    >
                                      <Edit3 size={13} className="text-gray-500" />
                                      <span>Edit Default API</span>
                                    </button>
                                  )
                                ) : (
                                  <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-200/60 px-2.5 py-1 rounded-lg">
                                    <Lock size={12} />
                                    <span>System Locked</span>
                                  </div>
                                )}
                              </div>

                              {/* Default Fields */}
                              <div className="space-y-3.5">
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
                                    <div key={field.key} className="space-y-1.5">
                                      <label className="text-xs sm:text-sm font-semibold text-gray-600 flex items-center gap-1.5">
                                        <span>{field.label}</span>
                                        {field.sensitive && <Lock size={12} className="text-gray-400" />}
                                      </label>

                                      {isEditingDefault && allowDefaultEdit ? (
                                        <div className="flex items-center gap-2">
                                          <input
                                            type={
                                              field.sensitive && !isRevealed ? "password" : "text"
                                            }
                                            value={val}
                                            onChange={(e) =>
                                              handleDefaultChange(field.key, e.target.value)
                                            }
                                            placeholder={field.placeholder}
                                            className="w-full text-sm font-mono px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition-all"
                                          />
                                        </div>
                                      ) : (
                                        <div className="p-2.5 rounded-xl bg-white/90 border border-gray-200">
                                          <span className="text-sm font-mono text-gray-700 truncate block select-all">
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
                                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                  <button
                                    type="button"
                                    onClick={() => handleCancelEdit(group.groupKey, "default")}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer"
                                  >
                                    <X size={14} />
                                    <span>Cancel</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveGroup(group, "default")}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-purple-900 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                                  >
                                    {isSaving ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check size={14} />
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
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── SECURITY VERIFICATION OVERLAY COVER (Dark backdrop blur, centered across the whole screen) ── */}
      {!isUnlocked && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm transition-all duration-500 ease-out overflow-y-auto ${isFadingOut
            ? "opacity-0 scale-[0.98] pointer-events-none"
            : "opacity-100 scale-100"
            }`}
        >
          <div className="relative w-full max-w-[540px] rounded-3xl bg-white p-6 sm:p-8 md:p-9 shadow-2xl border border-gray-100/90 text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Close 'X' Button to exit and return back */}
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/admin/AdminDashboard");
                }
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Close and return"
              aria-label="Close and return"
            >
              <X size={20} />
            </button>

            {/* Header Icon */}
            <div className="mx-auto mb-3 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gray-50 border border-gray-200/80 shadow-2xs p-3">
              <img
                src={securityShieldIcon}
                alt="Security Verification"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Title & Subtitle */}
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              API Settings Security Verification
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
              In order to access and configure institutional API credentials, you must verify your identity with a One-Time PIN (OTP) sent to your administrator email.
            </p>

            {/* ── Admin Profile & Prominent Email Card ── */}
            <div className="mt-5 p-4 rounded-2xl bg-gray-50/90 border border-gray-200/80 text-left shadow-2xs">
              {/* Profile Row: Avatar, Name, Role Badge, Department */}
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  {adminPhoto && !adminImgError ? (
                    <img
                      src={adminPhoto}
                      alt={adminName}
                      onError={() => setAdminImgError(true)}
                      className="w-12 h-12 rounded-full object-cover border-2 border-brand-orange/40 shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-brand-orange text-white font-bold text-base flex items-center justify-center shadow-xs">
                      {getInitials(adminName)}
                    </div>
                  )}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-400"
                    title="Active Administrator"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                      {adminName}
                    </h4>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-brand-purple border border-purple-200">
                      {adminRole}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {adminDept}
                  </p>
                </div>
              </div>

              {/* Email Address Box */}
              <div className="mt-3.5 pt-3 border-t border-gray-200/70">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 shadow-2xs">
                  <Mail size={15} className="text-gray-400 shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700 truncate select-all">
                    {displayEmail}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 1: Send Code */}
            {!otpSent ? (
              <div className="mt-4 space-y-3 max-w-md mx-auto">
                {otpError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium text-left">
                    <AlertCircle size={14} className="text-red-600 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSending}
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-brand-orange hover:bg-orange-600 active:scale-[0.99] text-white font-semibold text-sm shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  {otpSending ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Sending Verification Code…</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      <span>Send Verification Code</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-gray-400">
                  A 6-digit PIN (valid for 5 minutes) will be sent to the administrator email address above.
                </p>
              </div>
            ) : (
              /* Step 2: Enter OTP Code */
              <form onSubmit={handleVerifyOtp} className="mt-4 space-y-3.5 max-w-md mx-auto text-left">
                {otpSuccess && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800">
                    <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                    <span>{otpSuccess}</span>
                  </div>
                )}

                {otpError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                    <AlertCircle size={14} className="text-red-600 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700">
                      Enter 6-Digit PIN
                    </label>
                    <span className="text-[11px] font-medium text-orange-600 flex items-center gap-1">
                      <Clock size={12} />
                      Expires in 5 minutes
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setOtpCode(val);
                      setOtpError("");
                    }}
                    placeholder="••••••"
                    className="w-full text-center font-mono text-2xl sm:text-3xl tracking-[0.4em] sm:tracking-[0.5em] py-3.5 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange bg-white shadow-2xs transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={otpVerifying || otpCode.length !== 6 || isFadingOut}
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-brand-orange hover:bg-orange-600 active:scale-[0.99] text-white font-semibold text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {otpVerifying ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Verifying &amp; Unlocking…</span>
                    </>
                  ) : (
                    <>
                      <Lock size={15} />
                      <span>Verify &amp; Unlock Settings</span>
                    </>
                  )}
                </button>

                {/* Resend Option with 30s Cooldown */}
                <div className="pt-1.5 text-center text-xs text-gray-500">
                  {resendTimer > 0 ? (
                    <div className="flex items-center justify-center gap-1.5 text-gray-400">
                      <Clock size={13} />
                      <span>
                        Resend code in <strong className="text-gray-600 font-mono">{resendTimer}s</strong>
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSending || isFadingOut}
                      className="text-brand-orange hover:text-orange-700 font-medium hover:underline cursor-pointer"
                    >
                      Didn't receive the code? Resend Code
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── RESTORE TO DEFAULT CONFIRMATION MODAL ── */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-all">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-brand-orange border border-orange-100">
              <RotateCcw size={28} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Restore Default APIs?
              </h3>
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
                This will switch all connected services to use institutional system defaults. Your saved Custom API credentials will <strong>not</strong> be deleted and remain safely preserved.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                disabled={restoringDefaults}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                disabled={restoringDefaults}
                className="flex-1 py-2.5 px-4 rounded-xl bg-brand-orange hover:bg-orange-600 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {restoringDefaults ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Restoring…</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>Confirm Restore</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM API SAVE: CONNECTION TEST & OTP MODAL ── */}
      {showCustomSaveModal && pendingCustomSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-all">
          <div className="relative w-full max-w-[500px] rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Top Close 'X' Button */}
            <button
              type="button"
              onClick={handleCloseCustomSaveModal}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>

            {/* Header: API Icon + API Name */}
            <div className="flex items-center gap-3.5 text-left pb-4 border-b border-gray-100 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200/80 p-2.5 flex items-center justify-center shrink-0 shadow-2xs">
                {pendingCustomSave.group.logo ? (
                  <img
                    src={pendingCustomSave.group.logo}
                    alt={pendingCustomSave.group.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <pendingCustomSave.group.icon size={22} className="text-gray-600" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate leading-tight">
                  {pendingCustomSave.group.title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Custom API Connection &amp; Security Verification
                </p>
              </div>
            </div>

            {/* STAGE 1: Testing Connection (Circular spinner with arrowheads) */}
            {customSaveStage === "testing" && (
              <div className="py-10 px-4 flex flex-col items-center justify-center gap-3.5 text-center">
                <div className="w-16 h-16 rounded-full bg-orange-50 border border-orange-200/90 flex items-center justify-center text-brand-orange shadow-inner">
                  <RefreshCw size={28} className="animate-spin text-brand-orange" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-gray-900">Testing connection…</h4>
                  <p className="text-xs text-gray-500 max-w-xs">
                    Checking connection with {pendingCustomSave.group.title} servers
                  </p>
                </div>
              </div>
            )}

            {/* STAGE 2: Connection Failed */}
            {customSaveStage === "failed" && (
              <div className="py-5 space-y-4">
                {connectionTestError && (
                  <div className="flex items-start justify-between p-3.5 rounded-xl text-xs sm:text-sm font-medium border bg-red-50 text-red-800 border-red-200 shadow-2xs">
                    <div className="flex items-start gap-2.5 min-w-0 text-left">
                      <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-semibold block text-red-900">Connection Failed</span>
                        <span className="text-red-700 leading-relaxed block text-xs">
                          {connectionTestError}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConnectionTestError("")}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-black/5 transition-colors cursor-pointer shrink-0 ml-2"
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseCustomSaveModal}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    Close &amp; Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      runCustomConnectionTest(
                        pendingCustomSave.group,
                        pendingCustomSave.payload
                      )
                    }
                    className="flex-1 py-2.5 px-4 rounded-xl bg-brand-orange hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    <span>Retry Connection</span>
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 3: Connection Succeeded -> OTP Section Displayed Below */}
            {customSaveStage === "otp" && (
              <div className="space-y-4 pt-3">
                {/* Success Banner with dismiss X button (same design as popup message) */}
                {connectionTestSuccess && (
                  <div className="flex items-center justify-between p-3.5 rounded-xl text-xs sm:text-sm font-medium border bg-green-50 text-green-800 border-green-200 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0 text-left">
                      <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                      <span className="text-xs sm:text-sm">{connectionTestSuccess}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConnectionTestSuccess("")}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-black/5 transition-colors cursor-pointer shrink-0 ml-2"
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Admin Profile Box */}
                <div className="p-3.5 rounded-2xl bg-gray-50/90 border border-gray-200/80 text-left">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {adminPhoto && !adminImgError ? (
                        <img
                          src={adminPhoto}
                          alt={adminName}
                          onError={() => setAdminImgError(true)}
                          className="w-10 h-10 rounded-full object-cover border border-brand-orange/40"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-brand-orange text-white font-bold text-sm flex items-center justify-center">
                          {getInitials(adminName)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{adminName}</h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-brand-purple border border-purple-200">
                          {adminRole}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{adminDept}</p>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-gray-200/70">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 shadow-2xs">
                      <Mail size={14} className="text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-700 truncate select-all">{displayEmail}</span>
                    </div>
                  </div>
                </div>

                {/* OTP Form */}
                <form onSubmit={handleConfirmCustomSaveOtp} className="space-y-3.5 text-left">
                  {customSaveOtpSuccess && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 size={14} className="text-brand-orange shrink-0" />
                        <span className="truncate">{customSaveOtpSuccess}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomSaveOtpSuccess("")}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-black/5 transition-colors cursor-pointer shrink-0 ml-1"
                        title="Dismiss"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  {customSaveOtpError && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle size={14} className="text-red-600 shrink-0" />
                        <span>{customSaveOtpError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomSaveOtpError("")}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-black/5 transition-colors cursor-pointer shrink-0 ml-1"
                        title="Dismiss"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-700">
                        Enter 6-Digit PIN
                      </label>
                      <span className="text-[11px] font-medium text-orange-600 flex items-center gap-1">
                        <Clock size={12} />
                        Expires in 5 minutes
                      </span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoFocus
                      value={customSaveOtpCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setCustomSaveOtpCode(val);
                        setCustomSaveOtpError("");
                      }}
                      placeholder="••••••"
                      className="w-full text-center font-mono text-2xl tracking-[0.4em] py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange bg-white shadow-2xs transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleCloseCustomSaveModal}
                      disabled={customSaveOtpVerifying}
                      className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={customSaveOtpVerifying || customSaveOtpCode.length !== 6}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-brand-orange hover:bg-orange-600 active:scale-[0.99] text-white font-semibold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {customSaveOtpVerifying ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Verifying…</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>Verify &amp; Save</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Resend Option */}
                  <div className="pt-1 text-center text-xs text-gray-500">
                    {customSaveResendTimer > 0 ? (
                      <div className="flex items-center justify-center gap-1.5 text-gray-400">
                        <Clock size={13} />
                        <span>
                          Resend code in <strong className="text-gray-600 font-mono">{customSaveResendTimer}s</strong>
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={sendCustomSaveOtp}
                        disabled={customSaveOtpSending}
                        className="text-brand-orange hover:text-orange-700 font-medium hover:underline cursor-pointer"
                      >
                        Didn't receive code? Resend Code
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
