import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
import { getImageUrl } from "../utils/imageUrl";

const BLINKIT_GREEN = "#0c831f";
const GRADIENT = "linear-gradient(135deg, #4a90f5 0%, #2563eb 100%)";

// --- Delivery & Handling Fee Constants (Change these values as needed) ---
const DELIVERY_FEE = 25;
const HANDLING_CHARGE = 10;

export default function MobileCart({ user_id, refresh, onCartChange, onBack }) {
  const navigate = useNavigate();
  
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [checkingOut, setCheckingOut] = useState(false);

  // Search State
  const [search, setSearch] = useState("");

  // --- Voice Search States ---
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [transcript, setTranscript] = useState("Listening...");
  const [isListening, setIsListening] = useState(false);

  const [step, setStep] = useState(1); 
  
  const [contact, setContact] = useState({
    fullName: "",
    phone: "", 
    altPhone: "",
    building: "",
    street: "",
    landmark: "",
    city: "",
    postalCode: "",
  });
  
  const [error, setError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  
  // Location and Address Tracking States
  const [locating, setLocating] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null); 
  
  // Fetch ALL saved addresses for the user
  const [myAddresses, setMyAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);

  const loadMyAddresses = async () => {
    if (!user_id || user_id === "guest") return;
    setAddressesLoading(true);
    try {
      const res = await axios.get(`${API_URL}/address/${encodeURIComponent(user_id)}`);
      if (res.data.success) {
        setMyAddresses(res.data.addresses || []);
      }
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

  const scrollRef1 = useRef(null);
  const scrollRef2 = useRef(null);
  const [showArr1, setShowArr1] = useState({ left: false, right: true });
  const [showArr2, setShowArr2] = useState({ left: false, right: true });

  const fetchCart = async () => {
    try {
      const res = await axios.get(`${API_URL}/cart/${user_id}`);
      if (res.data?.success) {
        const rawItems = res.data.cart || [];
        const grouped = rawItems.reduce((acc, item) => {
          const key = `${item.product_id}-${item.category}`;
          acc[key] = acc[key] ? { ...acc[key], quantity: acc[key].quantity + Number(item.quantity) } : { ...item };
          return acc;
        }, {});
        const processed = Object.values(grouped);
        setCartItems(processed);
        
        setTotal(processed.reduce((acc, item) => acc + Number(item.price) * Number(item.quantity), 0));
      }
    } catch (err) { console.error("Fetch cart error:", err); }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await axios.get(`${API_URL}/cart/recommendations/all`);
      setRecommendations(res.data.products || []);
    } catch (err) { console.error("Fetch rec error:", err); }
  };

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, user_id]);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const { row1, row2 } = useMemo(() => {
    const mid = Math.ceil(recommendations.length / 2);
    return { row1: recommendations.slice(0, mid), row2: recommendations.slice(mid) };
  }, [recommendations]);

  const checkScroll = (ref, setShow) => {
    if (!ref.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = ref.current;
    setShow({ left: scrollLeft > 5, right: scrollLeft < scrollWidth - clientWidth - 5 });
  };

  const scroll = (ref, dir) => {
    ref.current?.scrollBy({ left: dir === "right" ? 200 : -200, behavior: "smooth" });
  };

  const goSearch = () => {
    if (search.trim() !== "") navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  const handleContactChange = (e) => {
    let val = e.target.value;
    if (e.target.name === "phone" || e.target.name === "altPhone") {
      val = val.replace(/\D/g, "").slice(0, 10);
    }
    setContact({ ...contact, [e.target.name]: val });

    if (["building", "street", "landmark", "city", "postalCode"].includes(e.target.name)) {
      setSelectedAddressId(null);
    }
  };

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
            setSelectedAddressId(null); 
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

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Your browser does not support voice search.");
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true; 
    recognition.maxAlternatives = 1;

    setShowVoiceModal(true);
    setTranscript("Listening...");
    setIsListening(true);

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
        setIsListening(false);
        setSearch(cleanText);
        setTimeout(() => {
          setShowVoiceModal(false);
          navigate(`/search?q=${encodeURIComponent(cleanText)}`);
        }, 600);
      }
    };
    recognition.onerror = () => {
      setTranscript("Microphone error. Please try again.");
      setIsListening(false);
      setTimeout(() => setShowVoiceModal(false), 2500);
    };
    recognition.onend = () => setIsListening(false);
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

  const MicIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="7.5" y="1" width="9" height="14" rx="4.5" fill=" #79bcff" />
      <circle cx="12" cy="6" r="1.5" fill="#333" />
      <path d="M7.5 9.5 L12 12 L16.5 9.5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M5 11v2a7 7 0 0 0 14 0v-2M12 20v3M8 23h8" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );

  const TrashIcon = ({ size = 18, color = "#e53935" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );

  const addToCart = async (item) => {
    await axios.post(`${API_URL}/cart/add`, { user_id, product_id: item.id, category: item.category || "vegetables" });
    fetchCart();
    onCartChange?.();
  };

  const updateQty = async (id, action, currentQty) => {
    if (action === "decrease" && currentQty <= 1) await axios.delete(`${API_URL}/cart/${id}`);
    else await axios.put(`${API_URL}/cart/${action}/${id}`);
    fetchCart();
    onCartChange?.();
  };

  const removeItem = async (id) => {
    await axios.delete(`${API_URL}/cart/${id}`);
    fetchCart();
    onCartChange?.();
  };

  const handlePlaceOrderClick = () => {
    if (cartItems.length === 0) return;
    setStep(2);
  };

  // Grand Total Calculation
  const grandTotal = cartItems.length > 0 ? total : 0;

  const handleCheckout = async () => {
    if (
      !contact.fullName || contact.phone.length !== 10 || contact.altPhone.length !== 10 ||
      !contact.building || !contact.street || !contact.city || !contact.postalCode
    ) {
      setError("Please fill all fields. Both phone numbers must be exactly 10 digits.");
      return;
    }

    setError("");
    setCheckingOut(true);

    try {
      const payload = { 
        user_id, 
        items: cartItems, 
        total_price: grandTotal, 
        contact, 
        saveAsDefault,
        isNewAddress: !selectedAddressId 
      };
      const res = await axios.post(`${API_URL}/cart/checkout`, payload);

      if (res.data.success) {
        setOrderSuccess(true);
        if (onCartChange) onCartChange();
        loadMyAddresses(); 
      } else {
        setError(res.data.message || "Failed to place order.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred during checkout.");
    } finally {
      setCheckingOut(false);
    }
  };

  const totalItemCount = cartItems.reduce((acc, item) => acc + Number(item.quantity), 0);

  // --- ORDER SUCCESS VIEW ---
  if (orderSuccess) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.fixedHeader }}>
          <div style={styles.headerBottom}>
            <button style={styles.backBtn} onClick={onBack}>&#8592;</button>
            <h3 style={styles.categoryTitle}>ORDER SUCCESS</h3>
            <div style={{ width: "24px" }}></div>
          </div>
        </div>
        
        {/* NEW SUCCESS WRAPPER FOR PERFECT CENTERING */}
        <div style={styles.successWrapper}>
          <div style={styles.successIcon}>✓</div>
          <h2>Order Placed Successfully!</h2>
          <p style={{ color: "#666", margin: "10px 0 20px" }}>We have received your order.</p>
          <button style={{ ...styles.checkoutBtn, backgroundColor: BLINKIT_GREEN }} onClick={onBack}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN VIEW (CART / CHECKOUT) ---
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
              backgroundColor: isListening ? BLINKIT_GREEN : "#ccc"
            }}>
              <MicIcon size={34} standColor={isListening ? "#fff" : "#555"} />
            </div>
          </div>
        </div>
      )}

      <div style={styles.container}>
        <div style={styles.fixedHeader}>
          <div style={styles.headerTop}>
            <div style={styles.searchRow}>
              <div style={styles.searchBox}>
                <div style={styles.searchIconWrapper}><SearchIcon size={16} /></div>
                <input type="text" placeholder="Search..." style={styles.searchInputNav} value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && goSearch()} />
              </div>
              <button style={styles.micBtn} onClick={handleVoiceSearch}><MicIcon size={20} standColor="#fff" /></button>
            </div>
          </div>

          <div style={styles.headerBottom}>
            <button style={styles.backBtn} onClick={step === 2 ? () => setStep(1) : onBack}>&#8592;</button>
            <h3 style={styles.categoryTitle}>{step === 2 ? "DELIVERY DETAILS" : "MY CART"}</h3>
            <div style={{ width: "24px" }}></div>
          </div>
        </div>

        <div style={styles.contentArea}>
          {step === 2 ? (
            <div style={styles.formContainer}>
              <h3 style={styles.sectionTitle}>Contact Info</h3>
              <input type="text" name="fullName" value={contact.fullName} onChange={handleContactChange} placeholder="Full Name *" style={styles.input} />

              <div style={{ display: "flex", gap: "6px" }}>
                <div style={styles.phoneInputWrapper}>
                  <span style={styles.prefix}>+91</span>
                  <input type="tel" name="phone" value={contact.phone} onChange={handleContactChange} placeholder="Phone *" maxLength="10" style={styles.phoneInput} />
                </div>
                <div style={styles.phoneInputWrapper}>
                  <span style={styles.prefix}>+91</span>
                  <input type="tel" name="altPhone" value={contact.altPhone} onChange={handleContactChange} placeholder="Alt Phone *" maxLength="10" style={styles.phoneInput} />
                </div>
              </div>

              <h3 style={styles.sectionTitle}>Delivery Address</h3>

              <button type="button" onClick={handleUseCurrentLocation} style={styles.detectBtn} disabled={locating}>
                {locating ? "📍 Detecting location..." : "📍 Auto-fill Current Location"}
              </button>

              <input type="text" name="building" value={contact.building} onChange={handleContactChange} placeholder="Home / Building Name *" style={styles.input} />
              <input type="text" name="street" value={contact.street} onChange={handleContactChange} placeholder="Street / Area *" style={styles.input} />
              <input type="text" name="landmark" value={contact.landmark} onChange={handleContactChange} placeholder="Landmark (Optional)" style={styles.input} />
              
              <div style={{ display: "flex", gap: "6px" }}>
                <input type="text" name="city" value={contact.city} onChange={handleContactChange} placeholder="Village / City *" style={{ ...styles.input, flex: 1 }} />
                <input type="text" name="postalCode" value={contact.postalCode} onChange={handleContactChange} placeholder="Pincode *" style={{ ...styles.input, flex: 1 }} />
              </div>

              {(addressesLoading || myAddresses.length > 0) && (
                <div style={{ marginTop: "16px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                  <p style={styles.savedAddressesHeading}>
                    {addressesLoading ? "Loading saved addresses..." : "Or choose a saved address"}
                  </p>
                  {myAddresses.map((addr) => (
                    <div 
                      key={addr.id}
                      style={{
                        ...styles.savedAddressCard, 
                        borderColor: selectedAddressId === addr.id ? "#2563eb" : "#e2e8f0",
                        backgroundColor: selectedAddressId === addr.id ? "#eff6ff" : "#fff"
                      }}
                      onClick={() => {
                        setContact(prev => ({
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
                        setSelectedAddressId(addr.id);
                      }}
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
          ) : (
          <>
          {cartItems.map((item) => (
            <div key={item.id} style={styles.itemCard}>
              <img src={getImageUrl(item.image)} style={styles.itemImg} alt={item.name} />
              <div style={styles.itemInfo}>
                <div style={styles.itemHeader}>
                  <div style={{ flex: 1, paddingRight: "10px" }}>
                    <h4 style={styles.itemTitle}>{item.name}</h4>
                    <p style={styles.itemWeight}>{item.unit || "1 kg"}</p>
                  </div>
                  <button style={styles.trashBtn} onClick={() => removeItem(item.id)}><TrashIcon size={18} /></button>
                </div>
                <div style={styles.itemBottom}>
                  <p style={styles.priceText}>₹{item.price}</p>
                  <div style={styles.qtyBox}>
                    <button style={styles.qtyBtn} onClick={() => updateQty(item.id, "decrease", item.quantity)}>-</button>
                    <span style={styles.qtyText}>{item.quantity}</span>
                    <button style={styles.qtyBtn} onClick={() => updateQty(item.id, "increase", item.quantity)}>+</button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {cartItems.length > 0 && (
            <div style={styles.billContainer}>
              <h4 style={styles.sectionTitle}>Bill Details</h4>
              <div style={styles.row}>
                <p style={styles.billLabel}>Item Total</p>
                <p style={styles.billValue}>₹{total}</p>
              </div>
              <div style={styles.row}>
                <p style={styles.billLabel}>Delivery Fee</p>
                <p style={styles.billValue}>₹ --</p>
              </div>
              <div style={styles.row}>
                <p style={styles.billLabel}>Handling Charge</p>
                <p style={styles.billValue}>₹ --</p>
              </div>
              <hr style={styles.divider} />
              <div style={styles.row}>
                <p style={styles.grandTotalLabel}>Grand Total</p>
                <p style={styles.grandTotalValue}>₹{grandTotal}</p>
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <div style={{ margin: "25px 0" }}>
              <h4 style={styles.sectionTitle}>You might also like</h4>
              <div style={{ position: "relative" }}>
                {showArr1.left && <button style={{ ...styles.arrow, left: 0 }} onClick={() => scroll(scrollRef1, "left")}>&lt;</button>}
                <div style={styles.horizontalScroll} ref={scrollRef1} onScroll={() => checkScroll(scrollRef1, setShowArr1)}>{row1.map((item) => (
                  <div key={item.id} style={styles.scrollItem}>
                    <img src={getImageUrl(item.image)} style={styles.gridImg} alt={item.name} />
                    <p style={styles.gridTitle}>{item.name}</p>
                    <div style={styles.gridDetailsRow}>
                      <p style={styles.gridUnit}>{item.unit || "1 kg"}</p>
                      <p style={styles.gridPrice}>₹{item.price}</p>
                    </div>
                    <button style={styles.addBtn} onClick={() => addToCart(item)}>ADD</button>
                  </div>
                ))}</div>
                {showArr1.right && <button style={{ ...styles.arrow, right: 0 }} onClick={() => scroll(scrollRef1, "right")}>&gt;</button>}
              </div>
              <div style={{ position: "relative", marginTop: "12px" }}>
                {showArr2.left && <button style={{ ...styles.arrow, left: 0 }} onClick={() => scroll(scrollRef2, "left")}>&lt;</button>}
                <div style={styles.horizontalScroll} ref={scrollRef2} onScroll={() => checkScroll(scrollRef2, setShowArr2)}>{row2.map((item) => (
                  <div key={item.id} style={styles.scrollItem}>
                    <img src={getImageUrl(item.image)} style={styles.gridImg} alt={item.name} />
                    <p style={styles.gridTitle}>{item.name}</p>
                    <div style={styles.gridDetailsRow}>
                      <p style={styles.gridUnit}>{item.unit || "1 kg"}</p>
                      <p style={styles.gridPrice}>₹{item.price}</p>
                    </div>
                    <button style={styles.addBtn} onClick={() => addToCart(item)}>ADD</button>
                  </div>
                ))}</div>
                {showArr2.right && <button style={{ ...styles.arrow, right: 0 }} onClick={() => scroll(scrollRef2, "right")}>&gt;</button>}
              </div>
            </div>
          )}
          </>
          )}
        </div>

        {cartItems.length > 0 && (
          <div style={styles.footer}>
            <div style={styles.footerTotalBox}>
              <p style={styles.footerTotalSub}>Total Items: {totalItemCount}</p>
              <p style={styles.totalLabel}>₹{grandTotal}</p>
            </div>
            {step === 1 ? (
              <button style={styles.checkoutBtn} onClick={handlePlaceOrderClick}>Proceed to Checkout</button>
            ) : (
              <button style={{ ...styles.checkoutBtn, opacity: checkingOut ? 0.6 : 1 }} onClick={handleCheckout} disabled={checkingOut}>
                {checkingOut ? "Placing..." : "Confirm Order"}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  page: { backgroundColor: "#f5f6f8", minHeight: "100vh" }, 
  fixedHeader: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, display: "flex", flexDirection: "column", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  headerTop: { display: "flex", alignItems: "center", padding: "10px 15px", gap: "22px", height: "60px", backgroundColor: "#8ec5fc", boxSizing: "border-box" },
  searchRow: { display: "flex", alignItems: "center", flex: 1, gap: "8px" },
  searchBox: { flex: 1, height: "36px", display: "flex", alignItems: "center", backgroundColor: "#ffffff", borderRadius: "10px", overflow: "hidden" },
  searchIconWrapper: { paddingLeft: "12px", display: "flex", alignItems: "center", justifyContent: "center" },
  searchInputNav: { flex: 1, border: "none", padding: "0 10px", outline: "none", fontSize: "13px", background: "transparent", color: "black" },
  micBtn: { width: "36px", height: "36px", border: "none", borderRadius: "50%", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  headerBottom: { display: "flex", alignItems: "center", justifyContent: "space-between", height: "45px", padding: "0 20px", backgroundColor:  "#8ec5fc",  color: "#ffffff", borderBottom: "1px solid #eee", boxSizing: "border-box" },
  backBtn: { background: "none", border: "none", fontSize: "24px", fontWeight: "bold", cursor: "pointer", padding: 0, margin: 0, color: "#ffffff" },
  categoryTitle: { margin: 0, fontSize: "16px", fontWeight: "800", textAlign: "center", flex: 1, letterSpacing: "0.5px" },

  container: { display: "flex", flexDirection: "column", flex: 1, padding: "0 0 180px 0", backgroundColor: "#f5f6f8", minHeight: "50vh", boxSizing: "border-box" },
  contentArea: { flex: 1, padding: "125px 16px 16px 16px" }, 
  
  successWrapper: { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", flex: 1, minHeight: "calc(100vh - 100px)", padding: "20px", textAlign: "center", backgroundColor: "#f5f6f8" },

  itemCard: { display: "flex", padding: "10px", background: "#ffffff", marginBottom: "14px", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.03)", alignItems: "center", position: "relative" },
  itemImg: { width: "80px", height: "80px", objectFit: "cover", borderRadius: "12px", backgroundColor: "#f9f9f9" },
  itemInfo: { marginLeft: "16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "80px" },
  itemHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  itemTitle: { fontSize: "15px", margin: 0, fontWeight: "600", color: "#222", lineHeight: "1.4", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  itemWeight: { fontSize: "13px", color: "#777", margin: "4px 0 0 0", fontWeight: "500" },
  trashBtn: { background: "#fff2f2", border: "none", padding: "8px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#e53935", flexShrink: 0 },
  itemBottom: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" },
  priceText: { fontSize: "16px", fontWeight: "800", color: "#333", margin: 0 },
  qtyBox: { display: "flex", alignItems: "center", background: "#f8f8f8", borderRadius: "10px", padding: "4px", border: "1px solid #eee" },
  qtyBtn: { width: "30px", height: "30px", border: "none", background: "#fff", color: "#8ec5fc", fontWeight: "bold", fontSize: "18px", borderRadius: "8px", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center" },
  qtyText: { margin: "0 14px", fontSize: "15px", fontWeight: "700", color: "#333" },
  
  billContainer: { backgroundColor: "#c6e3ff", padding: "20px", borderRadius: "16px", marginTop: "24px", boxShadow: "0 4px 15px rgba(0,0,0,0.03)" },
  divider: { border: "none", borderTop: "1px dashed #ddd", margin: "15px 0" },
  row: { display: "flex", justifyContent: "space-between", margin: "10px 0", fontSize: "14px" },
  billLabel: { margin: 0, color: "#666" },
  billValue: { margin: 0, color: "#333", fontWeight: "600" },
  grandTotalLabel: { margin: 0, fontWeight: "800", fontSize: "16px", color: "#333" },
  grandTotalValue: { margin: 0, fontWeight: "800", fontSize: "16px", color: "#333" },

  formContainer: { background: "#fff", padding: "12px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", border: "1px solid #f1f5f9" },
  sectionTitle: { fontSize: "14px", fontWeight: "800", marginBottom: "8px", marginTop: "12px", color: "#1e293b", letterSpacing: "0.2px" },
  
  detectBtn: { width: "100%", padding: "10px", background: "#f0f7ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "8px", fontWeight: "700", cursor: "pointer", marginBottom: "10px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "12px", gap: "6px" },
  
  input: { width: "100%", padding: "10px 12px", marginTop: "5px", marginBottom: "5px", borderRadius: "8px", border: "1px solid #e2e8f0", boxSizing: "border-box", fontSize: "12px", background: "#f8fafc", color: "#334155", transition: "border 0.2s" },
  
  phoneInputWrapper: { display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc", overflow: "hidden", marginTop: "5px", marginBottom: "5px", flex: 1 },
  prefix: { padding: "10px 12px", background: "#f1f5f9", color: "#475569", fontWeight: "700", borderRight: "1px solid #e2e8f0", fontSize: "12px" },
  phoneInput: { flex: 1, padding: "10px", border: "none", outline: "none", fontSize: "12px", background: "transparent", color: "#334155" },
  
  savedAddressesHeading: { fontSize: "12px", fontWeight: "800", color: "#475569", margin: "0 0 8px" },
  savedAddressCard: { padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px", backgroundColor: "#fff", cursor: "pointer", transition: "all 0.2s ease", marginBottom: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.02)" },
  savedAddressHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" },
  savedBadge: { fontSize: "9px", fontWeight: "800", color: "#1e293b", backgroundColor: "#f1f5f9", padding: "4px 6px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px" },
  tapToUse: { fontSize: "11px", color: "#2563eb", fontWeight: "800" },
  savedText: { margin: 0, fontSize: "12px", color: "#475569", lineHeight: "1.4" },

  checkboxRow: { display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#1e293b", marginTop: "10px", cursor: "pointer", fontWeight: "700" },
  checkbox: { width: "14px", height: "14px", cursor: "pointer", accentColor: "#2563eb" },
  errorText: { color: "#ef4444", fontSize: "11px", marginTop: "10px", fontWeight: "bold", background: "#fef2f2", padding: "6px", borderRadius: "6px" },

  horizontalScroll: { display: "flex", overflowX: "auto", gap: "12px", paddingBottom: "10px", scrollbarWidth: "none" },
  scrollItem: { minWidth: "125px", maxWidth: "125px", backgroundColor: "#ffffff", padding: "12px", borderRadius: "16px", textAlign: "center", border: "1px solid #eee", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" },
  gridImg: { width: "100%", height: "80px", objectFit: "contain", borderRadius: "10px" },
  gridTitle: { fontSize: "13px", margin: "10px 0", fontWeight: "600", color: "#444", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  
  // --- New Grid Details Styles ---
  gridDetailsRow: { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "-6px 0 8px 0" },
  gridUnit: { fontSize: "11px", color: "#777", margin: 0, fontWeight: "500" },
  gridPrice: { fontSize: "13px", fontWeight: "800", color: "#333", margin: 0 },
  // -------------------------------
  
  addBtn: { width: "100%", background: "#8ec5fc" , color: "#ffff", border: "none", borderRadius: "8px", padding: "8px 0", cursor: "pointer", fontSize: "13px", fontWeight: "800" },
  arrow: { position: "absolute", top: "35%", zIndex: 10, background: "#fff", border: "1px solid #eee", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontWeight: "bold", color: "#555" },
  
  footer: { position: "fixed", bottom: 60, left: 0, right: 0, padding: "16px 20px", background: "#fff", borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1000, boxShadow: "0 -4px 15px rgba(0,0,0,0.03)" },
  footerTotalBox: { display: "flex", flexDirection: "column" },
  footerTotalSub: { margin: 0, fontSize: "12px", color: "#666", fontWeight: "600" },
  totalLabel: { fontWeight: "900", fontSize: "20px", color: "#333", margin: "2px 0 0 0" },
  checkoutBtn: { background: "#8ec5fc" , color: "#fff", border: "none", padding: "14px 28px", borderRadius: "12px", fontWeight: "800", fontSize: "15px", cursor: "pointer", boxShadow: "0 4px 12px rgba(114, 127, 146, 0.3)" },
  
  successIcon: { width: "80px", height: "80px", borderRadius: "50%", background: "#dff8e6", color: BLINKIT_GREEN, fontSize: "40px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },

  voiceOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn 0.2s ease" },
  voiceModal: { width: "100%", backgroundColor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "30px 20px 50px 20px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", boxShadow: "0 -4px 15px rgba(0,0,0,0.2)" },
  closeModalBtn: { position: "absolute", top: "15px", right: "20px", background: "none", border: "none", fontSize: "20px", color: "#666", cursor: "pointer", padding: "5px" },
  voiceTitle: { margin: "0 0 15px 0", fontSize: "18px", fontWeight: "bold", color: "#333" },
  voiceTranscript: { fontSize: "22px", textAlign: "center", minHeight: "60px", margin: "0 0 30px 0", display: "flex", alignItems: "center", fontStyle: "italic", maxWidth: "85%" },
  bigMicContainer: { width: "70px", height: "70px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.3s ease" }
};