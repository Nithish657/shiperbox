import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
import MobileBottomNav from "../mobile/MobileBottomNav";
import { getImageUrl } from "../utils/imageUrl";
import Login from "../pages/Login"; // <-- Imported Login component

export default function CategoryItems() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Default to "All" so all vegetables show initially
  const [selectedSub, setSelectedSub] = useState("All");
  const user_id = localStorage.getItem("phone") || "guest";

  // State for Login Modal
  const [showLogin, setShowLogin] = useState(false);

  // STRICT LOGIN CHECK
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  // --- Voice Search States ---
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [transcript, setTranscript] = useState("Listening...");
  const [isListening, setIsListening] = useState(false);

  const fetchCartData = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await axios.get(`${API_URL}/cart/${user_id}`);
      if (res.data.success) setCartItems(res.data.cart);
    } catch (err) { 
      console.log("Cart fetch error:", err.message); 
    }
  };

  const fetchItems = () => {
    setLoading(true);
    axios.get(`${API_URL}/items/${categoryId}`)
      .then((res) => { 
        if (res.data.success) setItems(res.data.items); 
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCartData();
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const isFlowers = categoryId === "flowers";
  
  const subCategories = isFlowers ? [] : [
    "All", 
    "Root vegetables", 
    "Cruciferous vegetables", 
    "Fresh vegetables", 
    "Leafy vegetables", 
    "Gourds"
  ];

  const filteredItems = (selectedSub === "All" || isFlowers) 
    ? items 
    : items.filter((i) => {
        const itemSub = i.subcategory || "Fresh vegetables";
        return itemSub.toLowerCase() === selectedSub.toLowerCase();
      });

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

  const addToCart = async (product) => {
    if (!isLoggedIn) {
      // Trigger the login modal instead of adding to cart
      setShowLogin(true);
      return;
    }
    try {
      await axios.post(`${API_URL}/cart/add`, { user_id, product_id: product.id, category: categoryId });
      await fetchCartData();
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) { 
      console.log(err); 
    }
  };

  const updateQty = async (cart_id, action) => {
    const item = cartItems.find((i) => i.id === cart_id);
    if (!item) return;
    try {
      if (action === "decrease" && item.quantity <= 1) {
        await axios.delete(`${API_URL}/cart/${cart_id}`);
      } else {
        await axios.put(`${API_URL}/cart/${action}/${cart_id}`);
      }
      await fetchCartData();
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) { 
      console.log(err); 
    }
  };

  const getSubcategoryImage = (subName) => {
    if (subName === "All" && items.length > 0) {
      return getImageUrl(items[0].image);
    }
    const item = items.find((i) => {
      const itemSub = i.subcategory || "Fresh vegetables";
      return itemSub.toLowerCase() === subName.toLowerCase();
    });
    return item ? getImageUrl(item.image) : "";
  };

  const SearchIcon = ({ size = 16, color = "#333" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.5" cy="10.5" r="7.5" />
      <line x1="21" y1="21" x2="15.8" y2="15.8" />
      <circle cx="8" cy="8" r="1.5" fill={color} stroke="none" />
    </svg>
  );

  const MicIcon = ({ size = 20, standColor = "#333" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 7a4.5 4.5 0 0 1 9 0v4.5a4.5 4.5 0 0 1-9 0V7z" fill=" #79bcff"/>
      <circle cx="12" cy="5.5" r="1.2" fill="white"/>
      <path d="M7.5 10.5l4.5 2 4.5-2" stroke="white" strokeWidth="1.5" fill="none" />
      <path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M8 22h8" stroke={standColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

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

      <div style={styles.pageOuter}>
      <div style={styles.appContainer}>

      {/* LOGIN MODAL OVERLAY - confined to the frame, not the whole browser window */}
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

        <div style={styles.fixedHeader}>
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
                <MicIcon size={20} standColor="#333" />
              </button>
            </div>
          </div>

          <div style={styles.headerBottom}>
            <button style={styles.backBtnBlack} onClick={() => navigate(-1)}>←</button>
            <h3 style={styles.categoryTitle}>{categoryId?.toUpperCase() || "ITEMS"}</h3>
          </div>
        </div>

        <div style={styles.mainWrapper}>
          {!isFlowers && (
            <div style={styles.sidebar}>
              {subCategories.map((sub) => {
                const subImage = getSubcategoryImage(sub);
                return (
                  <div key={sub} style={styles.sideItem} onClick={() => setSelectedSub(sub)}>
                    <div style={{...styles.catCircle, border: selectedSub === sub ? "2px solid #318616" : "none"}}>
                      {subImage ? (
                        <img src={subImage} alt={sub} style={styles.catImage} />
                      ) : (
                        <div style={styles.catPlaceholder} />
                      )}
                    </div>
                    <span style={styles.catLabel}>{sub}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{...styles.scrollArea, marginLeft: isFlowers ? "0" : "85px"}}>
            {loading ? <p style={styles.statusText}>Loading...</p> : (
              <div style={styles.grid}>
                {filteredItems.length > 0 ? (
                  filteredItems.map((product) => {
                    const cartItem = cartItems.find((c) => c.product_id === product.id);
                    return (
                      <div key={product.id} style={styles.card}>
                        <div style={styles.imgWrapper}>
                          <img src={getImageUrl(product.image)} style={styles.image} alt={product.name} />
                        </div>
                        <h4 style={styles.name}>{product.name}</h4>
                        <p style={styles.weight}>{product.quantity || "1 kg"}</p>
                        <div style={styles.priceRow}>
                          <span style={styles.price}>₹{product.price}</span>
                          {cartItem && isLoggedIn ? (
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
                  })
                ) : (
                  <p style={{ color: "#333", gridColumn: "1 / -1", textAlign: "center" }}>No vegetables found in this subcategory.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={styles.fixedBottomNav}>
          <MobileBottomNav />
        </div>
        
      </div>
      </div>
    </>
  );
}

const styles = {
  // Outer page background - centers the phone-shaped frame on any screen
  // width (small phone, large phone, tablet, or desktop browser), instead
  // of letting the layout stretch or reflow differently per device.
  pageOuter: { backgroundColor: "#e9edf3", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "flex-start" },

  // Fixed-width frame - every device sees exactly this width; on wider
  // screens it's just centered with empty space on either side rather
  // than stretching the content.
  appContainer: { backgroundColor: "#ffffff", width: "100%", maxWidth: "430px", height: "100vh", color: "#fff", boxSizing: "border-box", position: "relative", overflow: "hidden", boxShadow: "0 0 30px rgba(0,0,0,0.15)" },
  fixedHeader: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1000, display: "flex", flexDirection: "column", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" },
  headerTop: { display: "flex", alignItems: "center", padding: "40px 15px", gap: "22px", height: "55px", backgroundColor: "#8ec5fc",  boxSizing: "border-box" },
  
  searchRow: { display: "flex", alignItems: "center", flex: 1, gap: "10px" },
  searchBox: { margin: "15px 10px 10px 10px", flex: 1, height: "36px", display: "flex", alignItems: "center", backgroundColor: "#ffffff", borderRadius: "10px", overflow: "hidden" },
  searchIconWrapper: { paddingLeft: "12px", display: "flex", alignItems: "center", justifyContent: "center" },
  searchInput: { flex: 1, border: "none", padding: "0 10px", outline: "none", fontSize: "13px", background: "transparent", color: "black" },
  micBtn: { margin: "15px 10px 10px 0px", width: "36px", height: "36px", border: "none", borderRadius: "50%", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  
  headerBottom: { display: "flex", alignItems: "center", justifyContent: "center", height: "38px", backgroundColor: "#8ec5fc", color: "#000000", position: "relative", boxSizing: "border-box" },
  backBtnBlack: {margin:"0 0 10px 0", position: "absolute", left: "25px", border: "none", background: "none", color: "#ffffff", fontSize: "30px", fontWeight: "bold", cursor: "pointer", padding: 0 },
  categoryTitle: { margin: 0, fontSize: "15px", fontWeight: "bold", letterSpacing: "0.5px" ,color: "#fffafa" },
  mainWrapper: { display: "flex", width: "100%" },
  sidebar: { width: "85px", position: "absolute", top: "118px", bottom: "65px", backgroundColor: "#add5fd", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "15px", overflowY: "auto", borderRight: "1px solid #ffffff" },
  sideItem: { marginBottom: "20px", textAlign: "center", cursor: "pointer" },
  catCircle: { width: "55px", height: "55px", borderRadius: "50%", backgroundColor: "#030303", marginBottom: "5px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  catImage: { width: "100%", height: "100%", objectFit: "cover" },
  catPlaceholder: { width: "100%", height: "100%", backgroundColor: "#555" },
  catLabel: { fontSize: "12px", color: "#000000" },
  scrollArea: { flex: 1, padding: "12px", boxSizing: "border-box", marginTop: "100px", height: "calc(100vh - 100px - 65px)", overflowY: "auto" },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" },
  card: { backgroundColor:"#ffffff", padding: "10px", borderRadius: "12px", margin:"15px 0px 0px 0px", display: "flex", flexDirection: "column", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" },
  imgWrapper: { width: "100%", height: "120px", marginBottom: "10px", overflow: "hidden", borderRadius: "8px", backgroundColor: "#333" },
  image: { width: "100%", height: "100%", objectFit: "cover" },
  name: { fontSize: "14px", margin: "0", fontWeight: "bold", color: "#333" },
  weight: { fontSize: "13px", color: "#000000", margin: "4px 0 10px 0" },
  priceRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" },
  price: { fontWeight: "bold", fontSize: "15px", color: "#333" },
  addBtn: { display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#8ec5fc", border: "1px solid #ffffff", color: "#ffffff", borderRadius: "6px", padding: "4px 14px", fontWeight: "bold", fontSize: "12px", cursor: "pointer" },
  qtyBox: { display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#4b4a4a", borderRadius: "6px", padding: "4px 8px" },
  btn: { border: "none", background: "none", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "14px" },
  qty: { fontSize: "13px", fontWeight: "bold", color: "#fff" },
  statusText: { textAlign: "center", padding: "20px", color: "#888" },
  fixedBottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1000 },

  // Added Modal Styles
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 },
  loginBox: { background: "white", padding: "20px", borderRadius: "12px", width: "90%", position: "relative" },
  closeBtn: { position: "absolute", top: "10px", right: "10px", border: "none", background: "none", fontSize: "24px", cursor: "pointer", color: "#333", zIndex: 10 },
  
  voiceOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn 0.2s ease" },
  voiceModal: { width: "100%", backgroundColor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "30px 20px 50px 20px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", boxShadow: "0 -4px 15px rgba(0,0,0,0.2)" },
  closeModalBtn: { position: "absolute", top: "15px", right: "20px", background: "none", border: "none", fontSize: "20px", color: "#666", cursor: "pointer", padding: "5px" },
  voiceTitle: { margin: "0 0 15px 0", fontSize: "18px", fontWeight: "bold", color: "#333" },
  voiceTranscript: { fontSize: "22px", textAlign: "center", minHeight: "60px", margin: "0 0 30px 0", display: "flex", alignItems: "center", fontStyle: "italic", maxWidth: "85%" },
  bigMicContainer: { width: "70px", height: "70px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.3s ease" }
};