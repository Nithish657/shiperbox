import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
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
  const [neededBy, setNeededBy] = useState("");
  const [notes, setNotes] = useState("");
  
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

  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [transcript, setTranscript] = useState("Listening...");
  const [isListening, setIsListening] = useState(false);

  const goSearch = () => {
    if (search.trim() !== "") navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Your browser does not support voice search.");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true; 
    recognition.maxAlternatives = 1;

    setShowVoiceModal(true); setTranscript("Listening..."); setIsListening(true);

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      const displayText = finalTranscript || interimTranscript;
      setTranscript(displayText);

      if (finalTranscript) {
        const cleanText = finalTranscript.replace(/\.$/, "").trim();
        setIsListening(false); setSearch(cleanText);
        setTimeout(() => { setShowVoiceModal(false); navigate(`/search?q=${encodeURIComponent(cleanText)}`); }, 600);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") setTranscript("Didn't catch that. Try speaking again.");
      else setTranscript("Microphone error. Please try again.");
      setIsListening(false); setTimeout(() => setShowVoiceModal(false), 2500);
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const closeVoiceModal = () => { setShowVoiceModal(false); setIsListening(false); };

  const SearchIcon = ({ size = 16, color = "#333" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.5" cy="10.5" r="7.5" /><line x1="21" y1="21" x2="15.8" y2="15.8" /><circle cx="8" cy="8" r="1.5" fill={color} stroke="none" /></svg>
  );

  const MicIcon = ({ size = 20, standColor = "#333" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 7a4.5 4.5 0 0 1 9 0v4.5a4.5 4.5 0 0 1-9 0V7z" fill="#1877F2"/><circle cx="12" cy="5.5" r="1.2" fill="white"/><path d="M7.5 10.5l4.5 2 4.5-2" stroke="white" strokeWidth="1.5" fill="none" /><path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M8 22h8" stroke={standColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );

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

  const handleSubmit = async () => {
    if (!isLoggedIn || user_id === "guest") return setError("Please log in first to place a garland order");
    if (!photo) return setError("Please attach a reference photo");
    if (!neededBy) return setError("Please specify when you need it by");
    if (!address.fullName || !address.phone || !address.building || !address.street || !address.city || !address.postalCode) {
      return setError("Please fill in all required contact and address fields.");
    }

    setError("");
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("user_id", user_id);
      formData.append("reference_image", photo);
      formData.append("needed_by", neededBy);
      
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
    <>
      <style>{`@keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(40, 116, 240, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(40, 116, 240, 0); } 100% { box-shadow: 0 0 0 0 rgba(40, 116, 240, 0); } }`}</style>
      
      {showVoiceModal && (
        <div style={styles.voiceOverlay} onClick={closeVoiceModal}>
          <div style={styles.voiceModal} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeModalBtn} onClick={closeVoiceModal}>✕</button>
            <h3 style={styles.voiceTitle}>{isListening ? "Speak now" : "Processing"}</h3>
            <p style={{ ...styles.voiceTranscript, color: transcript === "Listening..." ? "#888" : "#222" }}>{transcript}</p>
            <div style={{ ...styles.bigMicContainer, animation: isListening ? "pulseGlow 1.5s infinite" : "none", backgroundColor: isListening ? "#2874f0" : "#ccc" }}><MicIcon size={34} standColor={isListening ? "#fff" : "#555"} /></div>
          </div>
        </div>
      )}

      <div style={styles.page}>
        <div style={styles.fixedHeader}>
          <div style={styles.headerTop}>
            {submitted && <h2 style={styles.logo} onClick={() => navigate("/")}>ShiperBox</h2>}
            <div style={styles.searchRow}>
              <div style={styles.searchBox}>
                <div style={styles.searchIconWrapper}><SearchIcon size={16} /></div>
                <input type="text" placeholder="Search..." style={styles.searchInput} value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && goSearch()} />
              </div>
              <button style={styles.micBtn} onClick={handleVoiceSearch}><MicIcon size={20} standColor="#333" /></button>
            </div>
          </div>
          <div style={styles.headerBottom}>
            <button style={styles.backBtnBlack} onClick={() => navigate(-1)}>←</button>
            <h3 style={styles.categoryTitle}>{submitted ? "GARLAND REQUEST" : "GARLAND ORDER"}</h3>
          </div>
        </div>

        <div style={styles.scrollArea}>
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
              <input type="datetime-local" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} style={styles.input} />
              
              <label style={styles.label}>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 2 garlands, marigold + rose" style={styles.textarea} />

              <hr style={styles.divider} />

              <h3 style={styles.sectionTitle}>Contact & Delivery</h3>
              
              <label style={styles.label}>Full Name *</label>
              <input type="text" name="fullName" value={address.fullName} onChange={handleAddressChange} placeholder="Enter your full name" style={styles.input} />

              <label style={styles.label}>Phone Number *</label>
              <input type="tel" name="phone" value={address.phone} onChange={handleAddressChange} placeholder="e.g. 9876543210" style={styles.input} />

              <label style={styles.label}>Alternative Number</label>
              <input type="tel" name="altPhone" value={address.altPhone} onChange={handleAddressChange} placeholder="Optional" style={styles.input} />

              <label style={styles.label}>Building / Flat No. *</label>
              <input type="text" name="building" value={address.building} onChange={handleAddressChange} placeholder="e.g. 101, Sunshine Apts" style={styles.input} />

              <label style={styles.label}>Street / Colony *</label>
              <input type="text" name="street" value={address.street} onChange={handleAddressChange} placeholder="e.g. Main Road" style={styles.input} />

              <label style={styles.label}>Landmark (Optional)</label>
              <input type="text" name="landmark" value={address.landmark} onChange={handleAddressChange} placeholder="e.g. Opp City Mall" style={styles.input} />

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>City *</label>
                  <input type="text" name="city" value={address.city} onChange={handleAddressChange} placeholder="Hyderabad" style={styles.input} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Postal Code *</label>
                  <input type="text" name="postalCode" value={address.postalCode} onChange={handleAddressChange} placeholder="500001" style={styles.input} />
                </div>
              </div>

              {error && <p style={styles.error}>{error}</p>}
              <button style={{ ...styles.submitBtn, opacity: submitting ? 0.6 : 1 }} onClick={handleSubmit} disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</button>
            </div>
          )}
        </div>
        <MobileBottomNav />
      </div>
    </>
  );
}

