import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
import MobileBottomNav from "../mobile/MobileBottomNav";
import useIsDesktop from "../hooks/useIsDesktop";

const GRADIENT = "linear-gradient(135deg, #4a90f5 0%, #2563eb 100%)";

export default function MyAddress() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const user_id = localStorage.getItem("phone") || "guest";

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Current Active Location State ---
  const [currentDeliveryAddress, setCurrentDeliveryAddress] = useState(
    localStorage.getItem("user_address") || "Location not set"
  );

  const [addressMode, setAddressMode] = useState("list"); // 'list' | 'add' | 'edit'
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // State mapped exactly to the Cart
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    building: "",
    street: "",
    landmark: "",
    city: "",
    postalCode: "",
    is_default: false,
  });

  const [locating, setLocating] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const timestamp = new Date().getTime();
      const res = await axios.get(`${API_URL}/address/${user_id}?t=${timestamp}`);
      if (res.data.success) setAddresses(res.data.addresses);
    } catch (err) {
      console.error("Failed to load addresses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user_id !== "guest") loadAddresses();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetCurrentLocation = (fullAddress) => {
    localStorage.setItem("user_address", fullAddress);
    setCurrentDeliveryAddress(fullAddress);
    window.dispatchEvent(new Event("storage")); 
    alert("Delivery location updated!");
  };

  // --- FAST LOCATION DETECTION (Auto-fill) ---
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported by this browser.");
    setLocating(true);
    
    const geoOptions = {
      enableHighAccuracy: true, 
      timeout: 6000,            
      maximumAge: 30000         
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
          const res = await axios.get(url);
          
          if (res.data && res.data.address) {
            const addr = res.data.address;
            setAddressForm((prev) => ({
              ...prev,
              building: addr.house_number || addr.building || prev.building,
              street: addr.road || addr.residential || addr.suburb || prev.street,
              landmark: addr.neighbourhood || addr.village || addr.county || prev.landmark,
              city: addr.city || addr.town || addr.state_district || prev.city,
              postalCode: addr.postcode || prev.postalCode
            }));
          } else {
            alert("Location found, but no exact address details were returned.");
          }
        } catch (err) {
          alert("Error fetching location details. Please check connection.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.warn("Geolocation error:", err);
        alert("Unable to retrieve location fast enough or permission denied. Please fill manually.");
        setLocating(false);
      },
      geoOptions
    );
  };

  const handleFormChange = (e) => {
    setAddressForm({ ...addressForm, [e.target.name]: e.target.value });
  };

  const openAddForm = () => {
    setAddressForm({ 
      label: "Home", 
      building: "", 
      street: "", 
      landmark: "", 
      city: "", 
      postalCode: "", 
      is_default: addresses.length === 0 
    });
    setSelectedAddressId(null);
    setAddressMode("add");
    setAddressError("");
  };

  const handleStartEdit = (addr) => {
    setSelectedAddressId(addr.id);
    setAddressForm({
      label: addr.label || "Home",
      building: addr.building || "",
      street: addr.street || "",
      landmark: addr.landmark || "",
      city: addr.city || "",
      postalCode: addr.postal_code || addr.postalCode || "",
      is_default: addr.is_default === 1 || addr.is_default === true,
    });
    setAddressMode("edit");
    setAddressError("");
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    
    if (!addressForm.building || !addressForm.street || !addressForm.city || !addressForm.postalCode) {
      setAddressError("Please fill all the required fields (*).");
      return;
    }

    setSavingAddress(true);
    setAddressError("");

    try {
      const fullExactAddress = `${addressForm.building}, ${addressForm.street}, ${addressForm.city} - ${addressForm.postalCode}`;

      const payload = {
        user_id,
        label: addressForm.label,
        building: addressForm.building,
        street: addressForm.street,
        landmark: addressForm.landmark,
        city: addressForm.city,
        postal_code: addressForm.postalCode,
        full_address: fullExactAddress,
        is_default: addressForm.is_default ? 1 : 0,
      };

      if (addressMode === "edit" && selectedAddressId) {
        await axios.put(`${API_URL}/address/${selectedAddressId}`, payload);
      } else {
        await axios.post(`${API_URL}/address`, payload);
      }

      if (addressForm.is_default || addresses.length === 0) {
        handleSetCurrentLocation(fullExactAddress);
      }

      setAddressMode("list");
      setSelectedAddressId(null);
      loadAddresses();
    } catch (err) {
      setAddressError(err.response?.data?.message || "Server error saving address.");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    try {
      const res = await axios.delete(`${API_URL}/address/${id}`);
      if (res.data.success) loadAddresses();
    } catch (err) {
      alert("Failed to delete address");
    }
  };

  return (
    <div style={{ ...styles.page, ...(isDesktop && styles.pageDesktop) }}>
      <div style={isDesktop ? styles.cardDesktop : undefined}>
        <div style={{ ...styles.header, ...(isDesktop && styles.headerDesktop) }}>
         
          <h2 style={styles.title}>My Addresses</h2>
        </div>

        <div style={{ ...styles.scrollArea, ...(isDesktop && styles.scrollAreaDesktop) }}>
          
          {user_id !== "guest" && addressMode === "list" && (
            <div style={styles.currentLocBanner}>
              <p style={styles.currentLocTitle}>📍 Current Delivery Location</p>
              <p style={styles.currentLocText}>{currentDeliveryAddress}</p>
            </div>
          )}

          {user_id === "guest" ? (
            <div style={{ textAlign: "center", marginTop: "40px" }}>
              <p style={styles.emptyText}>Please log in to manage your addresses.</p>
              <button style={styles.loginBtn} onClick={() => navigate("/")}>Login to Continue</button>
            </div>
          ) : loading ? (
            <p style={styles.emptyText}>Loading...</p>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", color: "#111" }}>Saved Addresses</h3>
                {addressMode === "list" ? (
                  <button style={styles.addAddrToggleBtn} onClick={openAddForm}>+ Add New</button>
                ) : (
                  <button style={styles.cancelToggleBtn} onClick={() => setAddressMode("list")}>← Back</button>
                )}
              </div>

              {addressMode !== "list" ? (
                <div style={styles.addAddrForm}>
                  
                  {/* AUTO-FILL BUTTON MATCHING SCREENSHOT */}
                  <button type="button" onClick={handleUseCurrentLocation} style={styles.autoFillBtn} disabled={locating}>
                    📍 {locating ? "Detecting location..." : "Auto-fill Current Location"}
                  </button>

                  <form onSubmit={handleAddressSubmit}>
                    
                    <label style={styles.formLabel}>Save as (Label)</label>
                    <select
                      name="label"
                      value={addressForm.label}
                      onChange={handleFormChange}
                      style={styles.formInput}
                    >
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                      <option value="Other">Other</option>
                    </select>

                    <input
                      type="text"
                      name="building"
                      placeholder="Home / Building Name *"
                      value={addressForm.building}
                      onChange={handleFormChange}
                      style={styles.formInput}
                    />

                    <input
                      type="text"
                      name="street"
                      placeholder="Street / Area *"
                      value={addressForm.street}
                      onChange={handleFormChange}
                      style={styles.formInput}
                    />

                    <input
                      type="text"
                      name="landmark"
                      placeholder="Landmark (Optional)"
                      value={addressForm.landmark}
                      onChange={handleFormChange}
                      style={styles.formInput}
                    />

                    {/* ULTRA COMPACT GAP FOR SIDE-BY-SIDE */}
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        name="city"
                        placeholder="Village / City *"
                        value={addressForm.city}
                        onChange={handleFormChange}
                        style={{ ...styles.formInput, flex: 1 }}
                      />
                      <input
                        type="text"
                        name="postalCode"
                        placeholder="Pincode *"
                        value={addressForm.postalCode}
                        onChange={handleFormChange}
                        style={{ ...styles.formInput, flex: 1 }}
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "10px 0 12px" }}>
                      <input
                        type="checkbox"
                        id="mobileDefaultCheck"
                        checked={addressForm.is_default}
                        onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                        style={{ width: "14px", height: "14px", accentColor: "#2563eb" }}
                      />
                      <label htmlFor="mobileDefaultCheck" style={{ fontSize: "12px", color: "#444", cursor: "pointer", fontWeight: "700" }}>
                        Make this my default address
                      </label>
                    </div>

                    {addressError && <p style={styles.errorText}>{addressError}</p>}

                    <button type="submit" style={styles.saveAddrBtn} disabled={savingAddress}>
                      {savingAddress ? "Saving..." : addressMode === "edit" ? "Update Address" : "Save Address"}
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  {addresses.length === 0 ? (
                    <p style={styles.emptyText}>No saved addresses yet.</p>
                  ) : (
                    addresses.map((addr) => {
                      const isActive = currentDeliveryAddress === addr.full_address;
                      return (
                        <div key={addr.id} style={{...styles.paneCard, border: isActive ? "2px solid #0c831f" : "1px solid #e2e8f0"}}>
                          <div style={styles.paneCardTop}>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <span style={styles.paneCardLabel}>{addr.label}</span>
                              {addr.is_default ? <span style={styles.paneDefaultBadge}>Default</span> : null}
                            </div>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <button style={styles.editCardBtn} onClick={() => handleStartEdit(addr)}>Edit</button>
                              <button style={styles.deleteCardBtn} onClick={() => handleDeleteAddress(addr.id)}>Delete</button>
                            </div>
                          </div>
                          
                          <p style={styles.paneCardText}>
                            {addr.building}, {addr.street}<br/>
                            {addr.landmark && <>{addr.landmark}<br/></>}
                            {addr.city} - {addr.postal_code || addr.postalCode}
                          </p>
                          
                          <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                            <button 
                              style={isActive ? styles.activeLocBtn : styles.setLocBtn} 
                              onClick={() => handleSetCurrentLocation(addr.full_address)}
                            >
                              {isActive ? "✓ Active Location" : "Set as Current"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {!isDesktop && <MobileBottomNav />}
    </div>
  );
}

const styles = {
  page: { backgroundColor: "#f4f6f9", minHeight: "100vh" },
  pageDesktop: { display: "flex", justifyContent: "center", backgroundColor: "#eef1f5", padding: "40px 20px", boxSizing: "border-box" },
  cardDesktop: { width: "100%", maxWidth: "680px", background: "#fff", borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.08)", overflow: "hidden", height: "fit-content" },
  
  header: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, display: "flex", alignItems: "center", padding: "16px 20px", background:" #8ec5fc", color: "#222", gap: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  headerDesktop: { position: "static", borderRadius: "16px 16px 0 0", padding: "20px 24px", borderBottom: "1px solid #eee", boxShadow: "none" },
 
  title: { margin: "0 0 0 130px", fontSize: "20px", fontWeight: "800", color: "#fff" },
  
  scrollArea: { padding: "70px 14px 90px" },
  scrollAreaDesktop: { padding: "20px" },
  emptyText: { textAlign: "center", color: "#64748b", fontSize: "14px", marginBottom: "16px" },
  loginBtn: { background: "#ff9f00", color: "#fff", padding: "10px 24px", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px" },

  // --- ULTRA-COMPACT BANNERS AND CARDS ---
  currentLocBanner: { background: " #8ec5fc", border: "1px solid #ffffff", borderRadius: "10px", padding: "12px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(22, 163, 74, 0.05)" },
  currentLocTitle: { margin: "0 0 6px 0", fontSize: "11px", color: "#000000", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" },
  currentLocText: { margin: 0, fontSize: "13px", color: "#ffff", fontWeight: "600", lineHeight: "1.4" },
  
  addAddrToggleBtn: { background: "#111", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" },
  cancelToggleBtn: { background: "#f1f5f9", color: "#333", border: "none", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" },

  paneCard: { borderRadius: "12px", padding: "12px", marginBottom: "10px", background: "#fff", boxShadow: "0 1px 6px rgba(0,0,0,0.03)", transition: "all 0.2s" },
  paneCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" },
  paneCardLabel: { fontWeight: "800", fontSize: "14px", color: "#111" },
  paneCardText: { fontSize: "12px", color: "#475569", margin: "8px 0 0", lineHeight: "1.5" },
  paneDefaultBadge: { fontSize: "9px", fontWeight: "800", color: "#0ea5e9", background: "#e0f2fe", padding: "4px 8px", borderRadius: "6px", textTransform: "uppercase" },
  
  editCardBtn: { background: "#f8fafc", color: "#3b82f6", border: "1px solid #bfdbfe", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" },
  deleteCardBtn: { background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" },
  
  setLocBtn: { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" },
  activeLocBtn: { background: "#16a34a", color: "#fff", border: "1px solid #16a34a", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", boxShadow: "0 2px 8px rgba(22, 163, 74, 0.2)" },

  // --- ULTRA-COMPACT EDIT/ADD FORM ---
  addAddrForm: { background: "#fff", border: "1px solid #f1f5f9", borderRadius: "12px", padding: "12px", marginBottom: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" },
  
  autoFillBtn: { width: "100%", background: "#f0f7ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "10px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginBottom: "12px" },
  
  formLabel: { display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "6px", paddingLeft: "2px" },
  formInput: { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: "12px", boxSizing: "border-box", marginBottom: "10px", transition: "border 0.2s", color: "#334155" },
  
  saveAddrBtn: { width: "100%", padding: "12px", background: GRADIENT, color: "#fff", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "13px", cursor: "pointer", marginTop: "8px", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)" },
  errorText: { color: "#ef4444", fontSize: "11px", marginTop: "4px", marginBottom: "10px", fontWeight: "700" },
};