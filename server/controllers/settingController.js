// server/controllers/settingController.js
const Setting = require('../models/Setting');
const { logAudit } = require('../utils/auditLog');
const { ACTION } = require('../constants/auditActions');
// ==============================================================================================
// ⚙️ DEVELOPER SWITCH: ALLOW DEFAULT APIS EDITING
// ==============================================================================================
// Change this flag to `true` to allow administrators/developers to view and edit the default APIs
// directly from the settings interface.
// When set to `false` (default), the default APIs are locked and hidden in read-only mode.
//
// File Location: server/controllers/settingController.js (Line 14)
// ==============================================================================================
const ALLOW_DEFAULT_API_EDIT = false; // <-- CHANGE TO `true` TO ENABLE EDITING DEFAULT APIS

// Default toggle states
const TOGGLE_DEFAULTS = {
    googleMailEnabled: true,
    recaptchaEnabled: true,
    googleDriveEnabled: true,
    googleAuthEnabled: true,
    googleSheetsEnabled: true,
};

const SERVICE_GROUPS = [
    'googleMail',
    'googleDrive',
    'googleAuth',
    'recaptcha',
    'googleSheets',
];

const SERVICE_LABELS = {
    googleMail: 'Google Mail (SMTP)',
    googleDrive: 'Google Drive Storage',
    googleAuth: 'Google Sign-In (OAuth 2.0)',
    recaptcha: 'Google reCAPTCHA v2',
    googleSheets: 'Google Sheets API',
};

const TOGGLE_LABELS = {
    googleMailEnabled: 'Google Mail (SMTP)',
    recaptchaEnabled: 'Google reCAPTCHA v2',
    googleDriveEnabled: 'Google Drive Storage',
    googleAuthEnabled: 'Google Sign-In (OAuth 2.0)',
    googleSheetsEnabled: 'Google Sheets API',
};

const RECENT_ATTEMPT_WINDOW_MS = 3000;
const recentSettingsAttempts = new Map();

const logSettingAudit = async ({ req, action, outcome = 'success', targetLabel, details, meta }) => {
    await logAudit({
        actor: req.user,
        action,
        outcome,
        targetType: 'setting',
        targetLabel: targetLabel || 'API & Integration Settings',
        details,
        meta,
        req,
    });
};

// Map of credential keys, their default .env fallback, and optional custom .env override
const CREDENTIAL_CONFIG = {
    // Google Mail
    emailUser: { group: 'googleMail', env: 'EMAIL_USER', customEnv: 'CUSTOM_EMAIL_USER', sensitive: false, isEmail: true },
    emailPass: { group: 'googleMail', env: 'EMAIL_PASS', customEnv: 'CUSTOM_EMAIL_PASS', sensitive: true },

    // Google Drive
    googleDriveClientId: { group: 'googleDrive', env: 'GOOGLE_DRIVE_CLIENT_ID', customEnv: 'CUSTOM_GOOGLE_DRIVE_CLIENT_ID', sensitive: false },
    googleDriveClientSecret: { group: 'googleDrive', env: 'GOOGLE_DRIVE_CLIENT_SECRET', customEnv: 'CUSTOM_GOOGLE_DRIVE_CLIENT_SECRET', sensitive: true },
    googleDriveRefreshToken: { group: 'googleDrive', env: 'GOOGLE_DRIVE_REFRESH_TOKEN', customEnv: 'CUSTOM_GOOGLE_DRIVE_REFRESH_TOKEN', sensitive: true },
    googleDriveRootFolderId: { group: 'googleDrive', env: 'GOOGLE_DRIVE_ROOT_FOLDER_ID', customEnv: 'CUSTOM_GOOGLE_DRIVE_ROOT_FOLDER_ID', sensitive: false },

    // Google Sign-In
    googleClientId: { group: 'googleAuth', env: 'GOOGLE_CLIENT_ID', customEnv: 'CUSTOM_GOOGLE_CLIENT_ID', sensitive: false },

    // Google reCAPTCHA
    recaptchaSiteKey: { group: 'recaptcha', env: 'VITE_RECAPTCHA_SITE_KEY', customEnv: 'CUSTOM_VITE_RECAPTCHA_SITE_KEY', sensitive: false },
    recaptchaSecret: { group: 'recaptcha', env: 'RECAPTCHA_SECRET', customEnv: 'CUSTOM_RECAPTCHA_SECRET', sensitive: true },

    // Google Sheets API
    googleSheetsClientEmail: { group: 'googleSheets', env: 'GOOGLE_SHEETS_CLIENT_EMAIL', customEnv: 'CUSTOM_GOOGLE_SHEETS_CLIENT_EMAIL', sensitive: false, isEmail: true },
    googleSheetsPrivateKey: { group: 'googleSheets', env: 'GOOGLE_SHEETS_PRIVATE_KEY', customEnv: 'CUSTOM_GOOGLE_SHEETS_PRIVATE_KEY', sensitive: true },
};

const MASK_PLACEHOLDER = '••••••••••••••••';

/**
 * Helper to censor email address (e.g. cotportfolio@gmail.com -> co•••••io@gmail.com)
 */
const censorEmail = (email) => {
    if (!email || typeof email !== 'string') return '';
    const atIndex = email.indexOf('@');
    if (atIndex === -1) {
        if (email.length <= 4) return '••••';
        return email.slice(0, 2) + '••••' + email.slice(-2);
    }
    const user = email.slice(0, atIndex);
    const domain = email.slice(atIndex);
    if (user.length <= 2) {
        return user[0] + '•' + domain;
    }
    if (user.length <= 4) {
        return user[0] + '••' + user.slice(-1) + domain;
    }
    const visibleStart = user.slice(0, 2);
    const visibleEnd = user.slice(-2);
    const maskedPart = '•'.repeat(Math.min(user.length - 4, 5));
    return `${visibleStart}${maskedPart}${visibleEnd}${domain}`;
};

/**
 * Helper to censor IDs, keys, and other non-email identifiers in Default APIs
 */
const censorIdentifier = (val) => {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (!trimmed) return '';
    if (trimmed.length <= 10) return '••••••••';
    return `${trimmed.slice(0, 4)}••••••••••••${trimmed.slice(-4)}`;
};

/**
 * Formats a Default API credential for read-only display (censors secrets, emails, and IDs)
 */
