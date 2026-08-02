import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("credentials"); // "credentials" | "otp"
  const [adminId, setAdminId] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/admin/login`, { email, password });
      if (res.data.success && res.data.otpRequired) {
        // Credentials verified - now wait for the OTP, which was emailed
        // to the fixed main-admin address regardless of which admin this is.
        setAdminId(res.data.adminId);
        setStep("otp");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/admin/verify-otp`, { adminId, otp });
      if (res.data.success) {
        // Only now, after OTP verification, do we save the token
        localStorage.setItem("adminToken", res.data.token);
        navigate("/admin/dashboard");
      }
    } catch (err) {
      alert(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep("credentials");
    setOtp("");
    setAdminId(null);
  };

  return (
    <div style={styles.container}>
      {step === "credentials" && (
        <form onSubmit={handleLogin} style={styles.form}>
          <h2 style={styles.title}>Admin Login</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Checking..." : "Login"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerifyOtp} style={styles.form}>
          <h2 style={styles.title}>Enter OTP</h2>
          <p style={styles.subtitle}>
            A 6-digit code was sent to the main admin's email. Enter it below to finish logging in.
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            required
            style={{ ...styles.input, textAlign: "center", letterSpacing: "6px", fontSize: "20px" }}
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Verifying..." : "Verify & Login"}
          </button>
          <button type="button" onClick={handleBackToCredentials} style={styles.linkButton}>
            Back to login
          </button>
        </form>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#f4f6f8"
  },
  form: {
    backgroundColor: "#ffffff",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxWidth: "350px",
    boxSizing: "border-box"
  },
  title: {
    margin: "0 0 24px 0",
    textAlign: "center",
    color: "#333",
    fontSize: "24px"
  },
  subtitle: {
    margin: "0 0 20px 0",
    textAlign: "center",
    color: "#666",
    fontSize: "14px"
  },
  input: {
    padding: "14px",
    marginBottom: "16px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "15px",
    outline: "none"
  },
  button: {
    padding: "14px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#2874f0",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "8px"
  },
  linkButton: {
    background: "none",
    border: "none",
    color: "#2874f0",
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "12px",
    textDecoration: "underline"
  }
};