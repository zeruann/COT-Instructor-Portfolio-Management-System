import PasswordChecklist from '../../components/PasswordChecklist';
import { isPasswordValid } from '../../utils/passwordRules';
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function PasswordInput({ name, value, onChange, placeholder, className }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        name={name}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
      >
        {show ? (
          // eye-off
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.7 9.7 0 0112 5c5 0 9 4.5 10 7a11.8 11.8 0 01-3.2 4.3M6.1 6.1A11.8 11.8 0 002 12c1 2.5 5 7 10 7a9.6 9.6 0 004.1-.9" />
          </svg>
        ) : (
          // eye
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

function SetupProfile() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();

  const [info, setInfo] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

useEffect(() => {
  if (!token) {
    setLoadError('This setup link is missing a token.');
    setLoading(false);
    return;
  }

  fetch(`/api/invitations/token/${token}`)
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Link unavailable.');
      if (!data.needsSetup) throw new Error('This account is already set up. Please log in.');
      setInfo(data);
    })
    .catch((err) => setLoadError(err.message))
    .finally(() => setLoading(false));
}, [token]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setFormError('');
    if (!isPasswordValid(form.password)) {
      setFormError('Password does not meet all the requirements.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/invitations/token/${token}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: form.password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.message || 'Could not finish setup. Try again.');
        return;
      }
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setFormError('We couldn’t reach the server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all';

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-8">
        {loading && <p className="text-sm text-gray-400 text-center">Loading…</p>}

        {!loading && loadError && (
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-800 mb-2">Link unavailable</h1>
            <p className="text-sm text-gray-500">{loadError}</p>
          </div>
        )}

        {!loading && info && done && (
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-800 mb-2">You’re all set</h1>
            <p className="text-sm text-gray-500">Your account is ready. Taking you to login…</p>
          </div>
        )}

        {!loading && info && !done && (
          <>
            <h1 className="text-xl font-semibold text-gray-800 mb-1">Set up your account</h1>
            <p className="text-sm text-gray-500 mb-6">
              Welcome, {info.fullName}. Create a password to activate your account.
            </p>

            <div className="grid gap-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1.5">Email</label>
                <input value={info.email} disabled className={`${inputClass} bg-gray-50 text-gray-400`} />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1.5">Department</label>
                <input value={info.department} disabled className={`${inputClass} bg-gray-50 text-gray-400`} />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1.5">Password</label>
                <PasswordInput name="password" value={form.password} onChange={handleChange} className={inputClass} />
                <PasswordChecklist password={form.password} />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1.5">Confirm Password</label>
                <PasswordInput
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            {formError && <p className="text-sm text-red-500 mt-4">{formError}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full px-6 py-2.5 text-sm font-semibold shadow-lg shadow-orange-200 transition-all disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Complete Setup'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default SetupProfile;