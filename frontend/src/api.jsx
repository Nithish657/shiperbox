import axios from "axios";

// Automatically detects if React is built for Render, or running locally
const isProduction = process.env.NODE_ENV === "production";

// Automatically grabs 'localhost' or your phone's '192.168.x.x' IP
const currentHost = window.location.hostname;

// 🌟 THE MAGIC SWITCH 🌟
export const API_URL = isProduction 
  ? "https://shiperbox.onrender.com" // Used when live on Render
  : `http://${currentHost}:5000`;          // Used when testing locally

const api = axios.create({
  baseURL: API_URL,
});

// This interceptor is registered on the global axios object, so it applies
// to every axios.get/post/put/delete call anywhere in the app - not just
// calls made through this `api` instance - as long as this file gets
// imported somewhere (it already is, via `{ API_URL }`, in almost every
// component). Without this, the backend has no way to know who's actually
// making a request, and previously just trusted whatever user_id a
// component happened to send.
axios.interceptors.request.use((config) => {
  // If the caller already set an Authorization header (e.g. AdminDashboard
  // manually attaching the adminToken), leave it alone - this interceptor
  // is only for filling in the header when nothing was set explicitly.
  // Without this check, being logged in as a regular user in the same
  // browser silently overwrites every admin request's token with the
  // user token, and every admin-protected route then 401s.
  if (config.headers?.Authorization) return config;

  const token = localStorage.getItem("userToken");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;