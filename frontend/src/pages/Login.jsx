import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_URL } from "../api";

/* ---------------------------------------------------------
   Design tokens — shared "order ticket" identity with
   MobileLogin.jsx so desktop + mobile feel like one product.
---------------------------------------------------------- */
const INK = "#15171B";
const MUTED = "#8A8F98";
const PAPER = "#FFFFFF";
const MIST = "#F5F6F8";
const LINE = "#E6E8EC";
const ACCENT = "#8ec5fc";
const ACCENT_DARK = "#8ec5fc";
const ACCENT_SOFT = "rgba(15,107,92,0.12)";
const ERROR = "#D8432E";
const ERROR_SOFT = "#FDEEEC";
const RESEND_SECONDS = 30;

export default function Login({ onLoginSuccess }) {
  const [step, setStep] = useState("details"); // details | otp | success
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [shake, setShake] = useState(false);

  const otpRef = useRef(null);

  useEffect(() => {
    if (step === "otp") {
      setResendIn(RESEND_SECONDS);
      setTimeout(() => otpRef.current && otpRef.current.focus(), 250);
    }
  }, [step]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const normalizeEmail = (raw) => raw.trim().toLowerCase();

  const maskEmail = (raw) => {
    const [user, domain] = raw.split("@");
    if (!user || !domain) return raw;
    const visible = user.slice(0, Math.min(2, user.length));
    return `${visible}${"•".repeat(Math.max(user.length - 2, 2))}@${domain}`;
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 420);
  };

  const validateDetails = () => {
    const cleanName = name.trim();
    const cleanEmail = normalizeEmail(email);
    const next = {};
    if (!cleanName) next.name = "Please enter your name";
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      next.email = "Please enter a valid email address";
    }
    setErrors(next);
    if (Object.keys(next).length) triggerShake();
    return Object.keys(next).length === 0;
  };

  const sendOtp = async () => {
    if (!validateDetails()) return;
    const cleanName = name.trim();
    const cleanEmail = normalizeEmail(email);

    setSending(true);
    setErrors({});
    try {
      const res = await axios.post(`${API_URL}/auth/send-otp`, { email: cleanEmail, name: cleanName });
      if (res.data.success) {
        setOtp("");
        setStep("otp");
      } else {
        setErrors({ email: res.data.message || "Couldn't send the code. Please try again." });
        triggerShake();
      }
    } catch (error) {
      setErrors({ email: error.response?.data?.message || "Couldn't send the code. Please try again." });
      triggerShake();
    } finally {
      setSending(false);
    }
  };

  const resendOtp = async () => {
    if (resendIn > 0 || sending) return;
    await sendOtp();
    setResendIn(RESEND_SECONDS);
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      setErrors({ otp: "Enter the code we sent you" });
      triggerShake();
      return;
    }
    const cleanEmail = normalizeEmail(email);
    const cleanName = name.trim();
    setVerifying(true);
    setErrors({});
    try {
      const res = await axios.post(`${API_URL}/auth/verify-otp`, { email: cleanEmail, otp: otp.trim(), name: cleanName });

      if (res.data.success) {
        localStorage.setItem("isLoggedIn", "true");
        // Stored under "phone" because cart/order APIs already look for that key as user_id
        localStorage.setItem("phone", cleanEmail);
        // Name entered at login — Header reads this to show it instead of "Guest"
        localStorage.setItem("name", cleanName);
        // The actual proof of identity - every request now sends this so the
        // backend can verify who's calling instead of just trusting user_id.
        localStorage.setItem("userToken", res.data.token);

        setStep("success");
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess();
          window.location.reload();
        }, 900);
      } else {
        setErrors({ otp: res.data.message || "That code didn't match" });
        triggerShake();
      }
    } catch (error) {
      setErrors({ otp: error.response?.data?.message || "That code didn't match" });
      triggerShake();
    } finally {
      setVerifying(false);
    }
  };

  const Spinner = () => <span style={styles.spinner} />;

  const IconUser = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  const IconMail = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="M2 7l10 6 10-6" />
    </svg>
  );

  const IconLock = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

          @keyframes lgCardIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes lgFadeSlide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes lgShake {
            10%, 90% { transform: translateX(-1px); }
            20%, 80% { transform: translateX(2px); }
            30%, 50%, 70% { transform: translateX(-4px); }
            40%, 60% { transform: translateX(4px); }
          }
          @keyframes lgSpin { to { transform: rotate(360deg); } }
          @keyframes lgPop {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.15); opacity: 1; }
            100% { transform: scale(1); }
          }
          @keyframes lgCheckDraw {
            from { stroke-dashoffset: 32; }
            to { stroke-dashoffset: 0; }
          }
          .lg-field:focus-within {
            border-color: ${ACCENT} !important;
            box-shadow: 0 0 0 4px ${ACCENT_SOFT} !important;
            background-color: ${PAPER} !important;
          }
          .lg-resend:not(:disabled):hover { color: ${ACCENT_DARK} !important; }
          .lg-primary:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(15,107,92,0.32); }
        `}
      </style>

      <div style={styles.card}>
        <div style={styles.topNotch} />
        <div style={{ ...styles.body, animation: shake ? "lgShake 0.42s" : "none" }}>
          {step === "details" && (
            <div style={{ animation: "lgFadeSlide 0.3s ease" }}>
              <div style={styles.badge}>SB</div>
              <span style={styles.eyebrow}>QUICK SIGN-IN</span>
              <h2 style={styles.title}>Welcome, let's get you in</h2>
              <p style={styles.subtitle}>Continue with your name &amp; email to order</p>

              <div style={styles.perforation} />

              <label style={styles.label}>Name</label>
              <div className="lg-field" style={{ ...styles.field, ...(errors.name ? styles.fieldError : {}) }}>
                <IconUser />
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                  onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                  style={styles.input}
                />
              </div>
              {errors.name && <p style={styles.errorText}>{errors.name}</p>}

              <label style={styles.label}>Email address</label>
              <div className="lg-field" style={{ ...styles.field, ...(errors.email ? styles.fieldError : {}) }}>
                <IconMail />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                  onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                  style={styles.input}
                />
              </div>
              {errors.email && <p style={styles.errorText}>{errors.email}</p>}

              <button className="lg-primary" style={{ ...styles.primaryBtn, opacity: sending ? 0.75 : 1 }} onClick={sendOtp} disabled={sending}>
                {sending ? <><Spinner /> Sending code…</> : "Continue"}
              </button>

              <p style={styles.finePrint}>We'll email you a one-time code — no password needed.</p>
            </div>
          )}

          {step === "otp" && (
            <div style={{ animation: "lgFadeSlide 0.3s ease" }}>
              <div style={styles.badge}>✉</div>
              <span style={styles.eyebrow}>VERIFY EMAIL</span>
              <h2 style={styles.title}>Enter your code</h2>
              <p style={styles.subtitle}>
                Code sent to <strong style={{ color: INK }}>{maskEmail(normalizeEmail(email))}</strong>
              </p>

              <div style={styles.perforation} />

              <label style={styles.label}>Verification code</label>
              <div className="lg-field" style={{ ...styles.field, ...(errors.otp ? styles.fieldError : {}) }}>
                <IconLock />
                <input
                  ref={otpRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\s/g, "")); setErrors((p) => ({ ...p, otp: undefined })); }}
                  onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                  style={{ ...styles.input, letterSpacing: "6px", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: "17px" }}
                />
              </div>
              {errors.otp && <p style={styles.errorText}>{errors.otp}</p>}

              <button className="lg-primary" style={{ ...styles.primaryBtn, opacity: verifying ? 0.75 : 1 }} onClick={verifyOtp} disabled={verifying}>
                {verifying ? <><Spinner /> Verifying…</> : "Verify & Continue"}
              </button>

              <div style={styles.resendRow}>
                {resendIn > 0 ? (
                  <span style={styles.resendMuted}>Resend code in 0:{String(resendIn).padStart(2, "0")}</span>
                ) : (
                  <button className="lg-resend" style={styles.resendBtn} onClick={resendOtp} disabled={sending}>
                    {sending ? "Sending…" : "Resend code"}
                  </button>
                )}
                <button style={styles.linkBtn} onClick={() => { setStep("details"); setOtp(""); setErrors({}); }}>
                  Change email
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div style={styles.successWrap}>
              <svg width="60" height="60" viewBox="0 0 64 64" style={{ animation: "lgPop 0.45s cubic-bezier(0.22,1,0.36,1)" }}>
                <circle cx="32" cy="32" r="30" fill={ACCENT_SOFT} />
                <path
                  d="M20 33 L28 41 L45 24"
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="32"
                  style={{ animation: "lgCheckDraw 0.4s ease 0.25s forwards", strokeDashoffset: 32 }}
                />
              </svg>
              <h2 style={{ ...styles.title, marginTop: "14px" }}>Welcome, {name.trim().split(" ")[0]}!</h2>
              <p style={styles.subtitle}>You're all set. Redirecting…</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const styles = {
  card: {
    width: "100%", maxWidth: "400px", backgroundColor: PAPER, borderRadius: "20px",
    border: `1px solid ${LINE}`, boxShadow: "0 20px 45px rgba(21,23,27,0.10), 0 2px 8px rgba(21,23,27,0.04)",
    position: "relative", overflow: "hidden", boxSizing: "border-box",
    animation: "lgCardIn 0.35s cubic-bezier(0.22,1,0.36,1)", fontFamily: "'Inter', -apple-system, sans-serif",
  },
  topNotch: { height: "5px", width: "100%", backgroundColor: "#8ec5fc" },
  body: { padding: "30px 28px 30px" },

  badge: {
    width: "48px", height: "48px", background:"#8ec5fc", color: "#fff",
    fontFamily: "'Space Grotesk', sans-serif", fontWeight: "700", fontSize: "17px",
    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 0 16px",
    boxShadow: "0 8px 18px rgba(15,107,92,0.35)",
    clipPath: "polygon(0 0, 100% 0, 100% 100%, 13px 100%, 0 calc(100% - 13px))",
  },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: "10.5px", fontWeight: "600",
    letterSpacing: "0.14em", color: "#000000", backgroundColor: "#c0daf3",
    padding: "4px 10px", borderRadius: "999px", display: "inline-block", marginBottom: "12px",
  },
  title: { margin: "0 0 6px", fontFamily: "'Space Grotesk', sans-serif", fontSize: "22px", fontWeight: "700", color: INK, lineHeight: 1.25 },
  subtitle: { margin: "0", fontSize: "13.5px", color: MUTED, lineHeight: 1.5 },

  perforation: {
    height: "14px", margin: "20px 0 6px",
    backgroundImage: `radial-gradient(circle, ${LINE} 1.6px, transparent 1.8px)`,
    backgroundSize: "12px 100%", backgroundRepeat: "repeat-x", backgroundPosition: "center",
  },

  label: { display: "block", fontSize: "12px", fontWeight: "600", color: "#667085", marginBottom: "6px", marginTop: "14px" },
  field: {
    display: "flex", alignItems: "center", gap: "10px", padding: "13px 14px",
    borderRadius: "12px", border: `1.5px solid ${LINE}`, backgroundColor: MIST,
    transition: "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
  },
  fieldError: { borderColor: ERROR, backgroundColor: ERROR_SOFT },
  input: { flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "15px", color: INK, fontFamily: "inherit" },
  errorText: { margin: "6px 2px 0", fontSize: "12px", color: ERROR, fontWeight: "600" },

  primaryBtn: {
    width: "100%", marginTop: "22px", padding: "14px", border: "none", borderRadius: "12px",
    background: "#8ec5fc", color: "#fff", fontSize: "15px", fontWeight: "700", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    boxShadow: "0 8px 20px #8ec5fc(162, 203, 255, 0.28)", transition: "transform 0.15s ease, box-shadow 0.15s ease",
    fontFamily: "'Inter', sans-serif",
  },
  finePrint: { textAlign: "center", fontSize: "11.5px", color: "#A3ADBA", marginTop: "14px" },

  resendRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "18px" },
  resendMuted: { fontSize: "12.5px", color: "#A3ADBA", fontWeight: "600" },
  resendBtn: { border: "none", background: "none", color: "#8ec5fc", fontWeight: "700", fontSize: "12.5px", cursor: "pointer", padding: 0, textDecoration: "underline", transition: "color 0.15s ease" },
  linkBtn: { border: "none", background: "none", color: "#8A94A3", fontSize: "12.5px", cursor: "pointer", padding: 0, textDecoration: "underline" },

  successWrap: { textAlign: "center", padding: "10px 0 6px" },

  spinner: {
    width: "14px", height: "14px", border: "2.5px solid rgba(255,255,255,0.4)",
    borderTopColor: "#fff", borderRadius: "50%", display: "inline-block",
    animation: "lgSpin 0.7s linear infinite",
  },
};