import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import AuthLayout from "../../components/AuthLayout";
import ReCAPTCHA from "react-google-recaptcha";
import { useAnimatedModal } from "../../hooks/useAnimatedModal";

const API_BASE = "http://localhost:5000/api/auth";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const captchaAnim = useAnimatedModal(showCaptchaModal);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const navigate = useNavigate();
  const recaptchaRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [apiConfig, setApiConfig] = useState({ recaptchaEnabled: true, googleAuthEnabled: true });

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/settings/public")
      .then((res) => {
        if (res.data) setApiConfig(res.data);
      })
      .catch((err) => {
        console.warn("Could not load public settings:", err);
      });
  }, []);

  const handleGoogleClick = () => {
    const realBtn = document.querySelector("#googleBtn div[role='button']");
    if (realBtn) {
      realBtn.click();
    } else {
      const clientId = apiConfig.googleClientId || GOOGLE_CLIENT_ID;
      if (!clientId) {
        setError("Google Client ID is not configured. Please check your system settings or .env file.");
      } else if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt();
      } else {
        setError("Google Sign-In is still loading. Please try again in a few seconds.");
      }
    }
  };

  // EXECUTE LOGIN REQUEST
  const executeLogin = async (token) => {
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API_BASE}/login`, {
        email,
        password,
        captchaToken: apiConfig.recaptchaEnabled ? token : undefined,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("instructor", JSON.stringify(res.data.instructor));
      if (res.data.instructor.accountType === "Administrator") {
        localStorage.setItem("admin", JSON.stringify(res.data.instructor));
        navigate("/admin/AdminDashboard");
      } else if (res.data.instructor.accountType === "Instructor") {
        navigate("/instructors/dashboard");
      } else {
        setError("Invalid account type.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  // MANUAL LOGIN FORM SUBMIT
  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    // If reCAPTCHA is enabled, trigger the verification modal
    if (apiConfig.recaptchaEnabled) {
      setShowCaptchaModal(true);
    } else {
      executeLogin(null);
    }
  };

  const handleCaptchaSuccess = (token) => {
    setCaptchaToken(token);
    setShowCaptchaModal(false);
    executeLogin(token);
  };

  // GOOGLE LOGIN
  const handleGoogleResponse = async (response) => {
    try {
      const res = await axios.post(`${API_BASE}/google`, {
        credential: response.credential,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("instructor", JSON.stringify(res.data.instructor));
      if (res.data.instructor.accountType === "Administrator") {
        localStorage.setItem("admin", JSON.stringify(res.data.instructor));
        navigate("/admin/AdminDashboard");
      } else if (res.data.instructor.accountType === "Instructor") {
        navigate("/instructors/dashboard");
      } else {
        setError("Invalid account type.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-in failed");
    }
  };

  // Google button initialization
  useEffect(() => {
    const clientId = apiConfig.googleClientId || GOOGLE_CLIENT_ID;
    if (!apiConfig.googleAuthEnabled || !clientId) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
      });
      const btnContainer = document.getElementById("googleBtn");
      if (btnContainer) {
        window.google.accounts.id.renderButton(
          btnContainer,
          { theme: "outline", size: "large", width: 340 }
        );
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client?hl=en";
    script.async = true;
    script.onload = initGoogle;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [apiConfig.googleAuthEnabled, apiConfig.googleClientId]);

  const isEmailActive = emailFocused || Boolean(email);
  const isPasswordActive = passwordFocused || Boolean(password);

  return (
    <AuthLayout>
      <div className="w-full">
        {/* Title updated to Welcome Back */}
        <h2 className="text-[26px] sm:text-4xl font-bold text-[#575488] mb-1.5 tracking-tight">
          Welcome Back
        </h2>
        <p className="text-sm text-gray-400 mb-6 sm:mb-7 font-normal">
          Please login to continue to your account.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mt-0.5 h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Email field with smooth floating label transition */}
          <div className="relative">
            <label
              htmlFor="email"
              className={`absolute left-11 transition-all duration-200 ease-out pointer-events-none z-10 px-1.5 bg-white select-none ${isEmailActive
                ? "-top-2.5 text-xs font-semibold text-[#575488]"
                : "top-1/2 -translate-y-1/2 text-sm sm:text-base text-gray-400"
                }`}
            >
              Email
            </label>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 transition-colors duration-200 ${emailFocused ? "text-[#575488]" : "text-gray-400"
                }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <input
              id="email"
              type="email"
              required
              value={email}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full border rounded-xl pl-11 pr-4 py-3 sm:py-3.5 text-sm sm:text-base text-gray-700 leading-normal focus:outline-none transition-all duration-200 ${emailFocused
                ? "border-[#575488] ring-1 ring-[#575488] shadow-xs"
                : "border-gray-300 hover:border-gray-400"
                }`}
              placeholder={emailFocused && !email ? "2401117072@faculty.buksu.edu.ph" : ""}
            />
          </div>

          {/* Password field with smooth floating label transition */}
          <div className="relative">
            <label
              htmlFor="password"
              className={`absolute left-11 transition-all duration-200 ease-out pointer-events-none z-10 px-1.5 bg-white select-none ${isPasswordActive
                ? "-top-2.5 text-xs font-semibold text-[#575488]"
                : "top-1/2 -translate-y-1/2 text-sm sm:text-base text-gray-400"
                }`}
            >
              Password
            </label>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 transition-colors duration-200 ${passwordFocused ? "text-[#575488]" : "text-gray-400"
                }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full border rounded-xl pl-11 pr-12 py-3 sm:py-3.5 text-sm sm:text-base text-gray-700 leading-normal focus:outline-none transition-all duration-200 ${passwordFocused
                ? "border-[#575488] ring-1 ring-[#575488] shadow-xs"
                : "border-gray-300 hover:border-gray-400"
                }`}
              placeholder={passwordFocused && !password ? "Enter your password" : ""}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.94 11.94 0 013.19-4.62m3.32-2.32A9.99 9.99 0 0112 5c5 0 9.27 3.11 11 7.5a11.9 11.9 0 01-4.11 5.41M3 3l18 18" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Remember me & Forgot Password */}
          <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
            <label className="group flex items-center gap-2.5 text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={keepLoggedIn}
                onChange={(e) => setKeepLoggedIn(e.target.checked)}
                className="w-4 h-4 accent-[#ff6900] rounded border-gray-300 focus:ring-[#ff6900] cursor-pointer"
              />
              <span className="text-gray-600 font-medium group-hover:text-[#575488] transition-colors">
                Keep me logged in
              </span>
            </label>
            <Link
              to="/reset-password"
              className="text-gray-500 hover:text-[#ff6900] transition-colors font-medium underline-offset-4 hover:underline"
            >
              Forgot Password
            </Link>
          </div>

          {/* Gradient Orange Button */}
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full mt-3 overflow-hidden bg-gradient-to-r from-[#ff7a1a] via-[#ff6900] to-[#f25c00] hover:from-[#ff8629] hover:via-[#ff7308] hover:to-[#e85600] disabled:opacity-60 text-white font-semibold py-3.5 px-5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[0_10px_24px_-8px_rgba(255,105,0,0.6)] hover:shadow-[0_14px_30px_-8px_rgba(255,105,0,0.7)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] text-sm sm:text-base"
          >
            {/* Sheen sweep on hover */}
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <span>Log in</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Google Authentication Option */}
        {apiConfig.googleAuthEnabled && (
          <div className="mt-6">
            <div className="flex items-center gap-3 my-4">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200" />
              <span className="text-gray-400 text-[10px] uppercase tracking-[0.18em] font-semibold">
                or continue with
              </span>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200" />
            </div>

            {/* Hidden real Google button */}
            <div
              id="googleBtn"
              style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0, overflow: "hidden" }}
            />

            {/* Outlined "Sign in with Google" button matching Figma */}
            <button
              type="button"
              onClick={handleGoogleClick}
              className="w-full py-3 px-5 rounded-xl border border-gray-300 bg-white hover:border-[#575488]/40 hover:bg-[#575488]/[0.03] text-gray-700 hover:text-[#575488] text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-2xs hover:shadow-sm active:scale-[0.99]"
            >
              <svg width="16" height="16" viewBox="0 0 48 48" className="shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.3-4 6.8-9.9 6.8-16.9z" />
                <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
                <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.1-5.5c-2 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
              </svg>
              <span>Sign in with Google</span>
            </button>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secured with reCAPTCHA verification
            </p>
          </div>
        )}

        {/* Security Verification Modal */}
        {captchaAnim.rendered && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowCaptchaModal(false);
              recaptchaRef.current?.reset();
              setCaptchaToken(null);
            }}
          >
            <div className={`absolute inset-0 bg-gray-900/40 ${captchaAnim.backdropAnim}`} />
            <div
              className={`relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ${captchaAnim.panelAnim}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setShowCaptchaModal(false);
                  recaptchaRef.current?.reset();
                  setCaptchaToken(null);
                }}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition cursor-pointer p-1 rounded-full hover:bg-gray-100"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Icon & Heading */}
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-[#ff6900]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Security Verification</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Please complete the check below to continue logging in.
                </p>
              </div>

              {/* Centered reCAPTCHA */}
              <div className="mt-5 flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={apiConfig.recaptchaSiteKey || import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                  onChange={handleCaptchaSuccess}
                  onExpired={() => setCaptchaToken(null)}
                />
              </div>

              <p className="mt-4 text-center text-[11px] text-gray-400">
                This dialog will close automatically once verified.
              </p>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}

export default Login;