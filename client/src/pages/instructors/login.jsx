import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AuthLayout from "../../components/AuthLayout";

const API_BASE = "http://localhost:5000/api/auth";
const GOOGLE_CLIENT_ID =
  "928882897040-ejalv92n62s91uoh5f6k6k6ike7s10t8.apps.googleusercontent.com";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleGoogleClick = () => {
    const realBtn = document.querySelector("#googleBtn div[role='button']");
    if (realBtn) realBtn.click();
  };

  //MANUAL LOGIN
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await axios.post(`${API_BASE}/login`, { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("instructor", JSON.stringify(res.data.instructor));

      if (res.data.instructor.accountType === "Administrator") {
        navigate("/admin/AdminDashboard");
      } else if (res.data.instructor.accountType === "Instructor") {
        navigate("/instructors/dashboard");
      } else {
        setError("Invalid account type.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
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

  //Google button login desing
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client?hl=en";
    script.async = true;
    document.body.appendChild(script);
  
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("googleBtn"),
        { theme: "outline", size: "large", width: 320 }
      );
    };
  
    return () => {
      document.body.removeChild(script);
    };
  }, []);



  // FRONTEND =================================================================================================================



  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold text-[#575488] mb-1">Welcome Back!</h2>
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
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition"
        >
          Log In

        </button>

      </form>

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
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.3-4 6.8-9.9 6.8-16.9z"/>
          <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/>
          <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.1-5.5c-2 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
        </svg>
      </span>
      Continue with Google
    </button> 


    </AuthLayout>
  );
}

export default Login;