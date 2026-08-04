import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
import MobileHeader from "../mobile/MobileHeader";
import MobileBottomNav from "../mobile/MobileBottomNav";

export default function MobileGarlandOrder() {
  const navigate = useNavigate();
  const user_id = localStorage.getItem("phone") || "guest";
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [search, setSearch] = useState("");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [neededDate, setNeededDate] = useState("");
  const [neededTime, setNeededTime] = useState("");
  const [neededAmPm, setNeededAmPm] = useState("AM");
  const [notes, setNotes] = useState("");
  const [headerHeight, setHeaderHeight] = useState(112);
  
  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    altPhone: "",
    building: "",
    landmark: "",
    street: "",
    city: "",
    postalCode: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const goSearch = () => {
    if (search.trim() !== "") navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose a valid image file");
    if (file.size > 5 * 1024 * 1024) return setError("Image must be under 5MB");
    setError(""); setPhoto(file); setPreview(URL.createObjectURL(file));
  };

  const handleAddressChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const to24HourTime = (time12, ampm) => {
    const [hoursStr, minutesStr] = time12.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10) || 0;
    if (ampm === "PM" && hours !== 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  };

  // Auto-inserts the colon as the user types digits, so "1100" becomes "11:00"
  // instead of sitting there unformatted.
  const formatTimeInput = (raw) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  };

  const handleSubmit = async () => {
    if (!isLoggedIn || user_id === "guest") return setError("Please log in first to place a garland order");
    if (!photo) return setError("Please attach a reference photo");
    if (!neededDate || !neededTime) return setError("Please specify both date and time for when you need it by");
    if (!/^([1-9]|1[0-2]):[0-5][0-9]$/.test(neededTime)) return setError("Please enter a valid time, e.g. 10:30");
    
    // UPDATED VALIDATION: altPhone is now mandatory, postalCode is omitted
    if (!address.fullName || !address.phone || !address.altPhone || !address.building || !address.street || !address.city) {
      return setError("Please fill in all required contact and address fields (including Alternative Number).");
    }

    setError("");
    setSubmitting(true);
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

      const res = await axios.post(`${API_URL}/garland`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        setSubmitted(true);
      } else {
        setError(res.data.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <MobileHeader
        searchValue={search}
        setSearchValue={setSearch}
        onSearch={goSearch}
        showLogo={false}
        showTitleBar
        showBackButton={true}
        onBack={() => navigate(-1)}
        title={submitted ? "GARLAND REQUEST" : "GARLAND ORDER"}
        activeTab="home"
        isLoggedIn={isLoggedIn}
        onHeightChange={setHeaderHeight}
      />

      <div style={{ ...styles.scrollArea, paddingTop: `${headerHeight + 15}px` }}>
        {!isLoggedIn || user_id === "guest" ? (
          <div style={styles.confirmCard}>
            <h2>Login Required</h2>
            <p style={styles.confirmText}>
              You must be logged in to place a garland request. Please return to the homepage to authenticate.
            </p>
            <button style={styles.submitBtn} onClick={() => navigate("/")}>Go to Home to Login</button>
          </div>
        ) : submitted ? (
          <div style={styles.confirmCard}>
            <div style={styles.confirmIcon}>✓</div>
            <h2>Request Received</h2>
            <p style={styles.confirmText}>We're reviewing your garland photo now. You'll be notified once it's confirmed.</p>
            <button style={styles.submitBtn} onClick={() => navigate("/")}>Back to Home</button>
          </div>
        ) : (
          <div style={styles.card}>
            <p style={styles.subheading}>Show us the garland you want — upload a reference photo and we'll confirm.</p>
            
            <label style={styles.label}>Reference photo *</label>
            <div style={styles.uploadBox} onClick={() => document.getElementById("mobilePhotoInput").click()}>
              {preview ? <img src={preview} alt="Reference Preview" style={styles.previewImg} /> : <div style={styles.uploadPlaceholder}><span style={styles.uploadIcon}>📷</span><span>Tap to upload a photo</span></div>}
            </div>
            <input id="mobilePhotoInput" type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
            
            <label style={styles.label}>Needed by *</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input type="date" value={neededDate} onChange={(e) => setNeededDate(e.target.value)} style={{ ...styles.input, flex: 1 }} />
              <input type="text" maxLength="5" placeholder="HH:MM (e.g. 10:30)" value={neededTime} onChange={(e) => setNeededTime(formatTimeInput(e.target.value))} style={{ ...styles.input, flex: 1 }} />
              <select value={neededAmPm} onChange={(e) => setNeededAmPm(e.target.value)} style={{ ...styles.input, width: "78px", flexShrink: 0, padding: "12px 8px", cursor: "pointer" }}>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
            
            <label style={styles.label}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 2 garlands, marigold + rose" style={styles.textarea} />

            <hr style={styles.divider} />

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

            <h3 style={styles.sectionTitle}>Contact & Delivery</h3>
            
            <label style={styles.label}>Full Name *</label>
            <input type="text" name="fullName" value={address.fullName} onChange={handleAddressChange} placeholder="Enter your full name" style={styles.input} />

            <label style={styles.label}>Phone Number *</label>
            <input type="tel" name="phone" value={address.phone} onChange={handleAddressChange} placeholder="e.g. 9876543210" style={styles.input} />

            <label style={styles.label}>Whatsapp Number *</label>
            <input type="tel" name="altPhone" value={address.altPhone} onChange={handleAddressChange} placeholder="e.g. 9876543210" style={styles.input} />

            <label style={styles.label}>Building / Flat No. *</label>
            <input type="text" name="building" value={address.building} onChange={handleAddressChange} placeholder="e.g. 101, Sunshine Apts" style={styles.input} />

            <label style={styles.label}>Street / Colony *</label>
            <input type="text" name="street" value={address.street} onChange={handleAddressChange} placeholder="e.g. Main Road" style={styles.input} />

            <label style={styles.label}>Landmark (Optional)</label>
            <input type="text" name="landmark" value={address.landmark} onChange={handleAddressChange} placeholder="e.g. Opp City Mall" style={styles.input} />

            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>City *</label>
                <input type="text" name="city" value={address.city} onChange={handleAddressChange} placeholder="e.g. Hyderabad" style={styles.input} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Postal Code (Optional)</label>
                <input type="text" name="postalCode" value={address.postalCode} onChange={handleAddressChange} placeholder="e.g. 500001" style={styles.input} />
              </div>
            </div>

            {error && <p style={styles.error}>{error}</p>}
            <button style={{ ...styles.submitBtn, opacity: submitting ? 0.6 : 1 }} onClick={handleSubmit} disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</button>
          </div>
        )}
      </div>
      <MobileBottomNav />
    </div>
  );
}

const styles = {
  page: { backgroundColor: "#ffffff", minHeight: "100vh" },
  
  scrollArea: { 
    padding: "0 15px 90px", 
    boxSizing: "border-box"
  },
  
  card: { margin: "0", background: "#e8edf1", borderRadius: "14px", padding: "20px", boxShadow: "0 1px 5px rgba(0,0,0,0.08)" },
  subheading: { color: "#555", fontSize: "14px", marginBottom: "10px", lineHeight: 1.5 },
  sectionTitle: { color: "#333", fontSize: "16px", marginTop: "0", marginBottom: "5px" },
  divider: { border: "none", borderTop: "1px solid #ccc", margin: "25px 0" },
  
  noteCard: {
    backgroundColor: "#eef2ff",
    border: "1px solid #c7d2fe",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
  },
  noteTitle: {
    margin: "0 0 8px 0",
    fontSize: "14px",
    fontWeight: "800",
    color: "#1e40af",
    display: "flex",
    alignItems: "center"
  },
  noteText: {
    margin: "0 0 10px 0",
    fontSize: "13px",
    color: "#334155",
    lineHeight: "1.5"
  },
  noteContactBox: {
    backgroundColor: "#dbeafe",
    borderRadius: "8px",
    padding: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid #bfdbfe"
  },
  noteContactLabel: {
    fontSize: "12px",
    color: "#1e40af",
    fontWeight: "600"
  },
  noteContactNumber: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#1d4ed8"
  },

  label: { display: "block", fontWeight: "bold", fontSize: "13px", marginTop: "14px", marginBottom: "6px", color: "#333" },
  uploadBox: { border: "2px dashed #ccc", borderRadius: "12px", height: "180px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", background: "#fafafa" },
  uploadPlaceholder: { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: "#888" },
  uploadIcon: { fontSize: "32px" },
  previewImg: { width: "100%", height: "100%", objectFit: "contain" },
  input: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" },
  textarea: { width: "100%", height: "90px", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" },
  error: { color: "#e53935", fontSize: "14px", marginTop: "14px" },
  submitBtn: { width: "100%", marginTop: "24px", padding: "14px", border: "none", borderRadius: "10px", background:"#8ec5fc" ,  color: "#fff", fontWeight: "bold", fontSize: "16px", cursor: "pointer" },
  confirmCard: { background: "#fff", borderRadius: "14px", padding: "40px 20px", textAlign: "center", boxShadow: "0 1px 5px rgba(0,0,0,0.08)" },
  confirmIcon: { width: "60px", height: "60px", borderRadius: "50%", background: "#dff8e6", color: "#0c831f", fontSize: "30px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  confirmText: { color: "#555", lineHeight: 1.6, margin: "12px 0 24px" }
};