const formatDefaultCredential = (envVal, config) => {
    if (!envVal || String(envVal).trim() === '') return '';
    if (ALLOW_DEFAULT_API_EDIT) {
        return config.sensitive ? MASK_PLACEHOLDER : envVal;
    }
    if (config.sensitive) return MASK_PLACEHOLDER;
    if (config.isEmail) return censorEmail(envVal);
    return censorIdentifier(envVal);
};

/**
 * Checks whether a service group has at least one custom credential configured (DB or custom env)
 */
const isGroupCustomConfigured = (group, recordMap) => {
    return Object.keys(CREDENTIAL_CONFIG).some((key) => {
        const config = CREDENTIAL_CONFIG[key];
        if (config.group !== group) return false;
        const dbVal = recordMap[key];
        const envCustomVal = config.customEnv ? process.env[config.customEnv] : '';
        return Boolean(
            (dbVal && String(dbVal).trim() !== '') ||
            (envCustomVal && String(envCustomVal).trim() !== '')
        );
    });
};

/**
 * Helper to fetch a setting with fallback:
 * 1. Custom API from DB (Setting collection configured via Admin UI)
 * 2. Custom API from .env (e.g. CUSTOM_EMAIL_USER)
 * 3. Default API override in DB (if modified when ALLOW_DEFAULT_API_EDIT was true)
 * 4. Default API from .env (e.g. EMAIL_USER)
 */
exports.getSettingOrEnv = async (key, envVar) => {
    try {
        const config = CREDENTIAL_CONFIG[key];
        const customEnvVar = config?.customEnv;
        const group = config?.group;

        // Check if active mode is set for this group ('custom' or 'default')
        let mode = 'custom';
        if (group && require('mongoose').connection?.readyState === 1) {
            const modeRecord = await Setting.findOne({ key: `MODE_${group}` });
            if (modeRecord && (modeRecord.value === 'default' || modeRecord.value === 'custom')) {
                mode = modeRecord.value;
            }
        }

        // Only evaluate custom API if mode is NOT 'default'
        if (mode !== 'default') {
            // 1. Custom API configured in database (via UI) takes highest priority
            if (require('mongoose').connection?.readyState === 1) {
                const record = await Setting.findOne({ key });
                if (
                    record &&
                    record.value !== undefined &&
                    record.value !== null &&
                    typeof record.value === 'string' &&
                    record.value.trim() !== ''
                ) {
                    return record.value.trim();
                }
            }

            // 2. Custom API configured in .env (e.g. CUSTOM_EMAIL_USER)
            if (customEnvVar && process.env[customEnvVar] && process.env[customEnvVar].trim() !== '') {
                return process.env[customEnvVar].trim();
            }
        }

        // 3. Default API database override
        if (require('mongoose').connection?.readyState === 1) {
            const defaultRecord = await Setting.findOne({ key: `DEFAULT_${key}` });
            if (
                defaultRecord &&
                defaultRecord.value !== undefined &&
                defaultRecord.value !== null &&
                typeof defaultRecord.value === 'string' &&
                defaultRecord.value.trim() !== ''
            ) {
                return defaultRecord.value.trim();
            }
        }
    } catch (err) {
        console.warn(`[Settings] Failed reading key "${key}":`, err.message);
    }
    // 4. Fallback to process.env default
    return envVar ? process.env[envVar] : undefined;
};

// GET /api/settings (Admin only)
exports.getSettings = async (req, res) => {
    try {
        const toggleKeys = Object.keys(TOGGLE_DEFAULTS);
        const credKeys = Object.keys(CREDENTIAL_CONFIG);
        const defaultCredKeys = credKeys.map((k) => `DEFAULT_${k}`);
        const modeKeys = SERVICE_GROUPS.map((g) => `MODE_${g}`);

        const records = await Setting.find({
            key: { $in: [...toggleKeys, ...credKeys, ...defaultCredKeys, ...modeKeys] },
        });

        const recordMap = {};
        records.forEach((doc) => {
            recordMap[doc.key] = doc.value;
        });

        // 1. Build toggles
        const settings = { ...TOGGLE_DEFAULTS };
        toggleKeys.forEach((key) => {
            if (typeof recordMap[key] === 'boolean') {
                settings[key] = recordMap[key];
            }
        });

        // 2. Build custom credentials (Left column) and default credentials (Right column)
        const customCredentials = {};
        const defaultCredentials = {};
        const credentialStatus = {};

        credKeys.forEach((key) => {
            const config = CREDENTIAL_CONFIG[key];
            const dbVal = recordMap[key];
            const envCustomVal = config.customEnv ? process.env[config.customEnv] : undefined;
            const effectiveCustomVal =
                dbVal && String(dbVal).trim() !== ''
                    ? dbVal
                    : envCustomVal && String(envCustomVal).trim() !== ''
                        ? envCustomVal
                        : '';

            const defaultDbVal = recordMap[`DEFAULT_${key}`];
            const envVal = defaultDbVal || process.env[config.env] || '';

            const hasCustom = Boolean(effectiveCustomVal && String(effectiveCustomVal).trim() !== '');
            const hasDefault = Boolean(envVal && String(envVal).trim() !== '');

            credentialStatus[key] = {
                hasCustom,
                hasDefault,
                isConfigured: hasCustom || hasDefault,
                activeSource: hasCustom ? (dbVal ? 'database' : 'env_custom') : hasDefault ? 'default' : 'none',
            };

            // Custom credentials (Left Column)
            if (config.sensitive) {
                customCredentials[key] = hasCustom ? MASK_PLACEHOLDER : '';
            } else {
                customCredentials[key] = effectiveCustomVal || '';
            }

            // Default credentials (Right Column)
            defaultCredentials[key] = formatDefaultCredential(envVal, config);
        });

        // Calculate active API mode (Default vs Custom) for each service group
        const apiModes = {};
        SERVICE_GROUPS.forEach((group) => {
            const hasCustom = Object.keys(CREDENTIAL_CONFIG).some((k) => {
                return CREDENTIAL_CONFIG[k].group === group && credentialStatus[k]?.hasCustom;
            });
            const explicitMode = recordMap[`MODE_${group}`];
            if (explicitMode === 'custom' && !hasCustom) {
                apiModes[group] = 'default';
            } else if (explicitMode === 'default' || explicitMode === 'custom') {
                apiModes[group] = explicitMode;
            } else {
                apiModes[group] = hasCustom ? 'custom' : 'default';
            }
        });

        const Instructor = require('../models/Instructor');
        const adminUser = await Instructor.findById(req.user?.id).select('fullName email profile googlePhotoUrl photoUrl department accountType');
        const adminProfile = adminUser ? {
            fullName: adminUser.fullName,
            email: censorEmail(adminUser.email),
            rawEmail: adminUser.email,
            photoUrl: adminUser.profile?.photoUrl || adminUser.googlePhotoUrl || adminUser.photoUrl,
            department: adminUser.department,
            accountType: adminUser.accountType || 'Administrator',
        } : null;

        if (req.query.silent !== '1') {
            const actorKey = String(req.user?.id || req.ip || 'anon');
            const now = Date.now();
            const lastAttempt = recentSettingsAttempts.get(actorKey) || 0;
            if (now - lastAttempt > RECENT_ATTEMPT_WINDOW_MS) {
                recentSettingsAttempts.set(actorKey, now);
                await logSettingAudit({
                    req,
                    action: ACTION.SETTING_ATTEMPT,
                    targetLabel: 'API & Integration Settings',
                    details: 'Attempted to access API & Integration Settings (OTP required)',
                });
            }
        }

        res.json({
            success: true,
            settings,
            customCredentials,
            defaultCredentials,
            credentialStatus,
            apiModes,
            allowDefaultEdit: ALLOW_DEFAULT_API_EDIT,
            adminProfile,
        });
    } catch (err) {
        console.error('Failed to get settings:', err);
        res.status(500).json({ message: 'Failed to retrieve settings.' });
    }
};

