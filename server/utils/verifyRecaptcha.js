async function verifyRecaptcha(token) {
    if (!token) {
        console.log('reCAPTCHA: no token received');
        return false;
    }

    try {
        const params = new URLSearchParams({
            secret: process.env.RECAPTCHA_SECRET,
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