const styles = {
  page: { backgroundColor: "#ffffff", minHeight: "100vh" },
  fixedHeader: { 
    position: "sticky", 
    top: 0, 
    zIndex: 1000, 
    display: "flex", 
    flexDirection: "column", 
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)", 
    backgroundColor: "#8ec5fc" 
  },
  headerTop: { display: "flex", alignItems: "center", padding: "10px 15px", gap: "10px", height: "60px", boxSizing: "border-box" },
  logo: { margin: "12px 0", fontSize: "20px", color: "#fff", cursor: "pointer", flexShrink: 0, fontWeight: "bold" },
  searchRow: { display: "flex", alignItems: "center", flex: 1, gap: "8px" },
  searchBox: { flex: 1, height: "36px", display: "flex", alignItems: "center", backgroundColor: "#ffffff", borderRadius: "10px", overflow: "hidden" },
  searchIconWrapper: { paddingLeft: "12px", display: "flex", alignItems: "center", justifyContent: "center" },
  searchInput: { flex: 1, border: "none", padding: "0 10px", outline: "none", fontSize: "13px", background: "transparent", color: "black" },
  micBtn: { width: "36px", height: "36px", border: "none", borderRadius: "50%", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  headerBottom: { display: "flex", alignItems: "center", justifyContent: "center", height: "40px", backgroundColor: "transparent", color: "#ffffff", position: "relative", boxSizing: "border-box" },
  backBtnBlack: {margin:"0 0 10px 0", position: "absolute", left: "25px", border: "none", background: "none", color: "#ffffff", fontSize: "30px", fontWeight: "bold", cursor: "pointer", padding: 0 },
  categoryTitle: { margin: 0, fontSize: "15px", fontWeight: "bold", letterSpacing: "0.5px", textTransform: "uppercase" },
  
  scrollArea: { 
    padding: "20px 15px 90px", 
    boxSizing: "border-box"
  },
  
  card: { margin: "10px 0 0 0", background: "#e8edf1", borderRadius: "14px", padding: "20px", boxShadow: "0 1px 5px rgba(0,0,0,0.08)" },
  subheading: { color: "#555", fontSize: "14px", marginBottom: "10px", lineHeight: 1.5 },
  sectionTitle: { color: "#333", fontSize: "16px", marginTop: "0", marginBottom: "5px" },
  divider: { border: "none", borderTop: "1px solid #ccc", margin: "25px 0" },
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
  confirmText: { color: "#555", lineHeight: 1.6, margin: "12px 0 24px" },
  voiceOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn 0.2s ease" },
  voiceModal: { width: "100%", backgroundColor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "30px 20px 50px 20px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", boxShadow: "0 -4px 15px rgba(0,0,0,0.2)" },
  closeModalBtn: { position: "absolute", top: "15px", right: "20px", background: "none", border: "none", fontSize: "20px", color: "#666", cursor: "pointer", padding: "5px" },
  voiceTitle: { margin: "0 0 15px 0", fontSize: "18px", fontWeight: "bold", color: "#333" },
  voiceTranscript: { fontSize: "22px", textAlign: "center", minHeight: "60px", margin: "0 0 30px 0", display: "flex", alignItems: "center", fontStyle: "italic", maxWidth: "85%" },
  bigMicContainer: { width: "70px", height: "70px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.3s ease" }
};