// PUT /api/settings (Admin only)
exports.updateSettings = async (req, res) => {
    try {
        const { settings, credentials, customCredentials, defaultCredentials, apiModes } = req.body;
        const userId = req.user?.id;

        const updates = [];
        const changedToggles = [];

        // 1. Update toggles if provided (diff against current values so only changed APIs are logged)
        if (settings && typeof settings === 'object') {
            const existingToggleDocs = await Setting.find({
                key: { $in: Object.keys(TOGGLE_DEFAULTS) },
            }).lean();
            const existingToggleMap = {};
            existingToggleDocs.forEach((d) => {
                existingToggleMap[d.key] = d.value;
            });

            Object.keys(TOGGLE_DEFAULTS).forEach((key) => {
                if (typeof settings[key] === 'boolean') {
                    const prevVal =
                        typeof existingToggleMap[key] === 'boolean'
                            ? existingToggleMap[key]
                            : TOGGLE_DEFAULTS[key];
                    if (prevVal !== settings[key]) {
                        changedToggles.push({
                            key,
                            label: TOGGLE_LABELS[key] || key,
                            enabled: settings[key],
                        });
                    }
                    updates.push(
                        Setting.findOneAndUpdate(
                            { key },
                            { value: settings[key], updatedBy: userId },
                            { upsert: true, new: true }
                        )
                    );
                }
            });
        }

        // 2. Update custom credentials (Left column) - Requires OTP Verification
        const customToUpdate = customCredentials || credentials;
        const isUpdatingCustom =
            customToUpdate &&
            typeof customToUpdate === 'object' &&
            Object.keys(customToUpdate).some(
                (k) => customToUpdate[k] !== undefined && customToUpdate[k] !== MASK_PLACEHOLDER
            );

        if (isUpdatingCustom) {
            const { otp } = req.body;
            if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
                return res.status(400).json({
                    message: 'One-Time PIN (OTP) verification is required to configure custom API credentials.',
                });
            }

            const crypto = require('crypto');
            const Instructor = require('../models/Instructor');
            const admin = await Instructor.findById(userId);

            if (!admin || admin.accountType !== 'Administrator') {
                return res.status(403).json({ message: 'Access denied. Administrator only.' });
            }

            if (!admin.apiSettingsOtp || !admin.apiSettingsOtpExpires) {
                return res.status(400).json({
                    message: 'No verification code requested. Please click "Send Code" to verify.',
                });
            }

            if (new Date() > new Date(admin.apiSettingsOtpExpires)) {
                admin.apiSettingsOtp = undefined;
                admin.apiSettingsOtpExpires = undefined;
                await admin.save();
                await logSettingAudit({
                    req,
                    action: ACTION.SETTING_OTP_VERIFY,
                    outcome: 'failure',
                    targetLabel: 'Custom API Setup Verification',
                    details: 'Failed OTP verification while saving custom API credentials (expired code)',
                });
                return res.status(400).json({
                    message: 'Verification code has expired. Please request a new code.',
                });
            }

            const hashedInput = crypto.createHash('sha256').update(otp.trim()).digest('hex');
            if (hashedInput !== admin.apiSettingsOtp) {
                await logSettingAudit({
                    req,
                    action: ACTION.SETTING_OTP_VERIFY,
                    outcome: 'failure',
                    targetLabel: 'Custom API Setup Verification',
                    details: 'Failed OTP verification while saving custom API credentials (incorrect code)',
                });
                return res.status(401).json({
                    message: 'Incorrect verification code. Please check your email and try again.',
                });
            }

            // OTP verified! Clear OTP so it is single-use
            admin.apiSettingsOtp = undefined;
            admin.apiSettingsOtpExpires = undefined;
            await admin.save();
        }

        if (customToUpdate && typeof customToUpdate === 'object') {
            Object.keys(CREDENTIAL_CONFIG).forEach((key) => {
                const val = customToUpdate[key];
                const config = CREDENTIAL_CONFIG[key];

                // Skip masked placeholder
                if (config.sensitive && val === MASK_PLACEHOLDER) {
                    return;
                }

                if (typeof val === 'string') {
                    const trimmed = val.trim();
                    if (trimmed === '') {
                        // Empty string deletes from DB (falls back to default API)
                        updates.push(Setting.deleteOne({ key }));
                    } else {
                        updates.push(
                            Setting.findOneAndUpdate(
                                { key },
                                { value: trimmed, updatedBy: userId },
                                { upsert: true, new: true }
                            )
                        );
                    }
                }
            });
        }

        // 3. Update default credentials (Right column) - ONLY allowed if ALLOW_DEFAULT_API_EDIT is enabled
        if (defaultCredentials && typeof defaultCredentials === 'object') {
            if (!ALLOW_DEFAULT_API_EDIT) {
                return res.status(403).json({
                    message: 'Default APIs cannot be edited. Enable ALLOW_DEFAULT_API_EDIT in server/controllers/settingController.js.',
                });
            }

            Object.keys(CREDENTIAL_CONFIG).forEach((key) => {
                const val = defaultCredentials[key];
                const config = CREDENTIAL_CONFIG[key];

                if (config.sensitive && val === MASK_PLACEHOLDER) {
                    return;
                }

                if (typeof val === 'string') {
                    const trimmed = val.trim();
                    const defaultKey = `DEFAULT_${key}`;
                    if (trimmed === '') {
                        updates.push(Setting.deleteOne({ key: defaultKey }));
                    } else {
                        updates.push(
                            Setting.findOneAndUpdate(
                                { key: defaultKey },
                                { value: trimmed, updatedBy: userId },
                                { upsert: true, new: true }
                            )
                        );
                    }
                }
            });
        }

        // 4. Update API modes if provided
        if (apiModes && typeof apiModes === 'object') {
            Object.keys(apiModes).forEach((group) => {
                const modeVal = apiModes[group];
                if (modeVal === 'default' || modeVal === 'custom') {
                    updates.push(
                        Setting.findOneAndUpdate(
                            { key: `MODE_${group}` },
                            { value: modeVal, updatedBy: userId },
                            { upsert: true, new: true }
                        )
                    );
                }
            });
        }

        await Promise.all(updates);

        // If Google Drive credentials were saved, reset the storage client
        try {
            const storageService = require('../utils/storageService');
            if (typeof storageService.resetDriveClient === 'function') {
                storageService.resetDriveClient();
            }
        } catch (e) {
            // ignore
        }

        // Record detailed audit log for admin settings update
        const updatedCustomGroups = customToUpdate && typeof customToUpdate === 'object'
            ? [...new Set(
                Object.keys(CREDENTIAL_CONFIG)
                    .filter((k) => typeof customToUpdate[k] === 'string' && customToUpdate[k] !== MASK_PLACEHOLDER)
                    .map((k) => SERVICE_LABELS[CREDENTIAL_CONFIG[k].group] || CREDENTIAL_CONFIG[k].group)
            )]
            : [];

        const updatedToggles = changedToggles.map(
            (t) => `${t.label}: ${t.enabled ? 'enabled' : 'disabled'}`
        );

        const isToggleOnly =
            settings &&
            typeof settings === 'object' &&
            updatedCustomGroups.length === 0 &&
            !defaultCredentials &&
            !apiModes;

        const targetLabel = updatedCustomGroups.length > 0
            ? updatedCustomGroups.join(', ')
            : isToggleOnly
                ? (changedToggles.length === 1 ? changedToggles[0].label : 'API Service Toggles')
                : 'System & API Settings';

        const detailsParts = [];
        if (updatedCustomGroups.length > 0) {
            detailsParts.push(`Configured custom API credentials for ${updatedCustomGroups.join(', ')}`);
        }
        if (apiModes && typeof apiModes === 'object') {
            const modeDesc = Object.keys(apiModes)
                .filter((g) => apiModes[g] === 'custom' || apiModes[g] === 'default')
                .map((g) => `${SERVICE_LABELS[g] || g}: ${apiModes[g]}`);
            if (modeDesc.length > 0) detailsParts.push(`Updated API modes (${modeDesc.join(', ')})`);
        }
        if (isToggleOnly) {
            if (changedToggles.length === 1) {
                const t = changedToggles[0];
                detailsParts.push(`${t.enabled ? 'Enabled' : 'Disabled'} ${t.label} integration`);
            } else if (updatedToggles.length > 0) {
                detailsParts.push(`Updated API toggles (${updatedToggles.join(', ')})`);
            } else {
                detailsParts.push('Updated API service toggles');
            }
        }

        await logSettingAudit({
            req,
            action: isToggleOnly ? ACTION.INTEGRATION_TOGGLE : ACTION.SETTING_UPDATE,
            targetLabel,
            details: detailsParts.join('; ') || 'Updated System & API Settings',
            meta: {
                hasTogglesUpdated: Boolean(settings),
                changedToggles,
                hasCustomCredentialsUpdated: updatedCustomGroups.length > 0,
                updatedCustomGroups,
                hasDefaultCredentialsUpdated: Boolean(defaultCredentials),
            },
        });

        res.json({ success: true, message: 'Settings and API credentials updated successfully.' });
    } catch (err) {
        console.error('Failed to update settings:', err);
        res.status(500).json({ message: 'Failed to save settings.' });
    }
};

