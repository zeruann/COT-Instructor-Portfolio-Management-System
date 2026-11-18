import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Mail, Briefcase, Award, Building2 } from 'lucide-react';
import PasswordChecklist from '../../components/PasswordChecklist';
import { isPasswordValid } from '../../utils/passwordRules';

const EyeIcon = ({ off, ...props }) =>
  off ? (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.94 11.94 0 013.19-4.62m3.32-2.32A9.99 9.99 0 0112 5c5 0 9.27 3.11 11 7.5a11.9 11.9 0 01-4.11 5.41M3 3l18 18" />
    </svg>
  ) : (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

function getInitials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
}

function getDisplayNameFromProfile(data) {
  if (!data) return null;
  const p = data.profile || {};
  const parts = [p.firstName, p.middleName, p.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return data.fullName || null;
}

export default function InstructorSecurity() {
  const [userData, setUserData] = useState(null);
  const [imgError, setImgError] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load instructor data matching AppLayout / TopBar
  useEffect(() => {
    const stored = localStorage.getItem('instructor') || localStorage.getItem('user');
    if (stored) {
      try {
        setUserData(JSON.parse(stored));
      } catch (err) {
        console.error('Failed to parse user data:', err);
      }
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/profile/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => {
        if (!me) return;
        setUserData((prev) => ({
          ...(prev || {}),
          ...me,
        }));
      })
      .catch((err) => console.warn('Could not fetch instructor profile for security page:', err));
  }, []);

  const isValid = isPasswordValid(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setTouched(true);

    if (!isValid) {
      setError('New password does not meet security requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/profile/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to change password.');
      }

      setSuccess('Your password has been updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTouched(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayName = getDisplayNameFromProfile(userData) || userData?.fullName || userData?.name || 'Instructor';
  const avatarUrl = userData?.profile?.photoUrl || userData?.googlePhotoUrl || userData?.photoUrl;
  const email = userData?.email || userData?.profile?.email || '—';
  const department = userData?.profile?.department || userData?.department || '—';
  const position = userData?.profile?.position || userData?.position || 'Faculty Member';
  const academicRank = userData?.profile?.academicRank || userData?.academicRank;

  return (
    <div className="w-full space-y-6">
      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-purple sm:text-2xl">
          Security &amp; Password
        </h1>
        <p className="mt-1 text-sm font-medium text-gray-500">
          Manage your account credentials and security preferences.
        </p>
      </div>

      {/* TWO COLUMNS CONTAINER WITH MATCHING HEIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* FIRST COLUMN: BASIC INSTRUCTOR INFO & GMAIL PROFILE PHOTO */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-xs border border-gray-100 p-6 md:p-7 flex flex-col">
          <div className="flex flex-col items-center text-center pb-6 border-b border-gray-100">
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-24 w-24 rounded-full object-cover shrink-0 border-2 border-orange-200 shadow-sm mb-3.5"
              />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-orange font-bold text-white text-2xl shrink-0 shadow-sm mb-3.5">
                {getInitials(displayName)}
              </span>
            )}
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{displayName}</h2>
            <p className="text-sm text-gray-500 mt-1">{email}</p>
            {academicRank && (
              <span className="mt-2.5 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200">
                {academicRank}
              </span>
            )}
          </div>

          {/* BASIC INFORMATION DETAILS WITH BALANCED SPACING */}
          <div className="pt-6 flex-1 flex flex-col justify-around min-h-[220px]">
            <div className="flex items-center gap-3.5">
              <div className="bg-orange-50 p-2.5 rounded-xl text-orange-500 shrink-0">
                <Mail size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 font-medium">Email Address</p>
                <p className="text-sm text-gray-800 font-semibold truncate mt-0.5" title={email}>{email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="bg-orange-50 p-2.5 rounded-xl text-orange-500 shrink-0">
                <Building2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 font-medium">Department</p>
                <p className="text-sm text-gray-800 font-semibold mt-0.5">{department}</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="bg-orange-50 p-2.5 rounded-xl text-orange-500 shrink-0">
                <Briefcase size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 font-medium">Position</p>
                <p className="text-sm text-gray-800 font-semibold mt-0.5">{position}</p>
              </div>
            </div>

            {academicRank && (
              <div className="flex items-center gap-3.5">
                <div className="bg-orange-50 p-2.5 rounded-xl text-orange-500 shrink-0">
                  <Award size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400 font-medium">Academic Rank</p>
                  <p className="text-sm text-gray-800 font-semibold mt-0.5">{academicRank}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECOND COLUMN: CHANGE PASSWORD FORM */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-xs border border-gray-100 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="mb-5">
              <h2 className="text-base font-bold text-gray-800 mb-1">Change Password</h2>
              <p className="text-sm text-gray-500">
                For your protection, choose a strong password with letters, numbers, and symbols.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form id="change-password-form" onSubmit={handleSubmit} className="space-y-5">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 pl-3.5 pr-10 text-sm text-gray-800 focus:outline-none focus:border-orange-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    <EyeIcon off={showCurrent} className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setTouched(true);
                    }}
                    placeholder="Enter new password"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 pl-3.5 pr-10 text-sm text-gray-800 focus:outline-none focus:border-orange-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    <EyeIcon off={showNew} className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Password Checklist */}
              {touched && <PasswordChecklist password={newPassword} />}

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 pl-3.5 pr-10 text-sm text-gray-800 focus:outline-none focus:border-orange-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    <EyeIcon off={showConfirm} className="h-4 w-4" />
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-xs mt-1.5 ${passwordsMatch ? 'text-emerald-600' : 'text-red-500'}`}>
                    {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>
            </form>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end mt-6">
            <button
              type="submit"
              form="change-password-form"
              disabled={loading}
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
