import { useState } from "react";
import axios from "axios";
import AuthLayout from "../../components/AuthLayout";

const API_BASE = "http://localhost:5000/api/auth";

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await axios.post(`${API_BASE}/forgot-password`, { email });
      setMessage("A reset link has been sent. Please check your inbox.");
    } catch (err){
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold text-[#575488] mb-1">Reset Password</h2>
      <p className="text-gray-500 mb-6">
        Enter your email address to create or update your password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-indigo-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="you@buksu.edu.ph"
          />
        </div>

        {message && <p className="text-green-600 text-sm">{message}</p>}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition"
        >
          Submit
        </button>
      </form>
    </AuthLayout>
  );
}

export default ResetPassword;