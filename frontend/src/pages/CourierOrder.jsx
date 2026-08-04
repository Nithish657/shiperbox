import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import { API_URL } from "../api";
import Login from "../pages/Login";

const emptyLocation = { building: "", street: "", landmark: "", city: "", postalCode: "" };

export default function CourierOrder() {
  const navigate = useNavigate();
  const user_id = localStorage.getItem("phone") || "guest";
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(1);

  const [pickup, setPickup] = useState({ ...emptyLocation });
  const [drop, setDrop] = useState({ ...emptyLocation });
  const [neededDate, setNeededDate] = useState("");
  const [neededTime, setNeededTime] = useState("");
  const [neededAmPm, setNeededAmPm] = useState("AM"); 
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState({ fullName: "", phone: "", altPhone: "" });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Reset scroll position on mount — React Router keeps the previous
    // page's scroll offset by default, which made this page open already
    // scrolled down (mid-form) with the fixed header floating over content.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
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

  const handleContactChange = (e) => setContact({ ...contact, [e.target.name]: e.target.value });
  const handlePickupChange = (e) => setPickup({ ...pickup, [e.target.name]: e.target.value });
  const handleDropChange = (e) => setDrop({ ...drop, [e.target.name]: e.target.value });
  const buildFullAddress = (loc) => `${loc.building}, ${loc.street}, ${loc.landmark}, ${loc.city} - ${loc.postalCode}`;

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
    if (!isLoggedIn || user_id === "guest") return setError("Please log in first");
    if (!contact.fullName || !contact.phone) return setError("Please provide your name and phone number");
    if (!pickup.building || !pickup.street || !pickup.landmark || !pickup.city) return setError("Please fill in required pickup address fields");
    if (!drop.building || !drop.street || !drop.landmark || !drop.city) return setError("Please fill in required drop address fields");
    if (!neededDate || !neededTime) return setError("Please specify both date and time");

    setError(""); setSubmitting(true);
    const combinedNeededBy = `${neededDate} ${to24HourTime(neededTime, neededAmPm)}`;

    try {
      const res = await axios.post(`${API_URL}/courier`, {
        user_id, route_id: selectedRouteId, pickup_address: buildFullAddress(pickup), drop_address: buildFullAddress(drop),
        needed_by: combinedNeededBy, notes: notes.trim(), name: contact.fullName, phone_number: contact.phone,
        alt_phone_num: contact.altPhone, email: user_id, building_name: drop.building, street: drop.street,         
        landmark: drop.landmark, city_or_village: drop.city, pin_code: drop.postalCode, state: "Telangana" 
      });
      if (res.data.success) setSubmitted(true);
      else setError(res.data.message || "Something went wrong");
    } catch (err) { setError(err.response?.data?.message || "Failed to submit"); } 
    finally { setSubmitting(false); }
  };

  const activeRouteData = (availableRoutes || []).find(r => r.id === selectedRouteId) || { from: "...", to: "...", stops: "", approvedCount: 0 };

  return (
    <div>
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
            <p style={styles.confirmText}>You must be logged in to place a courier request.</p>
            <button style={styles.button} onClick={() => setShowLogin(true)}>Login to Continue</button>
          </div>
        ) : submitted ? (
          <div style={styles.confirmCard}>
            <div style={styles.confirmIcon}>✓</div>
            <h2 style={styles.heading}>Request received</h2>
            <p style={styles.confirmText}>We're reviewing your courier request for Route {selectedRouteId}.</p>
            <button style={styles.button} onClick={() => navigate("/")}>Back to Home</button>
          </div>
        ) : (
          <div style={styles.card}>
            
            <div style={{ textAlign: "center", marginBottom: "25px" }}>
              <h2 style={styles.heading}>1-Day Courier</h2>
              <p style={styles.subheading}>Select your delivery route to see active availability.</p>
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
                  <span style={{ fontSize: "13px", color: "#000000", margin: "0 8px", fontWeight: "400" }}>
                     - {activeRouteData.stops} - 
                  </span>
                ) : (
                  <span style={{ margin: "0 8px" }}> ➔ </span>
                )}
                
                <span style={styles.highlight}>{activeRouteData.to}</span>
              </p>
              
              {/* NOTE 1: Added delivery scope note */}
              <p style={styles.infoNote}>
                * Note: We can deliver to any place in between these route locations.
              </p>

              <div style={{...styles.circlesRow, marginTop: "20px"}}>
                {[...Array(5)].map((_, i) => {
                  const isFilled = i < activeRouteData.approvedCount;
                  return (
                    <div key={i} style={{ ...styles.circle, backgroundColor: isFilled ? "#10b981" : "#ffffff", borderColor: isFilled ? "#10b981" : "#d1d5db" }}>
                      {isFilled && <span style={styles.checkMark}>✓</span>}
                    </div>
                  );
                })}
              </div>
              
              {/* NOTE 2: Added tracking start note */}
              <p style={styles.infoNote}>
                * Note: When all 5 slots are filled, the delivery trip will begin!
              </p>
            </div>

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
                👉 <b>Note:</b> Please fill in your correct details below and click on <b>Submit Request</b> to submit your order.
              </p>
            </div>

            <h3 style={styles.outsideHeading}>👤 Contact Details</h3>
            <div style={styles.contactBlock}>
              <label style={styles.label}>Full Name *</label>
              <input type="text" name="fullName" value={contact.fullName} onChange={handleContactChange} style={styles.input} />

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <div style={{ flex: 1 }}><label style={styles.label}>Phone Number *</label><input type="tel" name="phone" value={contact.phone} onChange={handleContactChange} style={styles.input} /></div>
                <div style={{ flex: 1 }}><label style={styles.label}>Whatsapp Number *</label><input type="tel" name="altPhone" value={contact.altPhone} onChange={handleContactChange} style={styles.input} /></div>
              </div>
            </div>

            <div style={styles.addressRow}>
              <div style={styles.halfColumn}>
                <h3 style={styles.outsideHeading}>📦 Pickup Address</h3>
                <div style={styles.pickupBlock}>
                  <label style={styles.label}>Building / Flat No. *</label>
                  <input type="text" name="building" value={pickup.building} onChange={handlePickupChange} style={styles.input} />
                  <label style={{ ...styles.label, marginTop: "16px" }}>Street / Colony *</label>
                  <input type="text" name="street" value={pickup.street} onChange={handlePickupChange} style={styles.input} />
                  <label style={{ ...styles.label, marginTop: "16px" }}>Landmark *</label>
                  <input type="text" name="landmark" value={pickup.landmark} onChange={handlePickupChange} style={styles.input} />
                  <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                    <div style={{ flex: 1 }}><label style={styles.label}>City *</label><input type="text" name="city" value={pickup.city} onChange={handlePickupChange} style={styles.input} /></div>
                    <div style={{ flex: 1 }}><label style={styles.label}>Postal Code *</label><input type="text" name="postalCode" value={pickup.postalCode} onChange={handlePickupChange} style={styles.input} /></div>
                  </div>
                </div>
              </div>

              <div style={styles.halfColumn}>
                <h3 style={styles.outsideHeading}>📍 Drop Address</h3>
                <div style={styles.dropBlock}>
                  <label style={styles.label}>Building / Flat No. *</label>
                  <input type="text" name="building" value={drop.building} onChange={handleDropChange} style={styles.input} />
                  <label style={{ ...styles.label, marginTop: "16px" }}>Street / Colony *</label>
                  <input type="text" name="street" value={drop.street} onChange={handleDropChange} style={styles.input} />
                  <label style={{ ...styles.label, marginTop: "16px" }}>Landmark *</label>
                  <input type="text" name="landmark" value={drop.landmark} onChange={handleDropChange} style={styles.input} />
                  <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                    <div style={{ flex: 1 }}><label style={styles.label}>City *</label><input type="text" name="city" value={drop.city} onChange={handleDropChange} style={styles.input} /></div>
                    <div style={{ flex: 1 }}><label style={styles.label}>Postal Code *</label><input type="text" name="postalCode" value={drop.postalCode} onChange={handleDropChange} style={styles.input} /></div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ ...styles.addressRow, marginTop: "10px" }}>
              <div style={styles.halfColumn}>
                <h3 style={styles.outsideHeading}>⏰ Timing</h3>
                <div style={styles.timingBlock}>
                  <label style={styles.label}>Date Needed *</label>
                  <input type="date" value={neededDate} onChange={(e) => setNeededDate(e.target.value)} style={styles.input} />
                  <label style={{ ...styles.label, marginTop: "16px" }}>Time Needed *</label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input type="text" maxLength="5" placeholder="HH:MM (e.g. 10:30)" value={neededTime} onChange={(e) => setNeededTime(formatTimeInput(e.target.value))} style={{ ...styles.input, flex: 1 }} />
                    <select value={neededAmPm} onChange={(e) => setNeededAmPm(e.target.value)} style={{ ...styles.input, width: "85px", flexShrink: 0, padding: "14px 10px", cursor: "pointer" }}>
                      <option value="AM">AM</option><option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style={styles.halfColumn}>
                <h3 style={styles.outsideHeading}>🧳 Package Details</h3>
                <div style={styles.packageBlock}>
                  <label style={styles.label}>Description *</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={styles.bigTextarea} />
                </div>
              </div>
            </div>

            {error && <p style={styles.error}>{error}</p>}
            <button style={{ ...styles.button, opacity: submitting ? 0.6 : 1 }} onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting Request..." : `Submit Route ${selectedRouteId} Request`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { paddingTop: "130px", paddingBottom: "60px", paddingLeft: "15px", paddingRight: "15px", display: "flex", justifyContent: "center", backgroundColor: "#f4f7f9", minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif" },
  card: { background: "#ffffff", borderRadius: "24px", padding: "45px 50px", maxWidth: "1050px", width: "100%", boxShadow: "0 10px 40px rgba(0, 0, 0, 0.04)", boxSizing: "border-box" },
  trackerContainer: { backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "24px", marginBottom: "35px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)" },
  routeDropdown: { padding: "12px 20px", fontSize: "16px", borderRadius: "10px", border: "2px solid #2874f0", color: "#111827", fontWeight: "bold", cursor: "pointer", marginBottom: "20px", outline: "none", backgroundColor: "#fff" },
  circlesRow: { display: "flex", gap: "12px", marginBottom: "12px" },
  circle: { width: "26px", height: "26px", borderRadius: "50%", border: "2.5px solid", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s ease" },
  checkMark: { color: "#fff", fontSize: "14px", fontWeight: "bold" },
  routeText: { margin: 0, fontSize: "16px", color: "#4b5563", fontWeight: "500" },
  infoNote: { fontSize: "14px", color: "#000000", fontStyle: "italic", textAlign: "center", margin: "8px 0 0 0" },
  highlight: { color: "#111827", fontWeight: "800" },
  heading: { margin: "0 0 10px 0", color: "#1a1a1a", fontSize: "30px", fontWeight: "800", letterSpacing: "-0.5px" },
  subheading: { color: "#6b7280", fontSize: "16px", margin: "0", lineHeight: 1.6 },
  outsideHeading: { color: "#374151", fontSize: "18px", marginTop: "35px", marginBottom: "14px", fontWeight: "700", letterSpacing: "-0.3px", display: "flex", alignItems: "center", gap: "8px" },
  label: { display: "block", fontWeight: "600", fontSize: "13px", marginBottom: "8px", color: "#4b5563" },
  addressRow: { display: "flex", gap: "24px", width: "100%" }, 
  halfColumn: { flex: 1, display: "flex", flexDirection: "column" },
  contactBlock: { backgroundColor: "#f0f7ff", border: "1px solid #dbeafe", borderRadius: "16px", padding: "24px", marginBottom: "20px" },
  pickupBlock: { backgroundColor: "#f4f9ff", border: "1px solid #e0f0fe", borderRadius: "16px", padding: "24px", height: "100%", boxSizing: "border-box" },
  dropBlock: { backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "24px", height: "100%", boxSizing: "border-box" },
  timingBlock: { backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "24px", height: "100%", boxSizing: "border-box" },
  packageBlock: { backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "24px", height: "100%", boxSizing: "border-box" },
  input: { width: "100%", padding: "14px 16px", borderRadius: "10px", border: "1.5px solid #d1d5db", fontSize: "15px", boxSizing: "border-box", outline: "none" },
  bigTextarea: { width: "100%", height: "123px", padding: "14px 16px", borderRadius: "10px", border: "1.5px solid #d1d5db", fontSize: "15px", boxSizing: "border-box", resize: "none" },
  error: { color: "#ef4444", fontSize: "14px", marginTop: "16px", fontWeight: "600", textAlign: "center", background: "#fef2f2", padding: "10px", borderRadius: "8px" },
  button: { width: "100%", marginTop: "35px", padding: "18px", border: "none", borderRadius: "12px", background: "linear-gradient(135deg, #8ec5fc 0%, #68a8f7 100%)", color: "#fff", fontWeight: "800", fontSize: "18px", letterSpacing: "0.5px", cursor: "pointer" },
  confirmCard: { background: "#fff", borderRadius: "20px", padding: "50px 40px", maxWidth: "480px", textAlign: "center", alignSelf: "flex-start", marginTop: "40px" },
  confirmIcon: { width: "70px", height: "70px", borderRadius: "50%", background: "#dcfce7", color: "#16a34a", fontSize: "35px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  confirmText: { color: "#4b5563", lineHeight: 1.6, margin: "12px 0 28px", fontSize: "16px" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 },
  loginBox: { background: "white", padding: "24px", borderRadius: "16px", width: "420px", maxWidth: "90%", position: "relative" },
  closeBtn: { position: "absolute", top: "12px", right: "16px", border: "none", background: "#f3f4f6", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", zIndex: 10 },
  
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