// GET /api/settings/public (Open for login page)
exports.getPublicSettings = async (req, res) => {
    try {
        const records = await Setting.find({
            key: { $in: ['recaptchaEnabled', 'googleAuthEnabled', 'recaptchaSiteKey', 'googleClientId'] },
        });

        const recordMap = {};
        records.forEach((doc) => {
            recordMap[doc.key] = doc.value;
        });

        const publicSettings = {
            recaptchaEnabled:
                typeof recordMap.recaptchaEnabled === 'boolean'
                    ? recordMap.recaptchaEnabled
                    : TOGGLE_DEFAULTS.recaptchaEnabled,
            googleAuthEnabled:
                typeof recordMap.googleAuthEnabled === 'boolean'
                    ? recordMap.googleAuthEnabled
                    : TOGGLE_DEFAULTS.googleAuthEnabled,
            recaptchaSiteKey:
                recordMap.recaptchaSiteKey ||
                process.env.CUSTOM_VITE_RECAPTCHA_SITE_KEY ||
                process.env.VITE_RECAPTCHA_SITE_KEY ||
                '',
            googleClientId:
                recordMap.googleClientId ||
                process.env.CUSTOM_GOOGLE_CLIENT_ID ||
                process.env.GOOGLE_CLIENT_ID ||
                '',
        };

        res.json(publicSettings);
    } catch (err) {
        res.json({
            recaptchaEnabled: true,
            googleAuthEnabled: true,
            recaptchaSiteKey: process.env.VITE_RECAPTCHA_SITE_KEY || '',
            googleClientId: process.env.GOOGLE_CLIENT_ID || '',
        });
    }
};

