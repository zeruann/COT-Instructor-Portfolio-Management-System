import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { RefreshCw, Clock, ArrowLeft, Mail, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import AuthLayout from "../../components/AuthLayout";
import { API_BASE as API_URL } from "../../api/config";

const API_BASE = `${API_URL}/auth`;

const formatCountdown = (seconds) => {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
  return `${seconds}s`;
};

function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1); // 1 = enter email & send, 2 = enter 6-digit OTP
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // 30-Second Countdown timer for OTP resend (same as API settings)
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  useEffect(() => {
    if (rateLimitSeconds <= 0) return;
    const timer = setTimeout(() => setRateLimitSeconds((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [rateLimitSeconds]);

  // Step 1: Send OTP to User's Email
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (loading || rateLimitSeconds > 0) return;
    setError("");
    setMessage("");

    const targetEmail = email.trim();
    if (!targetEmail) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/forgot-password`, { email: targetEmail });
      setMessage(res.data?.message || "A 6-digit verification code has been sent to your email.");
      setStep(2);
      setResendTimer(30);
    } catch (err) {
      if (err.response?.status === 429) {
        const retryAfter = Number(err.response?.data?.retryAfterSeconds) || 60;
        setRateLimitSeconds(retryAfter);
      }
      setError(err.response?.data?.message || "Something went wrong. Please check your email and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0 || resendLoading || rateLimitSeconds > 0) return;
    setError("");
    setMessage("");

    try {
      setResendLoading(true);
      const res = await axios.post(`${API_BASE}/forgot-password`, { email: email.trim() });
      setMessage(res.data?.message || "A new 6-digit verification code has been sent.");
      setResendTimer(30);
      setOtpCode("");
    } catch (err) {
      if (err.response?.status === 429) {
        const retryAfter = Number(err.response?.data?.retryAfterSeconds) || 60;
        setRateLimitSeconds(retryAfter);
      }
      setError(err.response?.data?.message || "Failed to resend verification code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/verify-reset-otp`, {
        email: email.trim(),
        otp: otpCode,
      });

      if (res.data?.resetToken) {
        navigate(`/set-new-password/${res.data.resetToken}`);
      } else {
        setError("Verification succeeded but no reset session was received.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Incorrect verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold text-[#575488] mb-1">Reset Password</h2>
      <p className="text-gray-500 mb-6">
        {step === 1
          ? "Enter your email address to receive a 6-digit verification code."
          : `Enter the 6-digit verification code sent to ${email}`}
      </p>

      {/* Messages */}
      {message && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-green-50 border border-green-200 text-xs sm:text-sm text-green-800">
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-600">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Enter Email and Send OTP */}
      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className="w-full border border-indigo-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@buksu.edu.ph"
            />
          </div>

          <button
            type="submit"
            disabled={loading || rateLimitSeconds > 0}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {loading ? (
              <>
                <RefreshCw size={17} className="animate-spin" />
                <span>Sending Verification Code…</span>
              </>
            ) : rateLimitSeconds > 0 ? (
              <>
                <Clock size={17} />
                <span>Try again in {formatCountdown(rateLimitSeconds)}</span>
              </>
            ) : (
              <>
                <Mail size={17} />
                <span>Send Verification Code</span>
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 transition"
            >
              <ArrowLeft size={15} />
              <span>Back to Login</span>
            </Link>
          </div>
        </form>
      ) : (
        /* STEP 2: Enter 6-digit OTP */
        <form onSubmit={handleVerifyOtp} className="space-y-5">
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
                setError("");
              }}
              placeholder="••••••"
              className="w-full text-center font-mono text-2xl sm:text-3xl tracking-[0.4em] sm:tracking-[0.5em] py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange bg-white shadow-2xs transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {loading ? (
              <>
                <RefreshCw size={17} className="animate-spin" />
                <span>Verifying Code…</span>
              </>
            ) : (
              <>
                <Lock size={16} />
                <span>Verify & Continue</span>
              </>
            )}
          </button>

          {/* Resend Option with 30s Cooldown */}
          <div className="text-center text-xs text-gray-500 space-y-3">
            {rateLimitSeconds > 0 ? (
              <div className="flex items-center justify-center gap-1.5 text-red-500">
                <Clock size={13} />
                <span>
                  Too many requests. Try again in <strong className="font-mono">{formatCountdown(rateLimitSeconds)}</strong>
                </span>
              </div>
            ) : resendTimer > 0 ? (
              <div className="flex items-center justify-center gap-1.5 text-gray-400">
                <Clock size={13} />
                <span>
                  Resend code in <strong className="text-gray-600 font-mono">{resendTimer}s</strong>
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendLoading}
                className="text-orange-600 hover:text-orange-700 font-semibold hover:underline cursor-pointer inline-flex items-center gap-1.5"
              >
                {resendLoading && <RefreshCw size={12} className="animate-spin" />}
                <span>Didn't receive the code? Resend Code</span>
              </button>
            )}

            <div>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError("");
                  setMessage("");
                  setOtpCode("");
                }}
                className="text-gray-400 hover:text-gray-600 text-xs underline cursor-pointer"
              >
                Change email address
              </button>
            </div>

            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 transition"
              >
                <ArrowLeft size={15} />
                <span>Back to Login</span>
              </Link>
            </div>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

export default ResetPassword;
