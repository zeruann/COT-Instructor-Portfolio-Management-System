import PasswordChecklist from "../../components/PasswordChecklist";
import { isPasswordValid } from "../../utils/passwordRules";

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthLayout from "../../components/AuthLayout";

const API_BASE = "http://localhost:5000/api/auth";

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


function SetNewPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const isValid = isPasswordValid(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setTouched(true);

    if (!isValid) {
      setError("Password does not meet the requirements below.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await axios.post(`${API_BASE}/reset-password/${token}`, { newPassword });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold text-[#575488] mb-1">Set New Password</h2>
      <p className="text-gray-500 mb-6">Choose a strong password that you have not used before.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-600 mb-1">New Password</label>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setTouched(true);
            }}
            className="w-full border border-indigo-200 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            <EyeIcon off={showPassword} className="h-5 w-5" />
          </button>
        </div>

        {/* Live rule checklist */}
        {touched && <PasswordChecklist password={newPassword} />}

        <div className="relative">
          <label className="block text-sm font-medium text-gray-600 mb-1">Confirm Password</label>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-indigo-200 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {confirmPassword.length > 0 && (
            <p className={`text-sm mt-1 ${passwordsMatch ? "text-green-600" : "text-red-500"}`}>
              {passwordsMatch ? "✓ Passwords match" : "Passwords do not match"}
            </p>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition"
        >
          Reset Password
        </button>
      </form>
    </AuthLayout>
  );
}

export default SetNewPassword;