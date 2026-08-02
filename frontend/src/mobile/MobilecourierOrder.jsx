import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
import MobileBottomNav from "../mobile/MobileBottomNav";
import Login from "../pages/Login"; 

const emptyLocation = { building: "", street: "", landmark: "", city: "", postalCode: "" };

export default function CourierOrder() {
  const navigate = useNavigate();
  const user_id = localStorage.getItem("phone") || "guest";
  
  // STRICT LOGIN CHECK
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const isGuest = !isLoggedIn || !user_id || user_id === "guest" || user_id === "null" || user_id === "undefined" || String(user_id).trim() === "";

  // Route & Tracker State
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(1);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchStatus = async () => {
      try {
        const res = await axios.get(`${API_URL}/courier/status`);
        if (res.data.success) {
          setAvailableRoutes(res.data.routes);
        }
      } catch (err) { console.error("Failed to load status", err); }
    };
    
    fetchStatus(); 
    const intervalId = setInterval(fetchStatus, 10000); 
    return () => clearInterval(intervalId); 
  }, []);

  const [search, setSearch] = useState("");

  const [contact, setContact] = useState({ fullName: "", phone: "", altPhone: "" });
  
  const [pickup, setPickup] = useState({ ...emptyLocation });
  const [drop, setDrop] = useState({ ...emptyLocation });
  
  const [neededDate, setNeededDate] = useState("");
  const [neededTime, setNeededTime] = useState("");
  
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [showLogin, setShowLogin] = useState(false);

  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [transcript, setTranscript] = useState("Listening...");
  const [isListening, setIsListening] = useState(false);

  const goSearch = () => {
    if (search.trim() !== "") navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Your browser does not support voice search.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN"; 
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    setShowVoiceModal(true);
    setTranscript("Listening...");
    setIsListening(true);

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const displayText = finalTranscript || interimTranscript;
      setTranscript(displayText);

      if (finalTranscript) {
        const cleanText = finalTranscript.replace(/\.$/, "").trim();
        setIsListening(false);
        setSearch(cleanText);

        setTimeout(() => {
          setShowVoiceModal(false);
          navigate(`/search?q=${encodeURIComponent(cleanText)}`);
        }, 600);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      if (event.error === "no-speech") {
        setTranscript("Didn't catch that. Try speaking again.");
      } else {
        setTranscript("Microphone error. Please try again.");
      }
      setIsListening(false);

      setTimeout(() => {
        setShowVoiceModal(false);
      }, 2500);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const closeVoiceModal = () => {
    setShowVoiceModal(false);
    setIsListening(false);
  };

  const SearchIcon = ({ size = 16, color = "#333" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16" y2="16" />
      <circle cx="8.5" cy="8.5" r="1.8" fill={color} stroke="none" />
    </svg>
  );

  const MicIcon = ({ size = 20, standColor = "#79bcff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="7.5" y="1" width="9" height="14" rx="4.5" fill={standColor} />
      <circle cx="12" cy="6" r="1.5" fill="#333" />
      <path d="M7.5 9.5 L12 12 L16.5 9.5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M5 11v2a7 7 0 0 0 14 0v-2M12 20v3M8 23h8" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );

  const handleContactChange = (e) => setContact({ ...contact, [e.target.name]: e.target.value });
  const handlePickupChange = (e) => setPickup({ ...pickup, [e.target.name]: e.target.value });
  const handleDropChange = (e) => setDrop({ ...drop, [e.target.name]: e.target.value });

  const buildFullAddress = (loc) =>
    `${loc.building}, ${loc.street}, ${loc.landmark ? loc.landmark + ", " : ""}${loc.city} - ${loc.postalCode}`;

  const handleSubmit = async () => {
    if (isGuest) {
      setError("Please log in first");
      setShowLogin(true);
      return;
    }
    if (!contact.fullName || !contact.phone) {
      setError("Please provide your name and phone number");
      return;
    }
    if (!pickup.building || !pickup.street || !pickup.city || !pickup.postalCode) {
      setError("Please fill in all required pickup address fields");
      return;
    }
    if (!drop.building || !drop.street || !drop.city || !drop.postalCode) {
      setError("Please fill in all required drop address fields");
      return;
    }
    if (!neededDate || !neededTime) {
      setError("Please specify both date and time for when it's needed");
      return;
    }

    setError("");
    setSubmitting(true);
    
    const combinedNeededBy = `${neededDate} ${neededTime}`;

    try {
      const res = await axios.post(`${API_URL}/courier`, {
        user_id,
        route_id: selectedRouteId, // Included selected route id
        pickup_address: buildFullAddress(pickup),
        drop_address: buildFullAddress(drop),
        needed_by: combinedNeededBy,
        notes: notes,
        name: contact.fullName,
        phone_number: contact.phone,
        alt_phone_num: contact.altPhone,
        email: user_id, 
        building_name: drop.building,
        street: drop.street,
        landmark: drop.landmark,
        city_or_village: drop.city,
        pin_code: drop.postalCode,
        state: "Telangana" 
      });
      
      if (res.data.success) {
        setSubmitted(true);
      } else {
        setError(res.data.message || "Something went wrong");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const activeRouteData = (availableRoutes || []).find(r => r.id === selectedRouteId) || { from: "...", to: "...", stops: "", approvedCount: 0 };

  return (
    <>
      <style>
        {`
          @keyframes pulseGlow {
            0% { box-shadow: 0 0 0 0 rgba(40, 116, 240, 0.4); }
            70% { box-shadow: 0 0 0 20px rgba(40, 116, 240, 0); }
            100% { box-shadow: 0 0 0 0 rgba(40, 116, 240, 0); }
          }
        `}
      </style>

      {/* LOGIN MODAL OVERLAY */}
      {showLogin && (
        <div style={styles.overlay}>
          <div style={styles.loginBox}>
            <button style={styles.closeBtn} onClick={() => setShowLogin(false)}>×</button>
            <Login onLoginSuccess={() => { 
              setShowLogin(false); 
              window.location.reload(); 
            }} />
          </div>
        </div>
      )}

      {showVoiceModal && (
        <div style={styles.voiceOverlay} onClick={closeVoiceModal}>
          <div style={styles.voiceModal} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeModalBtn} onClick={closeVoiceModal}>✕</button>
            <h3 style={styles.voiceTitle}>{isListening ? "Speak now" : "Processing"}</h3>
            <p style={{ ...styles.voiceTranscript, color: transcript === "Listening..." ? "#888" : "#222" }}>
              {transcript}
            </p>
            <div style={{
              ...styles.bigMicContainer,
              animation: isListening ? "pulseGlow 1.5s infinite" : "none",
              backgroundColor: isListening ? "#2874f0" : "#ccc"
            }}>
              <MicIcon size={34} standColor={isListening ? "#fff" : "#555"} />
            </div>
          </div>
        </div>
      )}

      <div style={styles.page}>
        <div style={styles.fixedHeader}>
          <div style={styles.headerTop}>
            {submitted && <h2 style={styles.logo} onClick={() => navigate("/")}>ShiperBox</h2>}
            <div style={styles.searchRow}>
              <div style={styles.searchBox}>
                <div style={styles.searchIconWrapper}>
                  <SearchIcon size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  style={styles.searchInput}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && goSearch()}
                />
              </div>
              <button style={styles.micBtn} onClick={handleVoiceSearch}>
                <MicIcon size={20} standColor="#fff" />
              </button>
            </div>
          </div>
          <div style={styles.headerBottom}>
            <button style={styles.backBtnBlack} onClick={() => navigate(-1)}>←</button>
            <h3 style={styles.categoryTitle}>{submitted ? "COURIER REQUEST" : "1-DAY COURIER"}</h3>
          </div>
        </div>

        <div style={styles.scrollArea}>
          {isGuest ? (
            <div style={styles.confirmCard}>
              <h2 style={styles.heading}>Login Required</h2>
              <p style={styles.confirmText}>
                You must be logged in to place a courier request. Please authenticate to continue.
              </p>
              <button style={styles.submitBtn} onClick={() => setShowLogin(true)}>Login to Continue</button>
            </div>
          ) : submitted ? (
            <div style={styles.confirmCard}>
              <div style={styles.confirmIcon}>✓</div>
              <h2 style={styles.heading}>Request received</h2>
              <p style={styles.confirmText}>
                We're reviewing your courier request now. We'll reach out to confirm pickup timing and pricing.
              </p>
              <button style={styles.submitBtn} onClick={() => navigate("/")}>Back to Home</button>
            </div>
          ) : (
            <div style={styles.card}>
              <div style={{ textAlign: "center", marginBottom: "25px" }}>
                <p style={styles.subheading}>
                   Enter your details below and we'll confirm timing and pricing.
                </p>
              </div>

              {/* --- ROUTE TRACKER BLOCK --- */}
              <div style={styles.trackerContainer}>
                <select 
                  value={selectedRouteId} 
                  onChange={(e) => setSelectedRouteId(Number(e.target.value))}
                  style={styles.routeDropdown}
                >
                  {(availableRoutes || []).map(route => (
                    <option key={route.id} value={route.id}>
                      Route {route.id}: {route.from} {route.stops ? `- ${route.stops} -` : "to"} {route.to}
                    </option>
                  ))}
                </select>

                <p style={styles.routeText}>
                  {" "}
                  <span style={styles.highlight}>{activeRouteData.from}</span>
                  
                  {activeRouteData.stops ? (
                    <span style={{ fontSize: "12px", color: "#6b7280", margin: "0 6px", fontWeight: "400" }}>
                       - {activeRouteData.stops} - 
                    </span>
                  ) : (
                    <span style={{ margin: "0 6px" }}> ➔ </span>
                  )}
                  
                  <span style={styles.highlight}>{activeRouteData.to}</span>
                </p>

                <p style={styles.infoNote}>
                  * Note: We can deliver to any place in between these route locations.
                </p>

                <div style={{...styles.circlesRow, marginTop: "15px"}}>
                  {[...Array(5)].map((_, i) => {
                    const isFilled = i < activeRouteData.approvedCount;
                    return (
                      <div key={i} style={{ ...styles.circle, backgroundColor: isFilled ? "#10b981" : "#ffffff", borderColor: isFilled ? "#10b981" : "#d1d5db" }}>
                        {isFilled && <span style={styles.checkMark}>✓</span>}
                      </div>
                    );
                  })}
                </div>

                <p style={styles.infoNote}>
                  * Note: When all 5 slots are filled, the delivery trip will begin!
                </p>
              </div>

              {/* --- CONTACT DETAILS BLOCK --- */}
              <div style={styles.contactBlock}>
                <h3 style={styles.sectionTitle}>👤 Contact Details</h3>
                
                <label style={styles.label}>Full Name *</label>
                <input type="text" name="fullName" value={contact.fullName} onChange={handleContactChange} placeholder="Enter your full name" style={styles.input} />

                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Phone Number *</label>
                    <input type="tel" name="phone" value={contact.phone} onChange={handleContactChange} placeholder="e.g. 9876543210" style={styles.input} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Alternative Number</label>
                    <input type="tel" name="altPhone" value={contact.altPhone} onChange={handleContactChange} placeholder="Optional" style={styles.input} />
                  </div>
                </div>
              </div>

              {/* --- PICKUP ADDRESS BLOCK --- */}
              <div style={styles.pickupBlock}>
                <h3 style={styles.sectionTitle}>📦 Pickup Address</h3>
                
                <label style={styles.label}>Building / Flat No. *</label>
                <input type="text" name="building" value={pickup.building} onChange={handlePickupChange} placeholder="e.g. 101, Sunshine Apartments" style={styles.input} />

                <label style={{ ...styles.label, marginTop: "12px" }}>Street / Colony *</label>
                <input type="text" name="street" value={pickup.street} onChange={handlePickupChange} placeholder="e.g. Main Road, Phase 1" style={styles.input} />

                <label style={{ ...styles.label, marginTop: "12px" }}>Landmark (Optional)</label>
                <input type="text" name="landmark" value={pickup.landmark} onChange={handlePickupChange} placeholder="e.g. Opposite City Mall" style={styles.input} />

                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>City *</label>
                    <input type="text" name="city" value={pickup.city} onChange={handlePickupChange} placeholder="e.g. Hyderabad" style={styles.input} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Postal Code *</label>
                    <input type="text" name="postalCode" value={pickup.postalCode} onChange={handlePickupChange} placeholder="e.g. 500001" style={styles.input} />
                  </div>
                </div>
              </div>

              {/* --- DROP ADDRESS BLOCK --- */}
              <div style={styles.dropBlock}>
                <h3 style={styles.sectionTitle}>📍 Drop Address</h3>
                
                <label style={styles.label}>Building / Flat No. *</label>
                <input type="text" name="building" value={drop.building} onChange={handleDropChange} placeholder="e.g. 101, Sunshine Apartments" style={styles.input} />

                <label style={{ ...styles.label, marginTop: "12px" }}>Street / Colony *</label>
                <input type="text" name="street" value={drop.street} onChange={handleDropChange} placeholder="e.g. Main Road, Phase 1" style={styles.input} />

                <label style={{ ...styles.label, marginTop: "12px" }}>Landmark (Optional)</label>
                <input type="text" name="landmark" value={drop.landmark} onChange={handleDropChange} placeholder="e.g. Opposite City Mall" style={styles.input} />

                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>City *</label>
                    <input type="text" name="city" value={drop.city} onChange={handleDropChange} placeholder="e.g. Hyderabad" style={styles.input} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Postal Code *</label>
                    <input type="text" name="postalCode" value={drop.postalCode} onChange={handleDropChange} placeholder="e.g. 500001" style={styles.input} />
                  </div>
                </div>
              </div>

              {/* --- TIMING & PACKAGE BLOCK --- */}
              <div style={styles.timingBlock}>
                <h3 style={styles.sectionTitle}>⏰ Timing & Package</h3>

                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Date Needed *</label>
                    <input
                      type="date"
                      value={neededDate}
                      onChange={(e) => setNeededDate(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Time Needed *</label>
                    <input
                      type="time"
                      value={neededTime}
                      onChange={(e) => setNeededTime(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                <label style={{ ...styles.label, marginTop: "12px" }}>Package details (Optional)</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="e.g. Documents, 1 small box, approx 2kg" 
                  style={styles.textarea} 
                />
              </div>

              {error && <p style={styles.error}>{error}</p>}
              
              <button style={{ ...styles.submitBtn, opacity: submitting ? 0.6 : 1 }} onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Route Request"}
              </button>
            </div>
          )}
        </div>

        <MobileBottomNav />
      </div>
    </>
  );
}

const styles = {
  page: { backgroundColor: "#f5f6f8", minHeight: "100vh" }, 

  fixedHeader: { position: "sticky", top: 0, zIndex: 1000, display: "flex", flexDirection: "column", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", backgroundColor: "#8ec5fc" },
  headerTop: { display: "flex", alignItems: "center", padding: "10px 15px", gap: "10px", height: "60px", boxSizing: "border-box" },
  logo: { margin: "12px 0", fontSize: "20px", color: "#fff", cursor: "pointer", flexShrink: 0, fontWeight: "bold" },
  searchRow: { display: "flex", alignItems: "center", flex: 1, gap: "8px" },
  searchBox: { flex: 1, height: "36px", display: "flex", alignItems: "center", backgroundColor: "#ffffff", borderRadius: "10px", overflow: "hidden" },
  searchIconWrapper: { paddingLeft: "12px", display: "flex", alignItems: "center", justifyContent: "center" },
  searchInput: { flex: 1, border: "none", padding: "0 10px", outline: "none", fontSize: "13px", background: "transparent", color: "black" },
  micBtn: { width: "36px", height: "36px", border: "none", borderRadius: "50%", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  headerBottom: { display: "flex", alignItems: "center", justifyContent: "center", height: "40px", backgroundColor: "transparent", color: "#ffffff", position: "relative", borderBottom: "1px solid #ddd", boxSizing: "border-box" },
  backBtnBlack: {margin:"0 0 10px 0", position: "absolute", left: "25px", border: "none", background: "none", color: "#ffffff", fontSize: "30px", fontWeight: "bold", cursor: "pointer", padding: 0 },
  categoryTitle: { margin: 0, fontSize: "15px", fontWeight: "bold", letterSpacing: "0.5px", textTransform: "uppercase" },

  scrollArea: { padding: "20px 15px 90px", boxSizing: "border-box" },
  
  card: { background: "#fff", borderRadius: "14px", padding: "16px", boxShadow: "0 1px 5px rgba(0,0,0,0.08)" },
  heading: { margin: "0 0 8px 0", color: "#111", fontSize: "20px", fontWeight: "800" },
  subheading: { color: "#666", fontSize: "13px", marginBottom: "15px", lineHeight: 1.5 },
  
  // New Tracker Styles for Mobile
  trackerContainer: { backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", marginBottom: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  routeDropdown: { padding: "12px 10px", fontSize: "14px", borderRadius: "8px", border: "2px solid #2874f0", color: "#111827", fontWeight: "bold", width: "100%", marginBottom: "15px", backgroundColor: "#fff", outline: "none" },
  circlesRow: { display: "flex", gap: "8px", marginBottom: "8px" },
  circle: { width: "24px", height: "24px", borderRadius: "50%", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center" },
  checkMark: { color: "#fff", fontSize: "12px", fontWeight: "bold" },
  routeText: { margin: 0, fontSize: "14px", color: "#4b5563", fontWeight: "500", textAlign: "center" },
  infoNote: { fontSize: "12px", color: "#000000", fontStyle: "italic", textAlign: "center", margin: "6px 0 0 0", lineHeight: 1.4 },
  highlight: { color: "#111827", fontWeight: "800" },

  // Colored Blocks for distinct UI separation
  contactBlock: { backgroundColor: "#cbe5ff", border: "1px solid #cce3ff", borderRadius: "12px", padding: "16px", marginBottom: "16px" },
  pickupBlock: { backgroundColor: "#e5effa", border: "1px solid #000000", borderRadius: "12px", padding: "16px", marginBottom: "16px" },
  dropBlock: { backgroundColor: "#e7e7e7", border: "1px solid #000000", borderRadius: "12px", padding: "16px", marginBottom: "16px" },
  timingBlock: { backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", marginBottom: "10px" },

  sectionTitle: { color: "#222", fontSize: "15px", marginTop: "0", marginBottom: "12px", fontWeight: "700" },
  label: { display: "block", fontWeight: "600", fontSize: "13px", marginBottom: "6px", color: "#444" },
  input: { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px", boxSizing: "border-box", backgroundColor: "#fff", outlineColor: "#8ec5fc", color: "#333" },
  textarea: { width: "100%", height: "80px", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", backgroundColor: "#fff", outlineColor: "#8ec5fc" },
  
  error: { color: "#e53935", fontSize: "14px", marginTop: "14px", fontWeight: "600", textAlign: "center" },
  submitBtn: { width: "100%", marginTop: "15px", padding: "14px", border: "none", borderRadius: "10px", background: "#8ec5fc" , color: "#fff", fontWeight: "bold", fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 12px rgba(142, 197, 252, 0.4)" },

  confirmCard: { background: "#fff", borderRadius: "14px", padding: "30px 20px", textAlign: "center", boxShadow: "0 1px 5px rgba(0,0,0,0.08)" },
  confirmIcon: { width: "60px", height: "60px", borderRadius: "50%", background: "#dff8e6", color: "#0c831f", fontSize: "30px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  confirmText: { color: "#555", lineHeight: 1.6, margin: "12px 0 24px" },

  // Modal Styles
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 },
  loginBox: { background: "white", padding: "20px", borderRadius: "12px", width: "90%", maxWidth: "400px", position: "relative", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" },
  closeBtn: { position: "absolute", top: "10px", right: "15px", border: "none", background: "none", fontSize: "24px", cursor: "pointer", color: "#333", zIndex: 10 },

  voiceOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn 0.2s ease" },
  voiceModal: { width: "100%", backgroundColor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "30px 20px 50px 20px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", boxShadow: "0 -4px 15px rgba(0,0,0,0.2)" },
  closeModalBtn: { position: "absolute", top: "15px", right: "20px", background: "none", border: "none", fontSize: "20px", color: "#666", cursor: "pointer", padding: "5px" },
  voiceTitle: { margin: "0 0 15px 0", fontSize: "18px", fontWeight: "bold", color: "#333" },
  voiceTranscript: { fontSize: "22px", textAlign: "center", minHeight: "60px", margin: "0 0 30px 0", display: "flex", alignItems: "center", fontStyle: "italic", maxWidth: "85%" },
  bigMicContainer: { width: "70px", height: "70px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.3s ease" }
};