import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
import MobileHeader from "../mobile/MobileHeader";
import MobileBottomNav from "../mobile/MobileBottomNav";
import Login from "../pages/Login"; 

const emptyLocation = { building: "", street: "", landmark: "", city: "", postalCode: "" };

export default function CourierOrder() {
  const navigate = useNavigate();
  const user_id = localStorage.getItem("phone") || "guest";
  
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const isGuest = !isLoggedIn || !user_id || user_id === "guest" || user_id === "null" || user_id === "undefined" || String(user_id).trim() === "";

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
  const [headerHeight, setHeaderHeight] = useState(112);

  const [contact, setContact] = useState({ fullName: "", phone: "", altPhone: "" });
  
  const [pickup, setPickup] = useState({ ...emptyLocation });
  const [drop, setDrop] = useState({ ...emptyLocation });
  
  const [neededDate, setNeededDate] = useState("");
  const [neededTime, setNeededTime] = useState("");
  const [neededAmPm, setNeededAmPm] = useState("AM");
  
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [showLogin, setShowLogin] = useState(false);

  const goSearch = () => {
    if (search.trim() !== "") navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  const handleContactChange = (e) => setContact({ ...contact, [e.target.name]: e.target.value });
  const handlePickupChange = (e) => setPickup({ ...pickup, [e.target.name]: e.target.value });
  const handleDropChange = (e) => setDrop({ ...drop, [e.target.name]: e.target.value });

  const buildFullAddress = (loc) =>
    `${loc.building}, ${loc.street}, ${loc.landmark ? loc.landmark + ", " : ""}${loc.city}${loc.postalCode ? " - " + loc.postalCode : ""}`;

  const to24HourTime = (time12, ampm) => {
    const [hoursStr, minutesStr] = time12.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10) || 0;
    if (ampm === "PM" && hours !== 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  // Auto-inserts the colon as the user types digits, so "1100" becomes "11:00"
  // instead of sitting there unformatted.
  const formatTimeInput = (raw) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  };

  const handleSubmit = async () => {
    if (isGuest) {
      setError("Please log in first");
      setShowLogin(true);
      return;
    }
    
    // UPDATED VALIDATION: altPhone is now mandatory, postalCode is omitted
    if (!contact.fullName || !contact.phone || !contact.altPhone) {
      setError("Please provide your name, phone number, and alternative number");
      return;
    }
    if (!pickup.building || !pickup.street || !pickup.city) {
      setError("Please fill in all required pickup address fields");
      return;
    }
    if (!drop.building || !drop.street || !drop.city) {
      setError("Please fill in all required drop address fields");
      return;
    }
    if (!neededDate || !neededTime) {
      setError("Please specify both date and time for when it's needed");
      return;
    }
    if (!/^([1-9]|1[0-2]):[0-5][0-9]$/.test(neededTime)) {
      setError("Please enter a valid time, e.g. 10:30");
      return;
    }

    setError("");
    setSubmitting(true);
    
    const combinedNeededBy = `${neededDate} ${to24HourTime(neededTime, neededAmPm)}`;

    try {
      const res = await axios.post(`${API_URL}/courier`, {
        user_id,
        route_id: selectedRouteId,
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
    <div style={styles.page}>
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

      <MobileHeader
        searchValue={search}
        setSearchValue={setSearch}
        onSearch={goSearch}
        showLogo={false}
        showTitleBar
        showBackButton={true}
        onBack={() => navigate(-1)}
        title={submitted ? "COURIER REQUEST" : "1-DAY COURIER"}
        activeTab="home"
        isLoggedIn={!isGuest}
        onHeightChange={setHeaderHeight}
      />

      <div style={{ ...styles.scrollArea, paddingTop: `${headerHeight + 15}px` }}>
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

            <div style={styles.instructionBanner}>
              <p style={styles.instructionText}>
                👉 <b>Note:</b> Please fill in your correct details below and click on <b>Submit Request</b> to submit your order.
              </p>
            </div>

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
                  <label style={styles.label}>Whatsapp Number *</label>
                  <input type="tel" name="altPhone" value={contact.altPhone} onChange={handleContactChange} placeholder="e.g. 9876543210" style={styles.input} />
                </div>
              </div>
            </div>

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
                  <label style={styles.label}>Postal Code (Optional)</label>
                  <input type="text" name="postalCode" value={pickup.postalCode} onChange={handlePickupChange} placeholder="e.g. 500001" style={styles.input} />
                </div>
              </div>
            </div>

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
                  <label style={styles.label}>Postal Code (Optional)</label>
                  <input type="text" name="postalCode" value={drop.postalCode} onChange={handleDropChange} placeholder="e.g. 500001" style={styles.input} />
                </div>
              </div>
            </div>

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
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="text"
                      maxLength="5"
                      placeholder="HH:MM"
                      value={neededTime}
                      onChange={(e) => setNeededTime(formatTimeInput(e.target.value))}
                      style={{ ...styles.input, flex: 1 }}
                    />
                    <select
                      value={neededAmPm}
                      onChange={(e) => setNeededAmPm(e.target.value)}
                      style={{ ...styles.input, width: "68px", flexShrink: 0, padding: "10px 6px", cursor: "pointer" }}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
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
  );
}

const styles = {
  page: { backgroundColor: "#f5f6f8", minHeight: "100vh" }, 

  scrollArea: { padding: "0 15px 90px", boxSizing: "border-box" },
  
  card: { background: "#fff", borderRadius: "14px", padding: "16px", boxShadow: "0 1px 5px rgba(0,0,0,0.08)" },
  heading: { margin: "0 0 8px 0", color: "#111", fontSize: "20px", fontWeight: "800" },
  subheading: { color: "#666", fontSize: "13px", marginBottom: "15px", lineHeight: 1.5 },
  
  trackerContainer: { backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", marginBottom: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  routeDropdown: { padding: "12px 10px", fontSize: "14px", borderRadius: "8px", border: "2px solid #2874f0", color: "#111827", fontWeight: "bold", width: "100%", marginBottom: "15px", backgroundColor: "#fff", outline: "none" },
  circlesRow: { display: "flex", gap: "8px", marginBottom: "8px" },
  circle: { width: "24px", height: "24px", borderRadius: "50%", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center" },
  checkMark: { color: "#fff", fontSize: "12px", fontWeight: "bold" },
  routeText: { margin: 0, fontSize: "14px", color: "#4b5563", fontWeight: "500", textAlign: "center" },
  infoNote: { fontSize: "12px", color: "#000000", fontStyle: "italic", textAlign: "center", margin: "6px 0 0 0", lineHeight: 1.4 },
  highlight: { color: "#111827", fontWeight: "800" },

  noteCard: { backgroundColor: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "12px", padding: "16px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" },
  noteTitle: { margin: "0 0 8px 0", fontSize: "14px", fontWeight: "800", color: "#1e40af", display: "flex", alignItems: "center" },
  noteText: { margin: "0 0 10px 0", fontSize: "13px", color: "#334155", lineHeight: "1.5" },
  noteContactBox: { backgroundColor: "#dbeafe", borderRadius: "8px", padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #bfdbfe" },
  noteContactLabel: { fontSize: "12px", color: "#1e40af", fontWeight: "600" },
  noteContactNumber: { fontSize: "14px", fontWeight: "800", color: "#1d4ed8" },
  instructionBanner: { backgroundColor: "#fffbeb", borderLeft: "4px solid #f59e0b", padding: "12px 14px", marginBottom: "16px", borderRadius: "6px" },
  instructionText: { margin: 0, fontSize: "13px", color: "#b45309", lineHeight: "1.5" },

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

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 },
  loginBox: { background: "white", padding: "20px", borderRadius: "12px", width: "90%", maxWidth: "400px", position: "relative", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" },
  closeBtn: { position: "absolute", top: "10px", right: "15px", border: "none", background: "none", fontSize: "24px", cursor: "pointer", color: "#333", zIndex: 10 }
};