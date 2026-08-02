import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../api";
import { getImageUrl } from "../utils/imageUrl";

const BRAND_BLUE = "#8ec5fc";

const TrashIcon = ({ size = 16, color = "#999" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
  </svg>
);

export default function Cart({ user_id = localStorage.getItem("phone") || "guest", refresh = 0, onCartChange, closeCart }) {
  const [cartItems, setCartItems] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState({});

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const prefillPhone = user_id !== "guest" ? user_id.replace(/\D/g, '').slice(-10) : "";
  
  const [contact, setContact] = useState({
    fullName: "",
    phone: prefillPhone.length === 10 ? prefillPhone : "",
    altPhone: "",
    building: "",
    street: "",
    landmark: "",
    city: "",
    postalCode: ""
  });
  
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [locating, setLocating] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null); // Track if user tapped a saved address

  const [myAddresses, setMyAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);

  const loadMyAddresses = async () => {
    if (!user_id || user_id === "guest") return;
    setAddressesLoading(true);
    try {
      const res = await axios.get(`${API_URL}/address/${encodeURIComponent(user_id)}`);
      if (res.data.success) setMyAddresses(res.data.addresses || []);
    } catch (err) {
      console.error("Failed to load saved addresses:", err);
    } finally {
      setAddressesLoading(false);
    }
  };

  useEffect(() => {
    loadMyAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user_id]);

  const applySavedAddress = (addr) => {
    setContact((prev) => ({
      ...prev,
      fullName: addr.full_name || prev.fullName,
      phone: addr.phone ? String(addr.phone).replace(/\D/g, "").slice(-10) : prev.phone,
      altPhone: addr.alt_phone ? String(addr.alt_phone).replace(/\D/g, "").slice(-10) : prev.altPhone,
      building: addr.building || prev.building,
      street: addr.street || prev.street,
      landmark: addr.landmark || prev.landmark,
      city: addr.city || prev.city,
      postalCode: addr.postal_code || prev.postalCode,
    }));
    setSelectedAddressId(addr.id); // Mark this as an existing address
    setError("");
  };

  const loadCart = async (showLoader = false) => {
    try {
      if (showLoader) setInitialLoading(true);
      const res = await axios.get(`${API_URL}/cart/${user_id}`);
      setCartItems(res.data.success ? res.data.cart : []);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoader) setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadCart(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user_id]);

  useEffect(() => {
    if (refresh > 0) loadCart(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const updateQty = async (id, action, currentQty) => {
    const willRemove = action === "decrease" && currentQty <= 1;

    setPendingIds((p) => ({ ...p, [id]: true }));
    setCartItems((prev) =>
      willRemove
        ? prev.filter((item) => item.id !== id)
        : prev.map((item) =>
            item.id === id
              ? { ...item, quantity: action === "increase" ? item.quantity + 1 : item.quantity - 1 }
              : item
          )
    );

    try {
      if (willRemove) await axios.delete(`${API_URL}/cart/${id}`);
      else await axios.put(`${API_URL}/cart/${action}/${id}`);
      if (onCartChange) onCartChange();
    } catch (err) {
      console.error(err);
      await loadCart(false);
    } finally {
      setPendingIds((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  };

  const removeItem = async (id) => {
    setPendingIds((p) => ({ ...p, [id]: true }));
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    try {
      await axios.delete(`${API_URL}/cart/${id}`);
      if (onCartChange) onCartChange();
    } catch (err) {
      console.error(err);
      await loadCart(false);
    } finally {
      setPendingIds((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  };

  const handleContactChange = (e) => {
    let val = e.target.value;
    if (e.target.name === "phone" || e.target.name === "altPhone") {
      val = val.replace(/\D/g, '').slice(0, 10);
    }
    setContact({ ...contact, [e.target.name]: val });
    
    // If they manually edit an address field, it's no longer the exact saved address
    if (["building", "street", "landmark", "city", "postalCode"].includes(e.target.name)) {
      setSelectedAddressId(null);
    }
  };

  // --- NEW: Handle Current Location Detection ---
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported by this browser.");
    setLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
          const res = await axios.get(url);
          
          if (res.data && res.data.address) {
            const addr = res.data.address;
            setContact(prev => ({
              ...prev,
              building: addr.house_number || addr.building || "",
              street: addr.road || addr.residential || addr.suburb || "",
              landmark: addr.neighbourhood || addr.village || addr.county || "",
              city: addr.city || addr.town || addr.state_district || "",
              postalCode: addr.postcode || ""
            }));
            setSelectedAddressId(null); // Treat this as a new address to be saved
          } else {
            alert("Location found, but no exact address details were returned.");
          }
        } catch (err) {
          console.error(err);
          alert("Error fetching location details. Please check connection.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.error(err);
        alert("Unable to retrieve your location. Please check browser permissions.");
        setLocating(false);
      }
    );
  };

  const totalPrice = cartItems.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const totalItemCount = cartItems.reduce((count, item) => count + Number(item.quantity || 1), 0);
  const finalTotal = totalPrice;

  const handlePlaceOrderClick = () => {
    if (cartItems.length === 0) return;
    setStep(2);
  };

  const handleConfirmOrder = async () => {
    if (!contact.fullName || contact.phone.length !== 10 || contact.altPhone.length !== 10 || !contact.building || !contact.street || !contact.city || !contact.postalCode) {
      setError("Please fill all fields. Both phone numbers must be exactly 10 digits.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const payload = {
        user_id,
        items: cartItems,
        total_price: finalTotal,
        contact,
        saveAsDefault,
        isNewAddress: !selectedAddressId // Tell backend whether to save this as a new address row
      };

      const res = await axios.post(`${API_URL}/cart/checkout`, payload);

      if (res.data.success) {
        setStep(3);
        if (onCartChange) onCartChange();
        loadMyAddresses(); // Refresh addresses in background
      } else {
        setError(res.data.message || "Failed to place order.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred during checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderHeader = () => (
    <div style={styles.cartHeader}>
      <h2 style={styles.heading}>
        {step === 1 ? "My Cart" : step === 2 ? "Delivery Details" : "Order Confirmed"}
      </h2>
      <button style={styles.exitBtn} onClick={step === 2 ? () => setStep(1) : closeCart}>
        {step === 2 ? "←" : "➔"}
      </button>
    </div>
  );

  if (initialLoading) return <div style={styles.container}>{renderHeader()}<div style={styles.center}>Loading...</div></div>;

  if (step === 3) return (
    <div style={styles.container}>
      {renderHeader()}
      <div style={{ ...styles.center, marginTop: "50px" }}>
        <div style={styles.successIcon}>✓</div>
        <h2 style={{ color: "#111" }}>Order Placed Successfully!</h2>
        <p style={{ color: "#666", lineHeight: "1.5", margin: "10px 20px" }}>
          We have received your order and details. You will receive your delivery shortly.
        </p>
        <button style={{ ...styles.checkoutBtn, marginTop: "20px" }} onClick={closeCart}>
          Back to Home
        </button>
      </div>
    </div>
  );

  if (cartItems.length === 0) return <div style={styles.container}>{renderHeader()}<div style={styles.center}>Your cart is empty</div></div>;

  return (
    <div style={styles.container}>
      {renderHeader()}

      <div style={styles.scrollArea}>
        {step === 1 && (
          <>
            {cartItems.map((item) => {
              const isPending = !!pendingIds[item.id];
              return (
                <div key={item.id} style={{ ...styles.itemCard, opacity: isPending ? 0.6 : 1 }}>
                  <img src={getImageUrl(item.image)} style={styles.itemImg} alt={item.name} />

                  <div style={styles.details}>
                    <div style={styles.titleRow}>
                      <h4 style={styles.title}>{item.name}</h4>
                      <button style={styles.deleteBtn} onClick={() => removeItem(item.id)} disabled={isPending} title="Remove item">
                        <TrashIcon />
                      </button>
                    </div>
                    
                    <p style={styles.weight}>{item.product_quantity || item.unit || item.weight || "1 kg"}</p>

                    <div style={styles.bottomRow}>
                      <div style={styles.priceGroup}>
                        <span style={styles.price}>₹{item.price}</span>
                        {item.quantity > 1 && (
                          <span style={styles.subtotal}>₹{(item.price * item.quantity).toFixed(0)} total</span>
                        )}
                      </div>

                      <div style={styles.controls}>
                        <button style={styles.qtyBtn} onClick={() => updateQty(item.id, "decrease", item.quantity)} disabled={isPending}>−</button>
                        <span style={styles.qty}>{item.quantity}</span>
                        <button style={styles.qtyBtn} onClick={() => updateQty(item.id, "increase", item.quantity)} disabled={isPending}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={styles.billCard}>
              <h4 style={styles.billTitle}>Bill Details</h4>
              <div style={styles.billRow}><span style={styles.billLabel}>Total Items ({totalItemCount})</span><span style={styles.billValue}>₹{totalPrice.toFixed(0)}</span></div>
              <div style={styles.billRow}><span style={styles.billLabel}>Delivery Fee</span>₹ --</div>
              <div style={styles.billRow}><span style={styles.billLabel}>Handling Charge</span>₹ --</div>
              <div style={styles.billDivider} />
              <div style={styles.billRow}><span style={styles.billGrandLabel}>Grand Total</span><span style={styles.billGrandValue}>₹{finalTotal.toFixed(0)}</span></div>
            </div>
          </>
        )}

        {step === 2 && (
          <div style={styles.formContainer}>
            <h3 style={styles.sectionTitle}>Contact Info</h3>
            <input type="text" name="fullName" value={contact.fullName} onChange={handleContactChange} placeholder="Full Name *" style={styles.input} />

            <div style={{ display: "flex", gap: "10px" }}>
              <div style={styles.phoneInputWrapper}>
                <span style={styles.prefix}>+91</span>
                <input type="tel" name="phone" value={contact.phone} onChange={handleContactChange} placeholder="Phone *" style={styles.phoneInput} />
              </div>
              <div style={styles.phoneInputWrapper}>
                <span style={styles.prefix}>+91</span>
                <input type="tel" name="altPhone" value={contact.altPhone} onChange={handleContactChange} placeholder="Alt Phone *" style={styles.phoneInput} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "15px 0 10px 0", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>
              <h3 style={{ fontSize: "15px", color: "#333", margin: 0 }}>Delivery Address</h3>
            </div>

            {/* GPS Location Button */}
            <button type="button" onClick={handleUseCurrentLocation} style={styles.detectBtn} disabled={locating}>
              {locating ? "📍 Detecting location..." : "📍 Auto-fill Current Location"}
            </button>

            <input type="text" name="building" value={contact.building} onChange={handleContactChange} placeholder="Home / Building Name *" style={styles.input} />
            <input type="text" name="street" value={contact.street} onChange={handleContactChange} placeholder="Street / Area *" style={styles.input} />
            <input type="text" name="landmark" value={contact.landmark} onChange={handleContactChange} placeholder="Landmark / Colony (Optional)" style={styles.input} />
            
            <div style={{ display: "flex", gap: "10px" }}>
              <input type="text" name="city" value={contact.city} onChange={handleContactChange} placeholder="Village / City *" style={{ ...styles.input, flex: 1, marginBottom: 0 }} />
              <input type="text" name="postalCode" value={contact.postalCode} onChange={handleContactChange} placeholder="Pincode *" style={{ ...styles.input, flex: 1, marginBottom: 0 }} />
            </div>

            {/* SAVED ADDRESSES */}
            {(addressesLoading || myAddresses.length > 0) && (
              <div style={{ marginTop: "20px" }}>
                <p style={styles.savedAddressesHeading}>
                  {addressesLoading ? "Loading saved addresses..." : "Or choose a saved address"}
                </p>
                {myAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    style={{
                      ...styles.savedAddressCard, 
                      borderColor: selectedAddressId === addr.id ? "#2874f0" : "#8ec5fc",
                      backgroundColor: selectedAddressId === addr.id ? "#eaf1fe" : "#f4f9ff"
                    }}
                    onClick={() => applySavedAddress(addr)}
                  >
                    <div style={styles.savedAddressHeader}>
                      <span style={styles.savedBadge}>{addr.label || "Saved Address"}{addr.is_default ? " • Default" : ""}</span>
                      <span style={styles.tapToUse}>{selectedAddressId === addr.id ? "✓ Selected" : "Tap to use"}</span>
                    </div>
                    <p style={styles.savedText}>
                      <strong>{addr.full_name}</strong><br/>
                      {addr.building}, {addr.street}<br/>
                      {addr.city} - {addr.postal_code}<br/>
                      Phone: {addr.phone}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <label style={styles.checkboxRow}>
              <input type="checkbox" checked={saveAsDefault} onChange={(e) => setSaveAsDefault(e.target.checked)} style={styles.checkbox} />
              Save as default address
            </label>

            {error && <p style={styles.errorText}>{error}</p>}
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <div style={styles.totalInfo}>
          <span style={styles.totalPrice}>₹{finalTotal}</span>
          <span style={styles.itemCount}>TOTAL</span>
        </div>

        {step === 1 ? (
          <button style={styles.checkoutBtn} onClick={handlePlaceOrderClick}>Place Order</button>
        ) : (
          <button style={{ ...styles.checkoutBtn, opacity: submitting ? 0.7 : 1 }} onClick={handleConfirmOrder} disabled={submitting}>
            {submitting ? "Processing..." : "Confirm Order"}
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { height: "100vh", width: "100%", display: "flex", flexDirection: "column", background: "#f4f6f9" },
  cartHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 20px", background: "#fff", borderBottom: "1px solid #eee", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" },
  heading: { margin: "0 0 0 20px", fontSize: "25px", fontWeight: "800", color: "#333" },
  exitBtn: { background: "#f0f0f0", border: "none", fontSize: "25px", width: "46px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#333", fontWeight: "bold", transition: "background 0.2s ease" },
  center: { textAlign: "center", padding: "40px", color: "#666", fontWeight: "500" },
  scrollArea: { flex: 1, overflowY: "auto", padding: "15px" },
  itemCard: { display: "flex", alignItems: "flex-start", gap: "14px", padding: "14px", background: "#fff", marginBottom: "10px", borderRadius: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "opacity 0.2s ease" },
  itemImg: { width: "84px", height: "84px", borderRadius: "10px", objectFit: "cover", border: "1px solid #f0f0f0", flexShrink: 0 },
  details: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  titleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" },
  title: { margin: 0, fontSize: "15px", color: "#222", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  deleteBtn: { background: "transparent", border: "none", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: 0.7, transition: "opacity 0.15s ease" },
  weight: { margin: "3px 0 10px 0", fontSize: "13px", color: "#888" },
  bottomRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" },
  priceGroup: { display: "flex", flexDirection: "column" },
  price: { fontSize: "15px", fontWeight: "800", color: "#111" },
  subtotal: { fontSize: "12px", color: "#999", marginTop: "2px" },
  controls: { display: "flex", alignItems: "center", gap: "10px", background: BRAND_BLUE, borderRadius: "8px", padding: "5px 8px" },
  qtyBtn: { width: "22px", height: "22px", border: "none", borderRadius: "5px", background: "rgba(255,255,255,0.35)", color: "#fff", cursor: "pointer", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", lineHeight: 1 },
  qty: { fontSize: "14px", fontWeight: "bold", minWidth: "15px", textAlign: "center", color: "#fff" },
  billCard: { background: "#fff", borderRadius: "14px", padding: "18px", marginTop: "6px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
  billTitle: { margin: "0 0 14px 0", fontSize: "15px", fontWeight: "800", color: "#222" },
  billRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  billLabel: { fontSize: "14px", color: "#666" },
  billValue: { fontSize: "14px", color: "#333", fontWeight: "600" },
  billDivider: { height: "1px", background: "#eee", margin: "10px 0" },
  billGrandLabel: { fontSize: "16px", color: "#111", fontWeight: "800" },
  billGrandValue: { fontSize: "16px", color: "#111", fontWeight: "900" },
  formContainer: { background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" },
  
  detectBtn: { width: "100%", padding: "10px", background: "#f0f7ff", color: "#2874f0", border: "1px solid #2874f0", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", marginBottom: "15px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "14px" },
  
  savedAddressesHeading: { fontSize: "13px", fontWeight: "700", color: "#666", margin: "0 0 8px" },
  savedAddressCard: { padding: "16px", border: "1.5px solid", borderRadius: "12px", cursor: "pointer", transition: "all 0.2s ease", marginBottom: "12px" },
  savedAddressHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  savedBadge: { fontSize: "12px", fontWeight: "bold", color: "#2874f0", backgroundColor: "#fff", border: "1px solid #2874f0", padding: "4px 8px", borderRadius: "6px" },
  tapToUse: { fontSize: "13px", color: "#2874f0", fontWeight: "bold" },
  savedText: { margin: 0, fontSize: "14px", color: "#444", lineHeight: "1.5" },
  checkboxRow: { display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#333", marginTop: "10px", cursor: "pointer", fontWeight: "600" },
  checkbox: { width: "16px", height: "16px", cursor: "pointer", accentColor: BRAND_BLUE },
  errorText: { color: "#e53935", fontSize: "13px", marginTop: "10px", fontWeight: "bold" },
  sectionTitle: { fontSize: "15px", color: "#333", margin: "15px 0 10px 0", borderBottom: "1px solid #eee", paddingBottom: "5px" },
  input: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", marginBottom: "10px", boxSizing: "border-box" },
  phoneInputWrapper: { display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: "8px", background: "#fff", flex: 1, overflow: "hidden", marginBottom: "10px" },
  prefix: { padding: "12px", background: "#f0f0f0", color: "#555", fontWeight: "bold", borderRight: "1px solid #ddd", fontSize: "14px" },
  phoneInput: { flex: 1, padding: "12px", border: "none", outline: "none", fontSize: "14px", width: "100%" },
  successIcon: { width: "70px", height: "70px", borderRadius: "50%", background: "#dff8e6", color: BRAND_BLUE, fontSize: "35px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  footer: { padding: "15px", background: "#fff", borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" },
  totalInfo: { display: "flex", flexDirection: "column" },
  itemCount: { fontSize: "13px", color: "#888", fontWeight: "700" },
  totalPrice: { fontSize: "25px", fontWeight: "900", color: "#111" },
  checkoutBtn: { background: BRAND_BLUE, color: "#fff", border: "none", padding: "18px 26px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "15px", boxShadow: "0 4px 12px rgba(142, 197, 252, 0.4)" }
};