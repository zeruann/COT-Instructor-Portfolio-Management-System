const Setting = require('../models/Setting');
const { getSettingOrEnv } = require('../controllers/settingController');

async function verifyRecaptcha(token) {
    // Check if reCAPTCHA is turned off in settings
    try {
        const setting = await Setting.findOne({ key: 'recaptchaEnabled' });
        if (setting && setting.value === false) {
            console.log('reCAPTCHA is disabled in settings. Skipping check.');
            return true; // Auto-pass
        }
    } catch (err) {
        console.warn('Error reading recaptcha setting, falling back to verify:', err);
    }

    if (!token) {
        console.log('reCAPTCHA: no token received');
        return false;
    }

    try {
        const secret = await getSettingOrEnv('recaptchaSecret', 'RECAPTCHA_SECRET');
        const params = new URLSearchParams({
            secret,
            response: token,
        });

        const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            body: params,
        });
        const data = await res.json();
        console.log('reCAPTCHA result:', data);
        return data.success === true;
    } catch (err) {
        console.error('reCAPTCHA verify error:', err);
        return false;
    }
}

module.exports = verifyRecaptcha;