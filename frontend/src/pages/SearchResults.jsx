import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import Cart from "../components/cart";
import { API_URL } from "../api";
import { getImageUrl } from "../utils/imageUrl";
import Login from "../pages/Login"; 

const GRADIENT = "linear-gradient(135deg, #4a90f5 0%, #2563eb 100%)";

export default function SearchResults() {
  const [items, setItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [cartRefresh, setCartRefresh] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const [showLogin, setShowLogin] = useState(false);

  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const user_id = localStorage.getItem("phone") || "guest";

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const isGuest = !isLoggedIn;

  useEffect(() => {
    document.body.style.overflow = (showCart || showLogin) ? "hidden" : "auto";
  }, [showCart, showLogin]);

  const loadCart = async () => {
    if (isGuest) {
      setCartCount(0);
      setCartItems([]);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/cart/${user_id}`);
      if (res.data.success) {
        setCartItems(res.data.cart || []);
        const uniqueItems = [...new Set(res.data.cart.map(item => item.product_id))];
        setCartCount(uniqueItems.length);
      }
    } catch (err) {
      setCartCount(0);
      setCartItems([]);
    }
  };

  const loadSearchItems = async () => {
    setIsLoading(true);
    setError(false);
    
    // --- SYNONYM DICTIONARY LOGIC ---
    let finalQuery = query.toLowerCase().trim();
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

    if (synonymDictionary[finalQuery]) {
      finalQuery = synonymDictionary[finalQuery];
    }

    try {
      // Send the translated/corrected query to the backend
      const res = await axios.get(`${API_URL}/search`, { params: { q: finalQuery } });
      if (res.data.success) {
        setItems(res.data.items || []);
      } else {
        setItems([]);
        setError(true);
      }
    } catch (err) {
      console.error("Search API Error:", err);
      setItems([]);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (product) => {
    if (isGuest) {
      setShowLogin(true);
      return;
    }
    
    const temporaryId = Date.now();
    setCartItems(prev => [...prev, { 
      id: temporaryId, 
      product_id: product.id, 
      category: product.category, 
      quantity: 1 
    }]);

    try {
      const res = await axios.post(`${API_URL}/cart/add`, {
        user_id, product_id: product.id, category: product.category,
      });

      if (res.data.success) {
        await loadCart();
        setCartRefresh((prev) => prev + 1);
        setShowCart(true); 
      }
    } catch (err) {
      alert("Add to cart failed");
      await loadCart();
    }
  };

  const updateQty = async (cart_id, action) => {
    const item = cartItems.find((i) => i.id === cart_id);

    setCartItems(prev => {
      return prev.map(i => {
        if (i.id === cart_id) {
          return { ...i, quantity: action === "increase" ? i.quantity + 1 : i.quantity - 1 };
        }
        return i;
      }).filter(i => i.quantity > 0); 
    });

    try {
      if (action === "decrease") {
        if (item && item.quantity <= 1) {
          await axios.delete(`${API_URL}/cart/${cart_id}`);
        } else {
          await axios.put(`${API_URL}/cart/decrease/${cart_id}`);
        }
      } else {
        await axios.put(`${API_URL}/cart/increase/${cart_id}`);
      }
      
      await loadCart();
      setCartRefresh(prev => prev + 1); 
    } catch (err) {
      console.error(err);
      await loadCart(); 
    }
  };

  useEffect(() => {
    loadSearchItems();
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

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

      <Header cartCount={cartCount} openCart={() => setShowCart(true)} />

      <div style={styles.content}>
        <h2 style={styles.pageTitle}>Search results for: "{query}"</h2>
        
        {isLoading ? (
          <h3 style={styles.empty}>Searching...</h3>
        ) : error ? (
          <div style={styles.empty}>
            <p>Something went wrong while searching.</p>
            <button style={styles.retryBtn} onClick={loadSearchItems}>Retry</button>
          </div>
        ) : items.length === 0 ? (
          <h3 style={styles.empty}>No items found for "{query}". Try a different spelling!</h3>
        ) : (
          <div style={styles.grid}>
            {items.map((item) => {
              const cartItem = cartItems.find((c) => c.product_id === item.id && c.category === item.category);
              const outOfStock = Number(item.stock) <= 0;
              
              return (
                <div key={`${item.category}-${item.id}`} style={outOfStock ? { ...styles.card, ...styles.cardOutOfStock } : styles.card}>
                  <div style={styles.imgWrapper}>
                    <img
                      src={getImageUrl(item.image, "150x150/cccccc/000000&text=No+Image")}
                      alt={item.name}
                      style={outOfStock ? { ...styles.image, ...styles.imageOutOfStock } : styles.image}
                    />
                    {outOfStock && <div style={styles.outOfStockBadge}>Out of Stock</div>}
                  </div>
                  
                  <div style={styles.cardBody}>
                    <h3 style={styles.name}>{item.name}</h3>
                    <span style={styles.unitText}>{item.unit || item.weight || "1 kg"}</span>
                    <p style={styles.category}>{item.category}</p>
                    
                    <div style={styles.bottomRow}>
                      <p style={styles.price}>₹{item.price}</p>
                      
                      {outOfStock ? (
                        <span style={styles.outOfStockText}>Out of Stock</span>
                      ) : cartItem && !isGuest ? (
                        <div style={styles.qtyBox}>
                          <button style={styles.btn} onClick={() => updateQty(cartItem.id, "decrease")}>-</button>
                          <span style={styles.qty}>{cartItem.quantity}</span>
                          <button style={styles.btn} onClick={() => updateQty(cartItem.id, "increase")}>+</button>
                        </div>
                      ) : (
                        <button style={styles.addBtn} onClick={() => addToCart(item)}>ADD</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCart && (
        <div style={styles.cartOverlay} onClick={() => setShowCart(false)}></div>
      )}

      <div style={styles.cartWrapper(showCart)}>
        {showCart && !isGuest && (
          <Cart 
            user_id={user_id} 
            refresh={cartRefresh} 
            onCartChange={loadCart} 
            closeCart={() => setShowCart(false)} 
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", backgroundColor: "#f5f6fb", position: "relative" },
  content: { paddingTop: "130px", paddingLeft: "30px", paddingRight: "30px", paddingBottom: "40px", maxWidth: "1600px", margin: "0 auto" },
  pageTitle: { fontSize: "24px", fontWeight: "800", color: "#111", marginBottom: "25px" },
  empty: { textAlign: "center", marginTop: "40px", color: "#555" },
  retryBtn: { marginTop: "10px", padding: "8px 20px", border: "none", borderRadius: "8px", background: "#8ec5fc", color: "#fff", fontWeight: "bold", cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "24px" },
  card: { background: "#fff", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", transition: "transform 0.2s ease" },
  imgWrapper: { width: "100%", height: "190px", overflow: "hidden", borderRadius: "10px", marginBottom: "16px", backgroundColor: "#f9f9f9", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" },
  image: { width: "100%", height: "100%", objectFit: "contain" },
  cardOutOfStock: { opacity: 0.6 },
  imageOutOfStock: { filter: "grayscale(1)" },
  outOfStockBadge: {
    position: "absolute", top: "8px", left: "8px",
    backgroundColor: "rgba(0,0,0,0.75)", color: "#fff",
    fontSize: "11px", fontWeight: "bold", padding: "4px 8px",
    borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.3px"
  },
  outOfStockText: { fontSize: "14px", fontWeight: "bold", color: "#e53935" },
  cardBody: { display: "flex", flexDirection: "column", flex: 1 },
  name: { fontSize: "17px", fontWeight: "700", color: "#111", margin: "0 0 4px 0", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },
  unitText: { fontSize: "14px", color: "#666", fontWeight: "500", marginBottom: "8px" },
  category: { fontSize: "13px", color: "#999", textTransform: "capitalize", margin: "0 0 16px 0" },
  bottomRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" },
  price: { fontSize: "20px", fontWeight: "800", color: "#111", margin: 0 },
  addBtn: { width: "84px", height: "36px", border: "1.5px solid #8ec5fc", backgroundColor: "#8ec5fc", color: "#ffffff", borderRadius: "8px", fontWeight: "700", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", textTransform: "uppercase" },
  qtyBox: { width: "84px", height: "36px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#8ec5fc", borderRadius: "8px", padding: "0 8px", boxSizing: "border-box" },
  btn: { border: "none", background: "transparent", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "100%" },
  qty: { fontSize: "15px", fontWeight: "bold", color: "#fff" },
  cartOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)", zIndex: 9998 },
  cartWrapper: (showCart) => ({ width: showCart ? "500px" : "0px", transition: "0.3s cubic-bezier(0.25, 0.8, 0.25, 1)", overflow: "hidden", backgroundColor: "#f4f6f9", height: "100vh", position: "fixed", right: 0, top: 0, boxShadow: showCart ? "-5px 0 25px rgba(0,0,0,0.15)" : "none", zIndex: 9999 }),
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 },
  loginBox: { background: "white", padding: "20px", borderRadius: "12px", width: "400px", maxWidth: "90%", position: "relative", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" },
  closeBtn: { position: "absolute", top: "10px", right: "15px", border: "none", background: "none", fontSize: "24px", cursor: "pointer", color: "#333", zIndex: 10 }
};