// Single source of truth for the backend URL.
//
// Local dev falls back to the Express server on :5000.
// Production (Vercel) MUST set VITE_API_BASE_URL, e.g.
//   https://your-api.onrender.com/api
// This is a build-time variable, so changing it requires a redeploy.

const rawBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').trim();

// Normalize: strip any trailing slashes so callers can safely append `/auth`, `/settings`, ...
export const API_BASE = rawBase.replace(/\/+$/, '');

// Root origin (no trailing `/api`), useful for building absolute file URLs.
export const API_ROOT = API_BASE.replace(/\/api$/, '');

export default API_BASE;