// Helper function to check a toggle from anywhere in the backend
exports.isFeatureEnabled = async (key, fallback = true) => {
    try {
        const setting = await Setting.findOne({ key });
        return setting ? setting.value === true : fallback;
    } catch {
        return fallback;
    }
};

// POST /api/settings/verify-password (Admin only)
// Verifies the currently-logged-in admin's password before revealing/editing credentials.
exports.verifyAdminPassword = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ message: 'Password is required.' });
        }

        const bcrypt = require('bcryptjs');
        const Instructor = require('../models/Instructor');

        const user = await Instructor.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (!user.password) {
            return res.status(400).json({
                message: 'Your account uses Google Sign-In and has no local password. Please contact the system administrator.',
            });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            await logSettingAudit({
                req,
                action: ACTION.SETTING_PASSWORD_VERIFY,
                outcome: 'failure',
                targetLabel: 'API Settings Password Verification',
                details: 'Failed administrator password verification for API Settings',
            });
            return res.status(401).json({ message: 'Incorrect password. Please try again.' });
        }

        // Retrieve unmasked credentials for the verified session
        const records = await Setting.find({});
        const recordMap = {};
        records.forEach((r) => {
            recordMap[r.key] = r.value;
        });

        const unmaskedCustomCredentials = {};
        const unmaskedDefaultCredentials = {};
        const unmaskedCredentials = {};

        Object.keys(CREDENTIAL_CONFIG).forEach((key) => {
            const config = CREDENTIAL_CONFIG[key];
            const dbVal = recordMap[key] || '';
            const envCustomVal = config.customEnv ? process.env[config.customEnv] : '';
            const effectiveCustom = dbVal && dbVal.trim() !== '' ? dbVal : (envCustomVal || '');

            const dbDefault = recordMap[`DEFAULT_${key}`];
            const envVal = dbDefault || process.env[config.env] || '';

            unmaskedCustomCredentials[key] = effectiveCustom;
            unmaskedDefaultCredentials[key] = ALLOW_DEFAULT_API_EDIT ? envVal : formatDefaultCredential(envVal, config);

            // Fallback unmasked
            unmaskedCredentials[key] = effectiveCustom && effectiveCustom.trim() !== '' ? effectiveCustom : envVal;
        });

        await logSettingAudit({
            req,
            action: ACTION.SETTING_PASSWORD_VERIFY,
            targetLabel: 'API Settings Password Verification',
            details: 'Verified administrator password to access API credentials',
        });

        res.json({
            success: true,
            unmaskedCustomCredentials,
            unmaskedDefaultCredentials,
            unmaskedCredentials,
            allowDefaultEdit: ALLOW_DEFAULT_API_EDIT,
        });
    } catch (err) {
        console.error('verifyAdminPassword error:', err);
        res.status(500).json({ message: 'Verification failed. Please try again.' });
    }
};

