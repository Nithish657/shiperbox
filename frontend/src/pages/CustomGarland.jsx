import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header"; 
import { API_URL } from "../api";
import Login from "./Login"; 

export default function CustomGarland() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  
  const [neededDate, setNeededDate] = useState("");
  const [neededTime, setNeededTime] = useState("");
  const [neededAmPm, setNeededAmPm] = useState("AM"); 
  
  const [notes, setNotes] = useState("");
  
  const [address, setAddress] = useState({
    fullName: "", phone: "", altPhone: "", building: "", landmark: "", street: "", city: "", postalCode: "",
  });

  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const [showLogin, setShowLogin] = useState(false);
  const fileInputRef = useRef(null);

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const user_id = localStorage.getItem("phone") || "guest";

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose a valid image file");
    if (file.size > 5 * 1024 * 1024) return setError("Image must be under 5MB");
    setError(""); setPhoto(file); setPreview(URL.createObjectURL(file));
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); };

  const to24HourTime = (time12, ampm) => {
    const [hoursStr, minutesStr] = time12.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10) || 0;
    if (ampm === "PM" && hours !== 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  };

  // Auto-inserts the colon as the user types digits, so "1100" becomes "11:00"
  // instead of sitting there unformatted. Also handles backspacing cleanly
  // since it's always recomputed from the raw digits typed so far.
  const formatTimeInput = (raw) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  };

  const handleNext = () => {
    if (!photo) return setError("Please attach a reference photo");
    if (!neededDate || !neededTime) return setError("Please specify both date and time for when it's needed");
    if (!/^([1-9]|1[0-2]):[0-5][0-9]$/.test(neededTime)) return setError("Please enter a valid time, e.g. 10:30");

    setError(""); setStep(2); 
  };

  const handleAddressChange = (e) => { setAddress({ ...address, [e.target.name]: e.target.value }); };

  const handleSubmitOrder = async () => {
    if (!address.fullName || !address.phone || !address.building || !address.street || !address.city || !address.postalCode) {
      return setError("Please fill in all required contact and address fields.");
    }

    setError(""); setSubmitting(true);
    const combinedNeededBy = `${neededDate} ${to24HourTime(neededTime, neededAmPm)}`;

    try {
      const formData = new FormData();
      formData.append("user_id", user_id);
      formData.append("reference_image", photo);
      formData.append("needed_by", combinedNeededBy);
      formData.append("notes", notes);
      formData.append("name", address.fullName);
      formData.append("phone_number", address.phone);
      formData.append("alt_phone_num", address.altPhone);
      formData.append("building_name", address.building);
      formData.append("street", address.street);
      formData.append("landmark", address.landmark);
      formData.append("city_or_village", address.city);
      formData.append("pin_code", address.postalCode);
      formData.append("email", user_id); 
      formData.append("state", "Telangana");
      formData.append("price", "0");
      formData.append("category", "garland");

      const res = await axios.post(`${API_URL}/garland`, formData, { headers: { "Content-Type": "multipart/form-data" } });

      if (res.data.success) { setStep(3); } 
      else { setError(res.data.message || "Something went wrong"); }
    } catch (err) { setError(err.response?.data?.message || "Failed to submit request"); } 
    finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setPhoto(null); setPreview(null); setNeededDate(""); setNeededTime(""); setNeededAmPm("AM"); setNotes("");
    setAddress({ fullName: "", phone: "", altPhone: "", building: "", landmark: "", street: "", city: "", postalCode: "" });
    setError(""); setStep(1);
  };

  return (
    <div style={styles.page}>
      <Header />
      {showLogin && (
        <div style={styles.overlay}>
          <div style={styles.loginBox}>
            <button style={styles.closeBtn} onClick={() => setShowLogin(false)}>×</button>
            <Login onLoginSuccess={() => { setShowLogin(false); window.location.reload(); }} />
          </div>
        </div>
      )}

      <div style={styles.container}>
        {!isLoggedIn ? (
          <div style={styles.confirmCard}>
            <h2 style={styles.heading}>Login Required</h2>
            <p style={styles.confirmText}>You must be logged in to place a custom garland order. Please authenticate to continue.</p>
            <button style={styles.button} onClick={() => setShowLogin(true)}>Login to Continue</button>
          </div>
        ) : step === 3 ? (
          <div style={styles.confirmCard}>
            <div style={styles.confirmIcon}>✓</div>
            <h2 style={styles.heading}>Order Confirmed!</h2>
            <p style={styles.confirmText}>Your custom garland request has been received. Our team will review your requirements and process your order shortly.</p>
            <div style={{ display: "flex", gap: "15px", marginTop: "20px" }}>
              <button style={styles.secondaryButton} onClick={() => navigate("/")}>Back to Home</button>
              <button style={styles.button} onClick={resetForm}>New Request</button>
            </div>
          </div>
        ) : (
          <div style={styles.card}>
            <div style={{ textAlign: "center", marginBottom: "30px" }}>
              <h2 style={styles.heading}>Custom Garland</h2>
              <p style={styles.subheading}>{step === 1 ? "Upload a reference photo and set your requirements." : "Enter your delivery details to complete the order."}</p>
            </div>

            {step === 1 && (
              <>
                <label style={styles.label}>Reference Photo *</label>
                <div 
                  style={{ ...styles.uploadBox, borderColor: isDragging ? "#8ec5fc" : "#d1d5db", backgroundColor: isDragging ? "#f0f7ff" : "#f9fafb" }} 
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current.click()}
                >
                  {preview ? ( <img src={preview} alt="Preview" style={styles.previewImg} /> ) : (
                    <div style={styles.uploadPlaceholder}>
                      <span style={styles.uploadIcon}>📷</span>
                      <span><strong>Drag & drop</strong> your image here, or tap to browse</span>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />

                <div style={styles.row}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Date Needed *</label>
                    <input type="date" value={neededDate} onChange={(e) => setNeededDate(e.target.value)} style={styles.input} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Time Needed *</label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input type="text" maxLength="5" placeholder="HH:MM (e.g. 10:30)" value={neededTime} onChange={(e) => setNeededTime(formatTimeInput(e.target.value))} style={{ ...styles.input, flex: 1 }} />
                      <select value={neededAmPm} onChange={(e) => setNeededAmPm(e.target.value)} style={{ ...styles.input, width: "85px", flexShrink: 0, padding: "14px 10px", cursor: "pointer" }}>
                        <option value="AM">AM</option><option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>

                <label style={styles.label}>Notes (Size, flowers, colors, occasion)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Marigold + rose for a wedding, approx 2 meters long" style={styles.textarea} />

                {error && <p style={styles.error}>{error}</p>}
                
                <button style={styles.button} onClick={handleNext}>Next Step</button>
              </>
            )}

            {step === 2 && (
              <>
                {/* NEW ORDER PROCESS NOTE CARD */}
                <div style={styles.noteCard}>
                  <h3 style={styles.noteTitle}>ℹ️ Important Order Info</h3>
                  <p style={styles.noteText}>
                    Once your order is confirmed, our team will contact you directly via WhatsApp to finalize your bill. 
                    Please note that standard delivery and handling charges are applicable.
                  </p>
                  <p style={styles.noteText}>
                    For your security and trust, all payments are securely processed only after our team shares the full details with you.
                  </p>
                  <div style={styles.noteContactBox}>
                    <span style={styles.noteContactLabel}>Support Contact:</span>
                    <span style={styles.noteContactNumber}>📞 6301912803</span>
                  </div>
                </div>

                {/* NEW INSTRUCTION BANNER */}
                <div style={styles.instructionBanner}>
                  <p style={styles.instructionText}>
                    👉 <b>Note:</b> Please fill in your correct details below and click on <b>Place Order</b> to submit your request.
                  </p>
                </div>

                <div style={styles.contactBlock}>
                  <h3 style={styles.blockTitle}>👤 Contact Details</h3>
                  <label style={styles.label}>Full Name *</label>
                  <input type="text" name="fullName" value={address.fullName} onChange={handleAddressChange} placeholder="Enter your full name" style={styles.input} />

                  <div style={{ display: "flex", gap: "15px" }}>
                    <div style={{ flex: 1 }}><label style={styles.label}>Phone Number *</label><input type="tel" name="phone" value={address.phone} onChange={handleAddressChange} placeholder="e.g. 9876543210" style={styles.input} /></div>
                    <div style={{ flex: 1 }}><label style={styles.label}>Whatsapp Number *</label><input type="tel" name="altPhone" value={address.altPhone} onChange={handleAddressChange} placeholder="e.g. 9876543210" style={styles.input} /></div>
                  </div>
                </div>

                <div style={styles.addressBlock}>
                  <h3 style={styles.blockTitle}>📍 Delivery Address</h3>
                  <label style={styles.label}>Building Name / Flat No. *</label>
                  <input type="text" name="building" value={address.building} onChange={handleAddressChange} placeholder="e.g. 101, Sunshine Apartments" style={styles.input} />
                  <label style={styles.label}>Street / Colony *</label>
                  <input type="text" name="street" value={address.street} onChange={handleAddressChange} placeholder="e.g. Main Road, Phase 1" style={styles.input} />
                  <label style={styles.label}>Landmark (Optional)</label>
                  <input type="text" name="landmark" value={address.landmark} onChange={handleAddressChange} placeholder="e.g. Opposite City Mall" style={styles.input} />

                  <div style={{ display: "flex", gap: "15px" }}>
                    <div style={{ flex: 1 }}><label style={styles.label}>City *</label><input type="text" name="city" value={address.city} onChange={handleAddressChange} placeholder="e.g. Hyderabad" style={styles.input} /></div>
                    <div style={{ flex: 1 }}><label style={styles.label}>Postal Code *</label><input type="text" name="postalCode" value={address.postalCode} onChange={handleAddressChange} placeholder="e.g. 500001" style={styles.input} /></div>
                  </div>
                </div>

                {error && <p style={styles.error}>{error}</p>}

                <div style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
                  <button style={styles.secondaryButton} onClick={() => { setError(""); setStep(1); }} disabled={submitting}>Back</button>
                  <button style={{ ...styles.button, opacity: submitting ? 0.6 : 1 }} onClick={handleSubmitOrder} disabled={submitting}>{submitting ? "Placing Order..." : "Place Order"}</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { backgroundColor: "#f4f7f9", minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif" },
  container: { paddingTop: "130px", paddingBottom: "60px", paddingLeft: "15px", paddingRight: "15px", display: "flex", justifyContent: "center" },
  card: { background: "#ffffff", borderRadius: "24px", padding: "45px 50px", width: "100%", maxWidth: "1200px", margin: "0 auto", boxShadow: "0 10px 40px rgba(0, 0, 0, 0.04)", boxSizing: "border-box" },
  heading: { margin: "0 0 10px 0", color: "#1a1a1a", fontSize: "30px", fontWeight: "800", letterSpacing: "-0.5px" },
  subheading: { color: "#6b7280", fontSize: "16px", margin: "0", lineHeight: 1.6 },
  blockTitle: { color: "#374151", fontSize: "18px", margin: "0 0 16px 0", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" },
  label: { display: "block", fontWeight: "600", fontSize: "13px", marginTop: "16px", marginBottom: "8px", color: "#4b5563" },
  row: { display: "flex", gap: "24px", width: "100%" },
  contactBlock: { backgroundColor: "#f0f7ff", border: "1px solid #dbeafe", borderRadius: "16px", padding: "24px", marginBottom: "20px", boxShadow: "inset 0 2px 4px rgba(255,255,255,0.5)" },
  addressBlock: { backgroundColor: "#f4f9ff", border: "1px solid #e0f0fe", borderRadius: "16px", padding: "24px", boxSizing: "border-box" },
  uploadBox: { border: "2px dashed #d1d5db", borderRadius: "16px", height: "240px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", background: "#f9fafb", transition: "all 0.2s ease" },
  uploadPlaceholder: { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", color: "#6b7280", textAlign: "center", padding: "0 20px" },
  uploadIcon: { fontSize: "40px" },
  previewImg: { width: "100%", height: "100%", objectFit: "contain" },
  input: { width: "100%", padding: "14px 16px", borderRadius: "10px", border: "1.5px solid #d1d5db", fontSize: "15px", boxSizing: "border-box", backgroundColor: "#ffffff", color: "#111827", transition: "all 0.2s ease", outline: "none" },
  textarea: { width: "100%", height: "100px", padding: "14px 16px", borderRadius: "10px", border: "1.5px solid #d1d5db", fontSize: "15px", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", backgroundColor: "#ffffff", color: "#111827", outline: "none" },
  error: { color: "#ef4444", fontSize: "14px", marginTop: "16px", fontWeight: "600", textAlign: "center", background: "#fef2f2", padding: "10px", borderRadius: "8px" },
  button: { width: "100%", marginTop: "24px", padding: "18px", border: "none", borderRadius: "12px", background: "linear-gradient(135deg, #8ec5fc 0%, #68a8f7 100%)", color: "#fff", fontWeight: "800", fontSize: "18px", cursor: "pointer", flex: 2, boxShadow: "0 6px 20px rgba(104, 168, 247, 0.35)", transition: "transform 0.2s ease" },
  secondaryButton: { width: "100%", marginTop: "24px", padding: "18px", border: "1.5px solid #d1d5db", borderRadius: "12px", background: "#ffffff", color: "#374151", fontWeight: "800", fontSize: "18px", cursor: "pointer", flex: 1, transition: "background 0.2s ease" },
  confirmCard: { background: "#fff", borderRadius: "20px", padding: "50px 40px", maxWidth: "480px", width: "100%", textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.06)", alignSelf: "flex-start" },
  confirmIcon: { width: "70px", height: "70px", borderRadius: "50%", background: "#dcfce7", color: "#16a34a", fontSize: "35px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  confirmText: { color: "#4b5563", lineHeight: 1.6, margin: "12px 0 28px", fontSize: "16px" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 },
  loginBox: { background: "white", padding: "24px", borderRadius: "16px", width: "420px", maxWidth: "90%", position: "relative", boxShadow: "0 20px 50px rgba(0,0,0,0.15)" },
  closeBtn: { position: "absolute", top: "12px", right: "16px", border: "none", background: "#f3f4f6", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", cursor: "pointer", color: "#4b5563", zIndex: 10 },
  
  // --- NEW NOTE AND INSTRUCTION STYLES ---
  noteCard: { backgroundColor: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "12px", padding: "16px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" },
  noteTitle: { margin: "0 0 8px 0", fontSize: "15px", fontWeight: "800", color: "#1e40af", display: "flex", alignItems: "center" },
  noteText: { margin: "0 0 10px 0", fontSize: "14px", color: "#334155", lineHeight: "1.5" },
  noteContactBox: { backgroundColor: "#dbeafe", borderRadius: "8px", padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #bfdbfe" },
  noteContactLabel: { fontSize: "13px", color: "#1e40af", fontWeight: "600" },
  noteContactNumber: { fontSize: "15px", fontWeight: "800", color: "#1d4ed8" },
  instructionBanner: { backgroundColor: "#fffbeb", borderLeft: "4px solid #f59e0b", padding: "12px 14px", marginBottom: "20px", borderRadius: "6px" },
  instructionText: { margin: 0, fontSize: "14px", color: "#b45309", lineHeight: "1.5" },
};