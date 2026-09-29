import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

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
    position: '',
    contactNumber: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError('This setup link is missing its token.');
      setLoading(false);
      return;
    }
    fetch(`/api/invitations/token/${token}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'This link is not valid.');
        if (!data.needsSetup) throw new Error('This account has no setup pending.');
        setInfo(data);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setFormError('');
    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters.');
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
          position: form.position,
          contactNumber: form.contactNumber,
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
              Welcome, {info.fullName}. Create a password and finish your profile.
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
                <label className="text-sm text-gray-500 block mb-1.5">Position</label>
                <input name="position" value={form.position} onChange={handleChange} placeholder="e.g. Instructor I" className={inputClass} />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1.5">Contact Number</label>
                <input name="contactNumber" value={form.contactNumber} onChange={handleChange} placeholder="09XX XXX XXXX" className={inputClass} />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1.5">Password</label>
                <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="At least 8 characters" className={inputClass} />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1.5">Confirm Password</label>
                <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} className={inputClass} />
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