// POST /api/settings/send-otp (Admin only)
// Sends a 6-digit OTP code to the administrator's email address to unlock API Settings.
exports.sendSettingsOtp = async (req, res) => {
    try {
        const crypto = require('crypto');
        const Instructor = require('../models/Instructor');
        const { sendEmail } = require('../utils/sendEmail');

        const admin = await Instructor.findById(req.user.id);
        if (!admin || admin.accountType !== 'Administrator') {
            return res.status(403).json({ message: 'Access denied. Administrator only.' });
        }

        if (!admin.email) {
            return res.status(400).json({ message: 'No administrator email found on account.' });
        }

        // Generate 6-digit numeric OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

        // Valid for 5 minutes
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        admin.apiSettingsOtp = hashedOtp;
        admin.apiSettingsOtpExpires = expiresAt;
        await admin.save();

        const formattedDate = expiresAt.toLocaleString('en-PH', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Asia/Manila',
        });

        // Send email asynchronously so the administrator receives an instant UI response
        // Always bypass googleMailEnabled toggle and fall back to default .env SMTP if needed
        sendEmail({
            to: admin.email,
            subject: 'COT Instructor E-Portfolio - API Settings Security Verification Code',
            bypassToggle: true,
            fallbackToDefault: true,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h2 style="color: #4338ca; margin: 0; font-size: 20px; font-weight: 700;">COT Instructor E-Portfolio</h2>
                        <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0;">Institutional System Administration</p>
                    </div>

                    <div style="border-top: 1px solid #f3f4f6; padding-top: 20px; margin-bottom: 20px;">
                        <h3 style="color: #111827; font-size: 16px; margin: 0 0 8px 0; font-weight: 600;">API Settings Security Verification</h3>
                        <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
                            Hello <strong>${admin.fullName || 'Administrator'}</strong>,
                        </p>
                        <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">
                            A request was made to unlock the <strong>API & Integration Settings</strong>. To verify your identity and protect sensitive credentials, please use the verification code below:
                        </p>

                        <div style="text-align: center; padding: 18px; background: #fff7ed; border: 1px dashed #fdba74; border-radius: 10px; margin-bottom: 20px;">
                            <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #ea580c; font-family: monospace;">
                                ${otp}
                            </div>
                            <div style="font-size: 12px; color: #9a3412; margin-top: 6px;">
                                Valid for 5 minutes (expires at ${formattedDate})
                            </div>
                        </div>

                        <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 0;">
                            If you did not initiate this request, please review your account activity and change your administrator password immediately.
                        </p>
                    </div>

                    <div style="border-top: 1px solid #f3f4f6; padding-top: 14px; text-align: center; color: #9ca3af; font-size: 11px;">
                        Bukidnon State University • College of Technologies
                    </div>
                </div>
            `,
        }).catch((err) => {
            console.error('sendSettingsOtp background email error:', err);
        });

        await logSettingAudit({
            req,
            action: ACTION.SETTING_OTP_SEND,
            targetLabel: 'API Settings OTP Request',
            details: `Sent 6-digit API Settings verification OTP to ${censorEmail(admin.email)}`,
        });

        res.json({
            success: true,
            message: 'Verification code sent to your email.',
            email: censorEmail(admin.email),
            adminProfile: {
                fullName: admin.fullName,
                email: censorEmail(admin.email),
                rawEmail: admin.email,
                photoUrl: admin.profile?.photoUrl || admin.googlePhotoUrl || admin.photoUrl,
                department: admin.department,
                accountType: admin.accountType || 'Administrator',
            },
        });
    } catch (err) {
        console.error('sendSettingsOtp error:', err);
        res.status(500).json({
            message: err.message || 'Failed to send verification code. Please check email service configuration.',
        });
    }
};

// POST /api/settings/verify-otp (Admin only)
// Verifies the 6-digit OTP code and returns unmasked credentials to unlock API Settings.
exports.verifySettingsOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
            return res.status(400).json({ message: 'Please enter a valid 6-digit verification code.' });
        }

        const crypto = require('crypto');
        const Instructor = require('../models/Instructor');

        const admin = await Instructor.findById(req.user.id);
        if (!admin || admin.accountType !== 'Administrator') {
            return res.status(403).json({ message: 'Access denied. Administrator only.' });
        }

        if (!admin.apiSettingsOtp || !admin.apiSettingsOtpExpires) {
            return res.status(400).json({ message: 'No verification code was requested. Please click "Send Code" first.' });
        }

        if (new Date() > new Date(admin.apiSettingsOtpExpires)) {
            admin.apiSettingsOtp = undefined;
            admin.apiSettingsOtpExpires = undefined;
            await admin.save();
            await logSettingAudit({
                req,
                action: ACTION.SETTING_OTP_VERIFY,
                outcome: 'failure',
                targetLabel: 'API Settings OTP Verification',
                details: 'Failed OTP verification to unlock API Settings (expired code)',
            });
            return res.status(400).json({ message: 'Verification code has expired. Please request a new code.' });
        }

        const hashedInput = crypto.createHash('sha256').update(otp.trim()).digest('hex');
        if (hashedInput !== admin.apiSettingsOtp) {
            await logSettingAudit({
                req,
                action: ACTION.SETTING_OTP_VERIFY,
                outcome: 'failure',
                targetLabel: 'API Settings OTP Verification',
                details: 'Failed OTP verification to unlock API Settings (incorrect code)',
            });
            return res.status(401).json({ message: 'Incorrect verification code. Please check your email and try again.' });
        }

        // Code is valid! Clear OTP so it is single-use
        admin.apiSettingsOtp = undefined;
        admin.apiSettingsOtpExpires = undefined;
        await admin.save();

        // Retrieve unmasked credentials for the verified session
        const records = await Setting.find({});
        const recordMap = {};
        records.forEach((r) => {
            recordMap[r.key] = r.value;
        });

        const unmaskedCustomCredentials = {};
        const unmaskedDefaultCredentials = {};
        const unmaskedCredentials = {};

        Object.keys(CREDENTIAL_CONFIG).forEach((key) => {
            const config = CREDENTIAL_CONFIG[key];
            const dbVal = recordMap[key] || '';
            const envCustomVal = config.customEnv ? process.env[config.customEnv] : '';
            const effectiveCustom = dbVal && dbVal.trim() !== '' ? dbVal : (envCustomVal || '');

            const dbDefault = recordMap[`DEFAULT_${key}`];
            const envVal = dbDefault || process.env[config.env] || '';

            unmaskedCustomCredentials[key] = effectiveCustom;
            unmaskedDefaultCredentials[key] = ALLOW_DEFAULT_API_EDIT ? envVal : formatDefaultCredential(envVal, config);

            unmaskedCredentials[key] = effectiveCustom && effectiveCustom.trim() !== '' ? effectiveCustom : envVal;
        });

        await logSettingAudit({
            req,
            action: ACTION.SETTING_OTP_VERIFY,
            targetLabel: 'API Settings OTP Verification',
            details: 'Verified email OTP for API & Integration Settings',
        });

        await logSettingAudit({
            req,
            action: ACTION.SETTING_ACCESS,
            targetLabel: 'API & Integration Settings',
            details: 'Opened API & Integration Settings after email OTP verification',
        });

        res.json({
            success: true,
            unmaskedCustomCredentials,
            unmaskedDefaultCredentials,
            unmaskedCredentials,
            allowDefaultEdit: ALLOW_DEFAULT_API_EDIT,
        });
    } catch (err) {
        console.error('verifySettingsOtp error:', err);
        res.status(500).json({ message: 'Verification failed. Please try again.' });
    }
};

// PUT /api/settings/modes (Admin only)
// Sets active API mode ('custom' or 'default') for service groups
exports.updateApiModes = async (req, res) => {
    try {
        const { modes, group, mode } = req.body;
        const userId = req.user?.id;
        const updates = [];

        const allRecords = await Setting.find({
            key: { $in: [...Object.keys(CREDENTIAL_CONFIG), ...SERVICE_GROUPS.map((g) => `MODE_${g}`)] },
        }).lean();
        const existingMap = {};
        allRecords.forEach((doc) => { existingMap[doc.key] = doc.value; });

        if (group && (mode === 'custom' || mode === 'default')) {
            if (mode === 'custom' && !isGroupCustomConfigured(group, existingMap)) {
                return res.status(400).json({
                    message: `Cannot switch ${SERVICE_LABELS[group] || group} to Custom API because no custom credentials are configured.`,
                });
            }
            updates.push(
                Setting.findOneAndUpdate(
                    { key: `MODE_${group}` },
                    { value: mode, updatedBy: userId },
                    { upsert: true, new: true }
                )
            );
        } else if (modes && typeof modes === 'object') {
            for (const g of Object.keys(modes)) {
                const m = modes[g];
                if (m === 'custom' && !isGroupCustomConfigured(g, existingMap)) {
                    return res.status(400).json({
                        message: `Cannot switch ${SERVICE_LABELS[g] || g} to Custom API because no custom credentials are configured.`,
                    });
                }
                if (m === 'custom' || m === 'default') {
                    updates.push(
                        Setting.findOneAndUpdate(
                            { key: `MODE_${g}` },
                            { value: m, updatedBy: userId },
                            { upsert: true, new: true }
                        )
                    );
                }
            }
        }

        await Promise.all(updates);

        // Fetch refreshed modes
        const records = await Setting.find({
            key: { $in: SERVICE_GROUPS.map((g) => `MODE_${g}`) },
        });
        const recordMap = {};
        records.forEach((doc) => { recordMap[doc.key] = doc.value; });
        const apiModes = {};
        SERVICE_GROUPS.forEach((g) => {
            apiModes[g] = recordMap[`MODE_${g}`] || 'default';
        });

        const changedModeDesc = group && (mode === 'custom' || mode === 'default')
            ? [`${SERVICE_LABELS[group] || group}: ${mode}`]
            : modes && typeof modes === 'object'
                ? Object.keys(modes)
                    .filter((g) => modes[g] === 'custom' || modes[g] === 'default')
                    .map((g) => `${SERVICE_LABELS[g] || g}: ${modes[g]}`)
                : [];

        await logSettingAudit({
            req,
            action: ACTION.SETTING_MODE_CHANGE,
            targetLabel: group ? (SERVICE_LABELS[group] || group) : 'API Service Modes',
            details: changedModeDesc.length > 0
                ? `Changed API mode (${changedModeDesc.join(', ')})`
                : 'Updated active API mode',
            meta: { group, mode, modes },
        });

        res.json({
            success: true,
            message: 'Active API mode updated successfully.',
            apiModes,
        });
    } catch (err) {
        console.error('Failed to update API modes:', err);
        res.status(500).json({ message: 'Failed to update active API mode.' });
    }
};

// POST /api/settings/restore-defaults (Admin only)
// Sets all service groups to 'default' mode without deleting custom credentials
exports.restoreDefaults = async (req, res) => {
    try {
        const userId = req.user?.id;
        const updates = SERVICE_GROUPS.map((group) => {
            return Setting.findOneAndUpdate(
                { key: `MODE_${group}` },
                { value: 'default', updatedBy: userId },
                { upsert: true, new: true }
            );
        });

        await Promise.all(updates);

        const apiModes = {};
        SERVICE_GROUPS.forEach((g) => { apiModes[g] = 'default'; });

        await logSettingAudit({
            req,
            action: ACTION.SETTING_RESTORE_DEFAULTS,
            targetLabel: 'All API Integrations',
            details: 'Restored all APIs to system defaults (custom configurations preserved)',
        });

        res.json({
            success: true,
            message: 'All APIs have been restored to system defaults. Custom configurations remain preserved.',
            apiModes,
        });
    } catch (err) {
        console.error('Failed to restore default APIs:', err);
        res.status(500).json({ message: 'Failed to restore default APIs.' });
    }
};

// Helper to translate cryptic raw errors into clear, actionable advice for admins
function formatConnectionError(err, service) {
    const msg = err?.message || String(err || '');
    if (service === 'googleMail') {
        if (msg.includes('534-5.7.9') || msg.includes('WebLoginRequired') || msg.includes('Application-specific password required')) {
            return 'Gmail authentication failed. Please use a valid Google App Password.';
        }
        if (msg.includes('535-5.7.8') || msg.includes('Username and Password not accepted') || msg.includes('BadCredentials')) {
            return 'Gmail authentication failed. Invalid email address or App Password.';
        }
        if (msg.includes('ETIMEDOUT') || msg.includes('ESOCKET') || msg.includes('ECONNREFUSED') || msg.includes('timed out')) {
            return 'Connection timed out. Unable to reach Google Mail.';
        }
        return 'Gmail connection failed. Please check your credentials.';
    }

    if (service === 'googleDrive') {
        if (msg.includes('invalid_grant')) {
            return 'Google Drive connection failed. Invalid or expired Refresh Token.';
        }
        if (msg.includes('invalid_client')) {
            return 'Google Drive connection failed. Invalid Client ID or Client Secret.';
        }
        if (msg.includes('404') || msg.includes('File not found')) {
            return 'Google Drive warning: Credentials are valid, but the Root Folder was not found or is inaccessible.';
        }
        return 'Google Drive connection failed. Please check your credentials.';
    }

    if (service === 'recaptcha') {
        if (msg.includes('invalid-input-secret')) {
            return 'Google reCAPTCHA connection failed. Invalid Secret Key.';
        }
        return 'Google reCAPTCHA connection failed. Please check your credentials.';
    }

    if (service === 'googleSheets') {
        if (msg.includes('invalid_grant') || msg.includes('error:0909006C') || msg.includes('PEM') || msg.includes('key')) {
            return 'Google Sheets connection failed. Invalid Private Key.';
        }
        if (msg.includes('invalid_client')) {
            return 'Google Sheets connection failed. Invalid Service Account email.';
        }
        return 'Google Sheets connection failed. Please check your credentials.';
    }

    return 'Connection test failed. Please verify your credentials.';
}

const withTimeout = (promise, ms = 5000, errorMsg = 'Connection check timed out after 5 seconds.') => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
    ]);
};

// POST /api/settings/test-connection (Admin only)
// Tests whether the API credentials for a given service work properly
exports.testConnection = async (req, res) => {
    const { service, credentials = {} } = req.body;
    const sendTestResult = async (statusCode, success, message) => {
        await logSettingAudit({
            req,
            action: ACTION.SETTING_TEST_CONNECTION,
            outcome: success ? 'success' : 'failure',
            targetLabel: SERVICE_LABELS[service] || service || 'API Connection Test',
            details: message,
            meta: { service },
        });
        return res.status(statusCode).json({ success, message });
    };

    try {
        if (!service) {
            return sendTestResult(400, false, 'Service name is required for testing connection.');
        }

        const isTestingCustomPayload = credentials && typeof credentials === 'object' && Object.keys(credentials).length > 0;

        // Helper to resolve credential: provided in body (if not masked) > custom DB/env > (default only when not testing custom form)
        const resolveVal = async (key) => {
            const config = CREDENTIAL_CONFIG[key];
            const raw = credentials[key];
            if (raw && typeof raw === 'string' && raw.trim() !== '' && raw !== MASK_PLACEHOLDER) {
                return raw.trim();
            }
            if (isTestingCustomPayload && raw !== MASK_PLACEHOLDER) {
                return '';
            }
            // Fallback to custom in DB or .env
            const dbDoc = await Setting.findOne({ key });
            if (dbDoc && dbDoc.value && String(dbDoc.value).trim() !== '') {
                return String(dbDoc.value).trim();
            }
            if (config?.customEnv && process.env[config.customEnv]) {
                return process.env[config.customEnv].trim();
            }
            if (isTestingCustomPayload) {
                return '';
            }
            // Fallback to default in DB or .env
            const defaultDoc = await Setting.findOne({ key: `DEFAULT_${key}` });
            if (defaultDoc && defaultDoc.value && String(defaultDoc.value).trim() !== '') {
                return String(defaultDoc.value).trim();
            }
            if (config?.env && process.env[config.env]) {
                return process.env[config.env].trim();
            }
            return '';
        };

        if (service === 'googleMail') {
            const user = await resolveVal('emailUser');
            const pass = await resolveVal('emailPass');
            if (!user || !pass) {
                return sendTestResult(
                    400,
                    false,
                    'Missing Gmail address or App Password. Please provide both to test connection.'
                );
            }
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user, pass },
                connectionTimeout: 4000,
                greetingTimeout: 3000,
                socketTimeout: 4500,
            });
            await withTimeout(transporter.verify(), 5000, 'Gmail SMTP connection timed out after 5 seconds.');
            return sendTestResult(200, true, `Connection successful! Authenticated with Google Mail (${user}).`);
        }

        if (service === 'googleDrive') {
            const clientId = await resolveVal('googleDriveClientId');
            const clientSecret = await resolveVal('googleDriveClientSecret');
            const refreshToken = await resolveVal('googleDriveRefreshToken');
            const rootFolderId = await resolveVal('googleDriveRootFolderId');

            if (!clientId || !clientSecret || !refreshToken) {
                return sendTestResult(
                    400,
                    false,
                    'Missing Google Drive Client ID, Client Secret, or Refresh Token.'
                );
            }

            const { google } = require('googleapis');
            const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
            oauth2Client.setCredentials({ refresh_token: refreshToken });
            const tokenRes = await withTimeout(
                oauth2Client.getAccessToken(),
                5000,
                'Google Drive OAuth token request timed out.'
            );
            if (!tokenRes.token) {
                throw new Error('Google OAuth server did not return an access token.');
            }

            let folderDetails = '';
            if (rootFolderId) {
                try {
                    const drive = google.drive({ version: 'v3', auth: oauth2Client });
                    const file = await withTimeout(
                        drive.files.get({ fileId: rootFolderId, fields: 'id, name, mimeType' }),
                        3500,
                        'Root folder lookup timed out.'
                    );
                    folderDetails = ` Root folder "${file.data.name || rootFolderId}" accessed.`;
                } catch (folderErr) {
                    folderDetails = ` Note: Root folder access warning (${folderErr.message}).`;
                }
            }

            return sendTestResult(
                200,
                true,
                `Connection successful! Google Drive OAuth credentials verified.${folderDetails}`
            );
        }

        if (service === 'recaptcha') {
            const siteKey = await resolveVal('recaptchaSiteKey');
            const secret = await resolveVal('recaptchaSecret');
            if (!siteKey || !secret) {
                return sendTestResult(400, false, 'Both Google reCAPTCHA Site Key and Secret Key are required.');
            }

            const recaptchaKeyPattern = /^6L[a-zA-Z0-9_-]{38}$/;
            if (!recaptchaKeyPattern.test(siteKey)) {
                return sendTestResult(400, false, 'Invalid Google reCAPTCHA Site Key.');
            }
            if (!recaptchaKeyPattern.test(secret)) {
                return sendTestResult(400, false, 'Invalid Google reCAPTCHA Secret Key.');
            }
            if (siteKey === secret) {
                return sendTestResult(400, false, 'Site Key and Secret Key cannot be the same.');
            }

            // Ping Google siteverify with a dummy test response token and 4.5s timeout
            const url = `https://www.google.com/recaptcha/api/siteverify?secret=${encodeURIComponent(secret)}&response=test_dummy_verification_token`;
            const gRes = await fetch(url, {
                method: 'POST',
                signal: AbortSignal.timeout(4500),
            });
            const gData = await gRes.json();

            // If secret is INVALID, Google returns error code "invalid-input-secret"
            if (gData['error-codes'] && gData['error-codes'].includes('invalid-input-secret')) {
                return sendTestResult(400, false, 'Google reCAPTCHA Secret Key is invalid.');
            }

            return sendTestResult(
                200,
                true,
                'Connection successful! Google reCAPTCHA Site Key and Secret Key verified.'
            );
        }

        if (service === 'googleSheets') {
            const clientEmail = await resolveVal('googleSheetsClientEmail');
            const rawKey = await resolveVal('googleSheetsPrivateKey');

            if (!clientEmail || !rawKey) {
                return sendTestResult(400, false, 'Missing Google Sheets Service Account email or private key.');
            }

            const { google } = require('googleapis');
            const privateKey = rawKey.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
            const jwtClient = new google.auth.JWT({
                email: clientEmail,
                key: privateKey,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
            await withTimeout(
                jwtClient.authorize(),
                5000,
                'Google Sheets authorization timed out.'
            );

            return sendTestResult(
                200,
                true,
                `Connection successful! Google Sheets Service Account (${clientEmail}) authorized.`
            );
        }

        if (service === 'googleAuth') {
            const clientId = await resolveVal('googleClientId');
            if (!clientId) {
                return sendTestResult(400, false, 'Missing Google Sign-In Client ID.');
            }

            const googleClientIdPattern = /^\d{10,25}-[a-zA-Z0-9_-]{16,64}\.apps\.googleusercontent\.com$/;
            if (!googleClientIdPattern.test(clientId)) {
                return sendTestResult(400, false, 'Invalid Google Sign-In Client ID.');
            }

            // Verify Client ID with Google's OAuth 2.0 authorization endpoint (4.5s timeout)
            const authCheckUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent('https://localhost')}&response_type=code&scope=openid`;
            const authRes = await fetch(authCheckUrl, {
                method: 'GET',
                redirect: 'follow',
                signal: AbortSignal.timeout(4500),
            });
            const authBody = await authRes.text();
            if (
                authRes.status >= 400 ||
                /invalid_client|OAuth client was not found|deleted_client/i.test(authBody)
            ) {
                return sendTestResult(400, false, 'Google Sign-In Client ID is invalid or not found.');
            }

            return sendTestResult(
                200,
                true,
                'Connection successful! Google Sign-In Client ID verified.'
            );
        }

        return sendTestResult(400, false, `Unknown service: "${service}".`);
    } catch (err) {
        console.error('Test connection error:', err);
        return sendTestResult(400, false, formatConnectionError(err, service));
    }
};
