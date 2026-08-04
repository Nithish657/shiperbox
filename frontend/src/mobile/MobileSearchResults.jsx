import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API_URL } from "../api";
import MobileBottomNav from "../mobile/MobileBottomNav";
import { getImageUrl } from "../utils/imageUrl";
import Login from "../pages/Login"; 

const GRADIENT = "linear-gradient(135deg, #4a90f5 0%, #2563eb 100%)";

export default function MobileSearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const [search, setSearch] = useState(query);
  const [items, setItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const user_id = localStorage.getItem("phone") || "guest";

  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [transcript, setTranscript] = useState("Listening...");
  const [isListening, setIsListening] = useState(false);
  
  const [showLogin, setShowLogin] = useState(false);

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  const fetchData = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
      setError(false);
    }
    try {
      const res = await axios.get(`${API_URL}/search?q=${encodeURIComponent(query)}`);
      if (res.data.success) {
        setItems(res.data.items || []);
      } else if (showLoading) {
        setError(true);
      }

      if (isLoggedIn) {
        const cartRes = await axios.get(`${API_URL}/cart/${user_id}`);
        if (cartRes.data.success) setCartItems(cartRes.data.cart || []);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      if (showLoading) setError(true);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (query) fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Handle standard typing search (includes synonym check)
  const goSearch = () => {
    let cleanText = search.trim().toLowerCase();
    
    // Synonym Dictionary for typed searches
    const synonymDictionary = {
      "bangaladumpa": "potato", "bangala dumpa": "potato",
      "ulli": "onion", "ullipaya": "onion", "errapaya": "onion",
      "tamata": "tomato", "tomatoo": "tomato",
      "bendakaya": "okra", "benda kaya": "okra", "lady finger": "okra",
      "mirapakaya": "chilli", "pachi mirchi": "chilli", "mirchi": "chilli",
      "kothimeera": "coriander", "dhaniya": "coriander",
      "karivepaku": "curry leaves",
      "vankaya": "brinjal", "eggplant": "brinjal",
      "pudina": "mint",
      "kanda": "yam",
      "kyabeji": "cabbage"
    };

    if (synonymDictionary[cleanText]) {
      cleanText = synonymDictionary[cleanText];
    }

    if (cleanText !== "") navigate(`/search?q=${encodeURIComponent(cleanText)}`);
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Your browser does not support voice search.");
      return;
    }

    const recognition = new SpeechRecognition();
    
    // USE INDIAN ENGLISH TO CATCH LOCAL ACCENTS BETTER
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

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        let cleanText = finalTranscript.replace(/\.$/, "").trim().toLowerCase();
        
        // SYNONYM DICTIONARY FOR VOICE TRANSLATION
        const synonymDictionary = {
          "bangaladumpa": "potato", "bangala dumpa": "potato",
          "ulli": "onion", "ullipaya": "onion", "errapaya": "onion",
          "tamata": "tomato", "tomatoo": "tomato",
          "bendakaya": "okra", "benda kaya": "okra", "lady finger": "okra",
          "mirapakaya": "chilli", "pachi mirchi": "chilli", "mirchi": "chilli",
          "kothimeera": "coriander", "dhaniya": "coriander",
          "karivepaku": "curry leaves",
          "vankaya": "brinjal", "eggplant": "brinjal",
          "pudina": "mint",
          "kanda": "yam",
          "kyabeji": "cabbage"
        };

        if (synonymDictionary[cleanText]) {
          cleanText = synonymDictionary[cleanText];
        }

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
      setTimeout(() => setShowVoiceModal(false), 2500);
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const closeVoiceModal = () => {
    setShowVoiceModal(false);
    setIsListening(false);
  };

  const SearchIcon = ({ size = 16, color = "#000000" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16" y2="16" />
      <circle cx="8.5" cy="8.5" r="1.8" fill={color} stroke="none" />
    </svg>
  );

  const MicIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="7.5" y="1" width="9" height="14" rx="4.5" fill="#8ec5fc" />
      <circle cx="12" cy="6" r="1.5" fill="#333" />
      <path d="M7.5 9.5 L12 12 L16.5 9.5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M5 11v2a7 7 0 0 0 14 0v-2M12 20v3M8 23h8" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );

  const addToCart = async (product) => {
    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }
    try {
      await axios.post(`${API_URL}/cart/add`, {
        user_id, product_id: product.id, category: product.category,
      });
      fetchData(false);
      window.dispatchEvent(new Event("cartUpdated")); 
    } catch (err) {
      console.error(err);
    }
  };

  const updateQty = async (cart_id, action) => {
    try {
      if (action === "decrease") {
        const item = cartItems.find((i) => i.id === cart_id);
        if (!item) return;
        if (item.quantity <= 1) {
          await axios.delete(`${API_URL}/cart/${cart_id}`);
        } else {
          await axios.put(`${API_URL}/cart/decrease/${cart_id}`);
        }
      } else {
        await axios.put(`${API_URL}/cart/increase/${cart_id}`);
      }
      fetchData(false);
      window.dispatchEvent(new Event("cartUpdated")); 
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes pulseGlow {
            0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
            70% { box-shadow: 0 0 0 20px rgba(37, 99, 235, 0); }
            100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
          }
        `}
      </style>

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
              background: isListening ? GRADIENT : "#e2e8f0"
            }}>
              <MicIcon size={34} />
            </div>
          </div>
        </div>
      )}

      <div style={styles.appContainer}>
        <div style={styles.staticHeader}>
          <div style={styles.headerTop}>
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
                <MicIcon size={20} />
              </button>
            </div>
          </div>

          <div style={styles.navRow}>
            <button style={styles.backBtn} onClick={() => navigate(-1)}>←</button>
            <h2 style={styles.title}>{query ? `Results for "${query}"` : "Search"}</h2>
          </div>
        </div>

        <div style={styles.scrollArea}>
          {isLoading ? (
            <div style={styles.centerPrompt}>Loading...</div>
          ) : error ? (
            <div style={styles.centerPrompt}>
              <p>Couldn't load results right now.</p>
              <button style={styles.retryBtn} onClick={() => fetchData(true)}>Retry</button>
            </div>
          ) : items.length === 0 ? (
            <div style={styles.centerPrompt}>No products found. Try a different spelling!</div>
          ) : (
            <div style={styles.blinkitGrid}>
              {items.map((product) => {
                const cartItem = cartItems.find((c) => c.product_id === product.id && c.category === product.category);
                const outOfStock = Number(product.stock) <= 0;
                return (
                  <div key={`${product.category}-${product.id}`} style={outOfStock ? { ...styles.categoryCard, ...styles.cardOutOfStock } : styles.categoryCard}>
                    
                    {/* UPDATED IMAGE WRAPPER */}
                    <div style={styles.imgWrapper}>
                      <img
                        src={getImageUrl(product.image)}
                        style={outOfStock ? { ...styles.image, ...styles.imageOutOfStock } : styles.image}
                        alt={product.name}
                      />
                      {outOfStock && <div style={styles.outOfStockBadge}>Out of Stock</div>}
                    </div>
                    
                    <h4 style={styles.catText}>
                      {product.name}
                      <span style={styles.unitText}>
                        {product.quantity || product.unit || "1 kg"}
                      </span>
                    </h4>

                    <div style={styles.bottomRow}>
                      <p style={styles.price}>₹{product.price}</p>
                      {outOfStock ? (
                        <span style={styles.outOfStockText}>Out of Stock</span>
                      ) : cartItem && isLoggedIn ? (
                        <div style={styles.qtyBox}>
                          <button style={styles.btn} onClick={() => updateQty(cartItem.id, "decrease")}>-</button>
                          <span style={styles.qty}>{cartItem.quantity}</span>
                          <button style={styles.btn} onClick={() => updateQty(cartItem.id, "increase")}>+</button>
                        </div>
                      ) : (
                        <button style={styles.addBtn} onClick={() => addToCart(product)}>ADD</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <MobileBottomNav />
      </div>
    </>
  );
}

const styles = {
  appContainer: { backgroundColor: "#f5f7fa", minHeight: "100vh", position: "relative" },
  staticHeader: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", backgroundColor: "white" },
  headerTop: { display: "flex", alignItems: "center", gap: "10px", padding: "16px 15px 10px", background: "#8ec5fc", color: "white" },
  
  searchRow: { display: "flex", alignItems: "center", flex: 1, gap: "8px" },
  searchBox: { flex: 1, height: "42px", display: "flex", alignItems: "center", backgroundColor: "white", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" },
  searchIconWrapper: { paddingLeft: "12px", display: "flex", alignItems: "center", justifyContent: "center" },
  searchInput: { flex: 1, border: "none", padding: "0 10px", outline: "none", fontSize: "14px", background: "transparent", color: "#333" },
  micBtn: { width: "42px", height: "42px", border: "none", borderRadius: "50%", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  
  navRow: { display: "flex", alignItems: "center", height: "50px", padding: "0 15px", backgroundColor: "#ffffff", borderBottom: "1px solid #eef1f5", boxSizing: "border-box" },
  backBtn: { display: "flex", alignItems: "center", border: "none", background: "none", fontSize: "28px", fontWeight: "bold", cursor: "pointer", padding: 0, marginRight: "16px", color: "#222" },
  title: { fontSize: "16px", fontWeight: "700", margin: 0, color: "#111", letterSpacing: "0.2px" },
  
  scrollArea: { paddingTop: "128px", paddingBottom: "95px", boxSizing: "border-box" },
  blinkitGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", padding: "15px" },
  categoryCard: { backgroundColor: "white", borderRadius: "16px", padding: "14px", display: "flex", flexDirection: "column", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  
  // FIX: Increased height, transparent background, and objectFit contain
  imgWrapper: { 
    width: "100%", 
    height: "120px", // Increased height to give the image more space
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center", 
    overflow: "hidden", 
    marginBottom: "12px", 
    backgroundColor: "transparent", // Keeps it perfectly clean
    position: "relative"
  },
  image: { 
    width: "100%", 
    height: "100%", 
    objectFit: "contain" // Guarantees the entire image is shown without cutting off borders
  },
  cardOutOfStock: { opacity: 0.6 },
  imageOutOfStock: { filter: "grayscale(1)" },
  outOfStockBadge: {
    position: "absolute", top: "6px", left: "6px",
    backgroundColor: "rgba(0,0,0,0.75)", color: "#fff",
    fontSize: "9px", fontWeight: "bold", padding: "3px 6px",
    borderRadius: "5px", textTransform: "uppercase", letterSpacing: "0.2px"
  },
  outOfStockText: { fontSize: "12px", fontWeight: "bold", color: "#e53935" },
  
  catText: { margin: "0 0 10px 0", fontSize: "13px", fontWeight: "700", minHeight: "44px", overflow: "hidden", color: "#111" },
  unitText: { display: "block", fontSize: "11px", color: "#666", fontWeight: "normal", marginTop: "2px" },
  
  bottomRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" },
  price: { fontWeight: "800", fontSize: "14px", margin: 0, color: "#111" },
  addBtn: { padding: "7px 16px", border: "1.5px solid #8ec5fc", backgroundColor: "#8ec5fc", color: "#ffffff", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer" },
  qtyBox: { display: "flex", alignItems: "center", gap: "8px", background: "#8ec5fc", borderRadius: "8px", padding: "5px 10px" },
  btn: { border: "none", background: "none", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "16px" },
  qty: { fontSize: "14px", fontWeight: "bold", color: "#fff" },
  centerPrompt: { textAlign: "center", padding: "40px 20px", color: "#666" },
  retryBtn: { marginTop: "10px", padding: "8px 20px", border: "none", borderRadius: "8px", background: "#2563eb", color: "#fff", fontWeight: "bold", cursor: "pointer" },

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 },
  loginBox: { background: "white", padding: "20px", borderRadius: "12px", width: "90%", position: "relative" },
  closeBtn: { position: "absolute", top: "10px", right: "10px", border: "none", background: "none", fontSize: "24px", cursor: "pointer", color: "#333", zIndex: 10 },

  voiceOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  voiceModal: { width: "100%", backgroundColor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "30px 20px 50px 20px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", boxShadow: "0 -4px 15px rgba(0,0,0,0.2)" },
  closeModalBtn: { position: "absolute", top: "15px", right: "20px", background: "none", border: "none", fontSize: "20px", color: "#666", cursor: "pointer", padding: "5px" },
  voiceTitle: { margin: "0 0 15px 0", fontSize: "18px", fontWeight: "bold", color: "#333" },
  voiceTranscript: { fontSize: "22px", textAlign: "center", minHeight: "60px", margin: "0 0 30px 0", display: "flex", alignItems: "center", fontStyle: "italic", maxWidth: "85%" },
  bigMicContainer: { width: "70px", height: "70px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s ease" }
};