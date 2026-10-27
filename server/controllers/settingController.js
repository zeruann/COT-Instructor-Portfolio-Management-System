// server/controllers/settingController.js
const Setting = require('../models/Setting');

// Default toggle states
const TOGGLE_DEFAULTS = {
    googleMailEnabled: true,
    recaptchaEnabled: true,
    googleDriveEnabled: true,
    googleAuthEnabled: true,
};

// Map of credential keys and their .env fallbacks
const CREDENTIAL_CONFIG = {
    // Google Mail
    emailUser: { env: 'EMAIL_USER', sensitive: false },
    emailPass: { env: 'EMAIL_PASS', sensitive: true },

    // Google Drive
    googleDriveClientId: { env: 'GOOGLE_DRIVE_CLIENT_ID', sensitive: false },
    googleDriveClientSecret: { env: 'GOOGLE_DRIVE_CLIENT_SECRET', sensitive: true },
    googleDriveRefreshToken: { env: 'GOOGLE_DRIVE_REFRESH_TOKEN', sensitive: true },
    googleDriveRootFolderId: { env: 'GOOGLE_DRIVE_ROOT_FOLDER_ID', sensitive: false },

    // Google Sign-In
    googleClientId: { env: 'GOOGLE_CLIENT_ID', sensitive: false },

    // Google reCAPTCHA
    recaptchaSiteKey: { env: 'VITE_RECAPTCHA_SITE_KEY', sensitive: false },
    recaptchaSecret: { env: 'RECAPTCHA_SECRET', sensitive: true },
};

const MASK_PLACEHOLDER = '••••••••••••••••';

/**
 * Helper to fetch a setting with fallback to process.env
 */
exports.getSettingOrEnv = async (key, envVar) => {
    try {
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
    } catch (err) {
        console.warn(`[Settings] Failed reading key "${key}":`, err.message);
    }
    return envVar ? process.env[envVar] : undefined;
};

// GET /api/settings (Admin only)
exports.getSettings = async (req, res) => {
    try {
        const toggleKeys = Object.keys(TOGGLE_DEFAULTS);
        const credKeys = Object.keys(CREDENTIAL_CONFIG);

        const records = await Setting.find({
            key: { $in: [...toggleKeys, ...credKeys] },
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

        // 2. Build credentials
        const credentials = {};
        const credentialStatus = {};

        credKeys.forEach((key) => {
            const config = CREDENTIAL_CONFIG[key];
            const dbVal = recordMap[key];
            const envVal = process.env[config.env];
            const hasValue = Boolean(
                (dbVal && String(dbVal).trim() !== '') || (envVal && String(envVal).trim() !== '')
            );
            const isCustomizedInDb = Boolean(dbVal && String(dbVal).trim() !== '');

            credentialStatus[key] = {
                isConfigured: hasValue,
                source: isCustomizedInDb ? 'Database (Institutional)' : envVal ? '.env (Default)' : 'Not Set',
            };

            if (config.sensitive) {
                credentials[key] = hasValue ? MASK_PLACEHOLDER : '';
            } else {
                credentials[key] = isCustomizedInDb ? dbVal : envVal || '';
            }
        });

        res.json({
            success: true,
            settings,
            credentials,
            credentialStatus,
        });
    } catch (err) {
        console.error('Failed to get settings:', err);
        res.status(500).json({ message: 'Failed to retrieve settings.' });
    }
};

// PUT /api/settings (Admin only)
exports.updateSettings = async (req, res) => {
    try {
        const { settings, credentials } = req.body;
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

        // 2. Update credentials if provided
        if (credentials && typeof credentials === 'object') {
            Object.keys(CREDENTIAL_CONFIG).forEach((key) => {
                const val = credentials[key];
                const config = CREDENTIAL_CONFIG[key];

                // Skip masked placeholder (means user left existing password unchanged)
                if (config.sensitive && val === MASK_PLACEHOLDER) {
                    return;
                }

                if (typeof val === 'string') {
                    const trimmed = val.trim();
                    if (trimmed === '') {
                        // If empty, remove from DB to revert to .env fallback
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
                recordMap.recaptchaSiteKey || process.env.VITE_RECAPTCHA_SITE_KEY || '',
            googleClientId:
                recordMap.googleClientId || process.env.GOOGLE_CLIENT_ID || '',
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

        const unmaskedCredentials = {};
        Object.keys(CREDENTIAL_CONFIG).forEach((key) => {
            const config = CREDENTIAL_CONFIG[key];
            const dbVal = recordMap[key];
            const envVal = process.env[config.env];
            const val = (dbVal && String(dbVal).trim() !== '') ? dbVal : (envVal || '');
            unmaskedCredentials[key] = val;
        });

        res.json({ success: true, unmaskedCredentials });
    } catch (err) {
        console.error('verifyAdminPassword error:', err);
        res.status(500).json({ message: 'Verification failed. Please try again.' });
    }
};
