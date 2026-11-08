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
};

// Map of credential keys, their default .env fallback, and optional custom .env override
const CREDENTIAL_CONFIG = {
    // Google Mail
    emailUser: { env: 'EMAIL_USER', customEnv: 'CUSTOM_EMAIL_USER', sensitive: false, isEmail: true },
    emailPass: { env: 'EMAIL_PASS', customEnv: 'CUSTOM_EMAIL_PASS', sensitive: true },

    // Google Drive
    googleDriveClientId: { env: 'GOOGLE_DRIVE_CLIENT_ID', customEnv: 'CUSTOM_GOOGLE_DRIVE_CLIENT_ID', sensitive: false },
    googleDriveClientSecret: { env: 'GOOGLE_DRIVE_CLIENT_SECRET', customEnv: 'CUSTOM_GOOGLE_DRIVE_CLIENT_SECRET', sensitive: true },
    googleDriveRefreshToken: { env: 'GOOGLE_DRIVE_REFRESH_TOKEN', customEnv: 'CUSTOM_GOOGLE_DRIVE_REFRESH_TOKEN', sensitive: true },
    googleDriveRootFolderId: { env: 'GOOGLE_DRIVE_ROOT_FOLDER_ID', customEnv: 'CUSTOM_GOOGLE_DRIVE_ROOT_FOLDER_ID', sensitive: false },

    // Google Sign-In
    googleClientId: { env: 'GOOGLE_CLIENT_ID', customEnv: 'CUSTOM_GOOGLE_CLIENT_ID', sensitive: false },

    // Google reCAPTCHA
    recaptchaSiteKey: { env: 'VITE_RECAPTCHA_SITE_KEY', customEnv: 'CUSTOM_VITE_RECAPTCHA_SITE_KEY', sensitive: false },
    recaptchaSecret: { env: 'RECAPTCHA_SECRET', customEnv: 'CUSTOM_RECAPTCHA_SECRET', sensitive: true },
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

        // 1. Custom API configured in database (via UI) takes highest priority
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

        // 2. Custom API configured in .env (e.g. CUSTOM_EMAIL_USER)
        if (customEnvVar && process.env[customEnvVar] && process.env[customEnvVar].trim() !== '') {
            return process.env[customEnvVar].trim();
        }

        // 3. Default API database override
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

        const records = await Setting.find({
            key: { $in: [...toggleKeys, ...credKeys, ...defaultCredKeys] },
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
            } else if (config.isEmail && hasCustom) {
                customCredentials[key] = censorEmail(effectiveCustomVal);
            } else {
                customCredentials[key] = effectiveCustomVal || '';
            }

            // Default credentials (Right Column)
            if (!ALLOW_DEFAULT_API_EDIT) {
                // Read-only / locked mode
                if (config.sensitive) {
                    defaultCredentials[key] = hasDefault ? MASK_PLACEHOLDER : '';
                } else if (config.isEmail) {
                    defaultCredentials[key] = censorEmail(envVal);
                } else {
                    defaultCredentials[key] = envVal;
                }
            } else {
                // Editable mode enabled via backend switch
                if (config.sensitive) {
                    defaultCredentials[key] = hasDefault ? MASK_PLACEHOLDER : '';
                } else {
                    defaultCredentials[key] = envVal;
                }
            }
        });

        res.json({
            success: true,
            settings,
            customCredentials,
            defaultCredentials,
            credentialStatus,
            allowDefaultEdit: ALLOW_DEFAULT_API_EDIT,
        });
    } catch (err) {
        console.error('Failed to get settings:', err);
        res.status(500).json({ message: 'Failed to retrieve settings.' });
    }
};

// PUT /api/settings (Admin only)
exports.updateSettings = async (req, res) => {
    try {
        const { settings, credentials, customCredentials, defaultCredentials } = req.body;
        const userId = req.user?.id;

        const updates = [];

        // 1. Update toggles if provided
        if (settings && typeof settings === 'object') {
            Object.keys(TOGGLE_DEFAULTS).forEach((key) => {
                if (typeof settings[key] === 'boolean') {
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

        // 2. Update custom credentials (Left column)
        const customToUpdate = customCredentials || credentials;
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

        // Record audit log for admin settings update
        await logAudit({
            actor: req.user,
            action: ACTION.SETTING_UPDATE,
            targetType: 'setting',
            targetLabel: 'System & API Settings',
            meta: {
                hasTogglesUpdated: Boolean(settings),
                hasCustomCredentialsUpdated: Boolean(customCredentials || credentials),
                hasDefaultCredentialsUpdated: Boolean(defaultCredentials),
            },
            req,
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
            if (ALLOW_DEFAULT_API_EDIT) {
                unmaskedDefaultCredentials[key] = envVal;
            } else {
                unmaskedDefaultCredentials[key] = config.isEmail ? censorEmail(envVal) : (config.sensitive ? MASK_PLACEHOLDER : envVal);
            }

            // Fallback unmasked
            unmaskedCredentials[key] = effectiveCustom && effectiveCustom.trim() !== '' ? effectiveCustom : envVal;
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
