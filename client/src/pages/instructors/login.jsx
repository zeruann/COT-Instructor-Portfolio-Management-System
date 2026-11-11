import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AuthLayout from "../../components/AuthLayout";
import ReCAPTCHA from "react-google-recaptcha";

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

  //GOOGLE LOGIN
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

  //Google button login design
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
          { theme: "outline", size: "large", width: 320 }
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

  // FRONTEND =================================================================================================================

  return (
    <AuthLayout>
      <h2 className="text-3xl font- bold text-[#575488] mb-1">Welcome Back!</h2>
      <p className="text-gray-500 mb-6">Please login to continue to your account.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#575488]"
            placeholder="you@buksu.edu.ph"
          />
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#575488]"
            placeholder="Password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.94 11.94 0 013.19-4.62m3.32-2.32A9.99 9.99 0 0112 5c5 0 9.27 3.11 11 7.5a11.9 11.9 0 01-4.11 5.41M3 3l18 18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600">
            <input
              type="checkbox"
              checked={keepLoggedIn}
              onChange={(e) => setKeepLoggedIn(e.target.checked)}
            />
            Keep me logged in
          </label>
          <a href="/reset-password" className="text-gray-500 hover:text-indigo-600">
            Forgot Password
          </a>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Logging in...</span>
            </>
          ) : (
            "Log In"
          )}
        </button>
      </form>


      {/*Disable Google Auth API*/}
      {apiConfig.googleAuthEnabled && (
        <>
          <div className="flex items-center my-5">
            <div className="flex-grow h-px bg-gray-200"></div>
            <span className="px-3 text-gray-400 text-sm">or</span>
            <div className="flex-grow h-px bg-gray-200"></div>
          </div>

          {/* Real Google button: hidden, but still in the DOM so it can be clicked */}
          <div
            id="googleBtn"
            style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0, overflow: "hidden" }}
          />

          {/* Custom button that matches Log In */}
          <button
            type="button"
            onClick={handleGoogleClick}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 text-gray-600 hover:bg-gray-100 focus:outline-none font-semibold py-2.5 rounded-lg transition"
          >
            <span className="bg-white rounded-full p-1 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.3-4 6.8-9.9 6.8-16.9z" />
                <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
                <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.1-5.5c-2 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
              </svg>
            </span>
            Continue with Google
          </button>
        </>
      )}
      {/* Security Verification Modal */}
      {showCaptchaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => {
            setShowCaptchaModal(false);
            recaptchaRef.current?.reset();
            setCaptchaToken(null);
          }}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl transition-all"
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
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
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
    </AuthLayout>
  );
}

export default Login;