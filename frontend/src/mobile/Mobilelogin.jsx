import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_URL } from "../api";

/* ---------------------------------------------------------
   Design tokens — shared "order ticket" identity with
   Login.jsx so desktop + mobile feel like one product.
---------------------------------------------------------- */
const INK = "#15171B";
const MUTED = "#8A8F98";
const PAPER = "#FFFFFF";
const MIST = "#F5F6F8";
const LINE = "#E6E8EC";
const ACCENT = "#0F6B5C";
const ACCENT_DARK = "#0B4F44";
const ACCENT_SOFT = "rgba(15,107,92,0.12)";
const ERROR = "#D8432E";
const ERROR_SOFT = "#FDEEEC";
const RESEND_SECONDS = 30;
const OTP_LENGTH = 6;

/**
 * MobileLogin
 * Mobile-first, self-contained login / OTP bottom sheet.
 * Manages its own backdrop + slide-up sheet, so just render it conditionally:
 *
 *   {showLogin && (
 *     <MobileLogin
 *       onClose={() => setShowLogin(false)}
 *       onLoginSuccess={() => { setShowLogin(false); loadCart(); }}
 *     />
 *   )}
 *
 * (No extra overlay/wrapper div needed around it.)
 */
export default function MobileLogin({ onLoginSuccess, onClose }) {
  const [step, setStep] = useState("details"); // details | otp | success
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [shake, setShake] = useState(false);
  const [closing, setClosing] = useState(false);

  const otpBoxRefs = useRef([]);

  useEffect(() => {
    if (step === "otp") {
      setResendIn(RESEND_SECONDS);
      setTimeout(() => otpBoxRefs.current[0] && otpBoxRefs.current[0].focus(), 350);
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
        localStorage.setItem("phone", cleanEmail);
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

  const handleOtpBoxChange = (index, rawValue) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1); // keep only the last digit typed
    const chars = otp.padEnd(OTP_LENGTH, " ").split("");
    chars[index] = digit || " ";
    const next = chars.join("").replace(/\s+$/, ""); // trim trailing blanks
    setOtp(next);
    setErrors((p) => ({ ...p, otp: undefined }));

    if (digit && index < OTP_LENGTH - 1) {
      const nextBox = otpBoxRefs.current[index + 1];
      if (nextBox) nextBox.focus();
    }
  };

  const handleOtpBoxKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const prevBox = otpBoxRefs.current[index - 1];
        if (prevBox) prevBox.focus();
        const chars = otp.padEnd(OTP_LENGTH, " ").split("");
        chars[index - 1] = " ";
        setOtp(chars.join("").replace(/\s+$/, ""));
      }
    } else if (e.key === "Enter") {
      verifyOtp();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    setOtp(pasted);
    setErrors((p) => ({ ...p, otp: undefined }));
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    const box = otpBoxRefs.current[focusIndex];
    if (box) box.focus();
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose && onClose(), 220);
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

          @keyframes mlBackdropIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes mlSheetUp { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes mlSheetDown { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(10px) scale(0.96); } }
          @keyframes mlShake {
            10%, 90% { transform: translateX(-1px); }
            20%, 80% { transform: translateX(2px); }
            30%, 50%, 70% { transform: translateX(-4px); }
            40%, 60% { transform: translateX(4px); }
          }
          @keyframes mlSpin { to { transform: rotate(360deg); } }
          @keyframes mlPop {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.15); opacity: 1; }
            100% { transform: scale(1); }
          }
          @keyframes mlCheckDraw {
            from { stroke-dashoffset: 32; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes mlFadeSlide {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .ml-field:focus-within {
            border-color: ${ACCENT} !important;
            box-shadow: 0 0 0 4px ${ACCENT_SOFT} !important;
            background-color: ${PAPER} !important;
          }
          .ml-otp-box:focus {
            border-color: ${ACCENT} !important;
            box-shadow: 0 0 0 4px ${ACCENT_SOFT} !important;
            background-color: ${PAPER} !important;
          }
          .ml-resend:not(:disabled):active { opacity: 0.6; }
          .ml-primary:not(:disabled):active { transform: scale(0.98); }
        `}
      </style>

      <div
        style={{ ...styles.backdrop, animation: closing ? "none" : "mlBackdropIn 0.2s ease" }}
        onClick={handleClose}
      >
        <div
          style={{ ...styles.sheet, animation: closing ? "mlSheetDown 0.22s ease forwards" : "mlSheetUp 0.32s cubic-bezier(0.22,1,0.36,1)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button style={styles.closeBtn} onClick={handleClose} aria-label="Close">✕</button>

          <div style={{ ...styles.body, animation: shake ? "mlShake 0.42s" : "none" }}>
            {step === "details" && (
              <div style={{ animation: "mlFadeSlide 0.3s ease" }}>
                <div style={styles.badge}>S</div>
                <span style={styles.eyebrow}>QUICK SIGN-IN</span>
                <h2 style={styles.title}>Login / Sign up</h2>
                <p style={styles.subtitle}>Continue with your name &amp; email to order</p>

                <div style={styles.perforation} />

                <label style={styles.label}>Name</label>
                <div style={{ ...styles.field, ...(errors.name ? styles.fieldError : {}) }} className="ml-field">
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
                <div style={{ ...styles.field, ...(errors.email ? styles.fieldError : {}) }} className="ml-field">
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

                <button className="ml-primary" style={{ ...styles.primaryBtn, opacity: sending ? 0.75 : 1 }} onClick={sendOtp} disabled={sending}>
                  {sending ? <><Spinner /> Sending code…</> : "Continue"}
                </button>

                <p style={styles.finePrint}>We'll email you a one-time code — no password needed.</p>
              </div>
            )}

            {step === "otp" && (
              <div style={{ animation: "mlFadeSlide 0.3s ease" }}>
                <div style={styles.badge}>✉</div>
                <span style={styles.eyebrow}>VERIFY EMAIL</span>
                <h2 style={styles.title}>Enter your code</h2>
                <p style={styles.subtitle}>
                  Code sent to <strong style={{ color: INK }}>{maskEmail(normalizeEmail(email))}</strong>
                </p>

                <div style={styles.perforation} />

                <label style={styles.label}>Verification code</label>
                <div style={styles.otpRow}>
                  {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpBoxRefs.current[i] = el)}
                      className="ml-otp-box"
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[i] && otp[i] !== " " ? otp[i] : ""}
                      onChange={(e) => handleOtpBoxChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpBoxKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      style={{ ...styles.otpBox, ...(errors.otp ? styles.otpBoxError : {}) }}
                    />
                  ))}
                </div>
                {errors.otp && <p style={styles.errorText}>{errors.otp}</p>}

                <button className="ml-primary" style={{ ...styles.primaryBtn, opacity: verifying ? 0.75 : 1 }} onClick={verifyOtp} disabled={verifying}>
                  {verifying ? <><Spinner /> Verifying…</> : "Verify & Continue"}
                </button>

                <div style={styles.resendRow}>
                  {resendIn > 0 ? (
                    <span style={styles.resendMuted}>Resend code in 0:{String(resendIn).padStart(2, "0")}</span>
                  ) : (
                    <button className="ml-resend" style={styles.resendBtn} onClick={resendOtp} disabled={sending}>
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
                <svg width="64" height="64" viewBox="0 0 64 64" style={{ animation: "mlPop 0.45s cubic-bezier(0.22,1,0.36,1)" }}>
                  <circle cx="32" cy="32" r="30" fill={ACCENT_SOFT} />
                  <path
                    d="M20 33 L28 41 L45 24"
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="32"
                    style={{ animation: "mlCheckDraw 0.4s ease 0.25s forwards", strokeDashoffset: 32 }}
                  />
                </svg>
                <h2 style={{ ...styles.title, marginTop: "16px" }}>Welcome, {name.trim().split(" ")[0]}!</h2>
                <p style={styles.subtitle}>You're all set. Redirecting…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  backdrop: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(10, 20, 20, 0.55)", zIndex: 3000,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "20px", boxSizing: "border-box",
  },
  sheet: {
    width: "100%", maxWidth: "400px", backgroundColor: PAPER,
    borderRadius: "24px",
    position: "relative", boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
    maxHeight: "70vh", overflowY: "auto", boxSizing: "border-box",
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  closeBtn: {
    position: "absolute", top: "14px", right: "16px", width: "30px", height: "30px",
    border: "none", borderRadius: "50%", backgroundColor: MIST, color: "#666",
    fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  },
  body: { padding: "22px 24px 34px" },

  badge: {
    width: "48px", height: "48px", background: " #8ec5fc", color: "#fff",
    fontFamily: "'Space Grotesk', sans-serif", fontWeight: "700", fontSize: "18px",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "6px 0 16px", boxShadow: "0 8px 18px rgba(15,107,92,0.35)",
    clipPath: "polygon(0 0, 100% 0, 100% 100%, 13px 100%, 0 calc(100% - 13px))",
  },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: "10.5px", fontWeight: "600",
    letterSpacing: "0.14em", color: " #000000", backgroundColor: ACCENT_SOFT,
    padding: "4px 10px", borderRadius: "999px", display: "inline-block", marginBottom: "12px",
  },
  title: { margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif", fontSize: "21px", fontWeight: "700", color: INK, lineHeight: 1.25 },
  subtitle: { margin: "0", fontSize: "13px", color: MUTED, lineHeight: 1.5 },

  perforation: {
    height: "14px", margin: "18px 0 4px",
    backgroundImage: `radial-gradient(circle, ${LINE} 1.6px, transparent 1.8px)`,
    backgroundSize: "12px 100%", backgroundRepeat: "repeat-x", backgroundPosition: "center",
  },

  label: { display: "block", fontSize: "12px", fontWeight: "700", color: "#667085", marginBottom: "6px", marginTop: "14px" },
  field: {
    display: "flex", alignItems: "center", gap: "10px", padding: "13px 14px",
    borderRadius: "12px", border: `1.5px solid ${LINE}`, backgroundColor: MIST,
    transition: "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
  },
  fieldError: { borderColor: ERROR, backgroundColor: ERROR_SOFT },
  input: { flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "15px", color: INK, fontFamily: "inherit" },
  errorText: { margin: "6px 2px 0", fontSize: "12px", color: ERROR, fontWeight: "600" },

  otpRow: { display: "flex", gap: "10px", justifyContent: "space-between" },
  otpBox: {
    width: "44px", height: "52px", textAlign: "center",
    borderRadius: "12px", border: " #000000", backgroundColor: MIST,
    fontSize: "20px", fontWeight: "700", color: INK,
    fontFamily: "'IBM Plex Mono', monospace",
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
  },
  otpBoxError: { borderColor: ERROR, backgroundColor: ERROR_SOFT },

  primaryBtn: {
    width: "100%", marginTop: "22px", padding: "15px", border: "none", borderRadius: "14px",
    background: " #8ec5fc", color: "#fff", fontSize: "15.5px", fontWeight: "700", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    boxShadow: "0 8px 20px rgba(15,107,92,0.32)", transition: "transform 0.1s ease",
    fontFamily: "'Inter', sans-serif",
  },
  finePrint: { textAlign: "center", fontSize: "11.5px", color: "#A3ADBA", marginTop: "14px" },

  resendRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "18px" },
  resendMuted: { fontSize: "12.5px", color: "#A3ADBA", fontWeight: "600" },
  resendBtn: { border: "none", background: "none", color: " #000000", fontWeight: "700", fontSize: "12.5px", cursor: "pointer", padding: 0, textDecoration: "underline" },
  linkBtn: { border: "none", background: "none", color: "#8A94A3", fontSize: "12.5px", cursor: "pointer", padding: 0, textDecoration: "underline" },

  successWrap: { textAlign: "center", padding: "20px 0 10px" },

  spinner: {
    width: "15px", height: "15px", border: "2.5px solid rgba(255,255,255,0.4)",
    borderTopColor: "#fff", borderRadius: "50%", display: "inline-block",
    animation: "mlSpin 0.7s linear infinite",
  },
};