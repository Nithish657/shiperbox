import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
import MobileHeader from "../mobile/MobileHeader";
import MobileBottomNav, { NAV_HEIGHT } from "../mobile/MobileBottomNav";
import { getImageUrl } from "../utils/imageUrl";
import Login from "../pages/Login";

export default function MobileItemsList() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedSub, setSelectedSub] = useState("All");
  const [headerHeight, setHeaderHeight] = useState(112);
  const [showLogin, setShowLogin] = useState(false);

  const getUserId = () => {
    try { return localStorage.getItem("phone") || "guest"; } catch (_) { return "guest"; }
  };
  const user_id = getUserId();
  const isLoggedIn = () => {
    try { return localStorage.getItem("isLoggedIn") === "true"; } catch (_) { return false; }
  };

  const fetchCartData = useCallback(async () => {
    if (user_id === "guest") return;
    try {
      const res = await axios.get(`${API_URL}/cart/${user_id}`);
      if (res.data.success) setCartItems(res.data.cart);
    } catch (err) {
      console.log("Cart fetch error:", err);
    }
  }, [user_id]);

  const fetchItems = useCallback(() => {
    setLoading(true);
    setError(false);
    axios.get(`${API_URL}/items/${categoryId}`)
      .then((res) => {
        if (res.data.success) setItems(res.data.items);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [categoryId]);

  useEffect(() => {
    fetchCartData();
    fetchItems();
  }, [categoryId, fetchCartData, fetchItems]);

  const isFlowers = categoryId === "flowers";
  const subCategories = isFlowers ? [] : ["All", ...new Set(items.map((i) => i.subcategory || "General"))];
  const filteredItems = (selectedSub === "All" || isFlowers) ? items : items.filter((i) => (i.subcategory || "General") === selectedSub);

  const getSubcategoryImage = (subName) => {
    if (subName === "All" && items.length > 0) return getImageUrl(items[0].image);
    const item = items.find((i) => (i.subcategory || "General").toLowerCase() === subName.toLowerCase());
    return item ? getImageUrl(item.image) : "";
  };

  const goSearch = () => {
    if (search.trim() !== "") navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  const addToCart = async (product) => {
    if (!isLoggedIn() || user_id === "guest") {
      setShowLogin(true);
      return;
    }

    const tempId = `temp-${product.id}`;
    setCartItems((prev) => [...prev, { id: tempId, product_id: product.id, quantity: 1 }]);
    window.dispatchEvent(new Event("cartUpdated"));

    try {
      await axios.post(`${API_URL}/cart/add`, { user_id, product_id: product.id, category: categoryId });
      await fetchCartData();
    } catch (err) {
      setCartItems((prev) => prev.filter((i) => i.id !== tempId));
      alert("Couldn't add item — please try again.");
    } finally {
      window.dispatchEvent(new Event("cartUpdated"));
    }
  };

  const updateQty = async (cart_id, action) => {
    const item = cartItems.find((i) => i.id === cart_id);
    if (!item) return;
    const prevSnapshot = cartItems;

    if (action === "decrease" && item.quantity <= 1) {
      setCartItems((prev) => prev.filter((i) => i.id !== cart_id));
    } else {
      setCartItems((prev) => prev.map((i) => i.id === cart_id
        ? { ...i, quantity: action === "increase" ? i.quantity + 1 : i.quantity - 1 }
        : i));
    }
    window.dispatchEvent(new Event("cartUpdated"));

    try {
      if (action === "decrease" && item.quantity <= 1) {
        await axios.delete(`${API_URL}/cart/${cart_id}`);
      } else {
        await axios.put(`${API_URL}/cart/${action}/${cart_id}`);
      }
      await fetchCartData();
    } catch (err) {
      setCartItems(prevSnapshot);
    } finally {
      window.dispatchEvent(new Event("cartUpdated"));
    }
  };

  const bottomReserved = `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`;

  return (
    <div style={styles.container}>
      {showLogin && (
        <div style={styles.overlay}>
          <div style={styles.loginBox}>
            <button style={styles.closeBtn} onClick={() => setShowLogin(false)} aria-label="Close login">×</button>
            <Login onLoginSuccess={() => { setShowLogin(false); window.location.reload(); }} />
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
        title={categoryId}
        activeTab="category"
        isLoggedIn={isLoggedIn()}
        onLoginClick={() => setShowLogin(true)}
        onHeightChange={setHeaderHeight}
      />

      <div
        style={{
          ...styles.mainWrapper,
          top: `${headerHeight}px`,
          bottom: bottomReserved,
        }}
      >
        {!isFlowers && (
          <div style={styles.sidebar}>
            {subCategories.map((sub) => {
              const subImage = getSubcategoryImage(sub);
              return (
                <div key={sub} style={styles.sideItem} onClick={() => setSelectedSub(sub)}>
                  <div style={{ ...styles.catCircle, border: selectedSub === sub ? "2px solid #2563eb" : "2px solid transparent" }}>
                    {subImage ? (
                      <img src={subImage} alt={sub} style={styles.catImage} />
                    ) : (
                      <div style={styles.catPlaceholder} />
                    )}
                  </div>
                  <span style={selectedSub === sub ? styles.catLabelActive : styles.catLabel}>{sub}</span>
                </div>
              );
            })}
          </div>
        )}

        <div style={styles.scrollArea}>
          {loading ? (
            <div style={styles.grid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={styles.skeletonCard}>
                  <div style={styles.skeletonImage} />
                  <div style={styles.skeletonLine} />
                  <div style={{ ...styles.skeletonLine, width: "50%" }} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div style={styles.statusWrap}>
              <p style={styles.statusText}>Couldn't load items right now.</p>
              <button style={styles.retryBtn} onClick={fetchItems}>Try again</button>
            </div>
          ) : filteredItems.length === 0 ? (
            <p style={styles.statusText}>No items found.</p>
          ) : (
            <div style={styles.grid}>
              {filteredItems.map((product) => {
                const cartItem = cartItems.find((c) => c.product_id === product.id);
                const outOfStock = Number(product.stock) <= 0;
                return (
                  <div key={product.id} style={outOfStock ? { ...styles.card, ...styles.cardOutOfStock } : styles.card}>
                    <div style={styles.imgWrapper}>
                      <img
                        src={getImageUrl(product.image)}
                        style={outOfStock ? { ...styles.image, ...styles.imageOutOfStock } : styles.image}
                        alt={product.name}
                        loading="lazy"
                        onError={(e) => { e.target.style.opacity = 0.3; }}
                      />
                      {outOfStock && <div style={styles.outOfStockBadge}>Out of Stock</div>}
                    </div>
                    
                    <h4 style={styles.gridTitle}>{product.name}</h4>
                    <span style={styles.gridUnit}>{product.quantity || "1 kg"}</span>
                    
                    <div style={styles.priceRow}>
                      <p style={styles.price}>₹{product.price}</p>
                      
                      {outOfStock ? (
                        <span style={styles.outOfStockText}>Out of Stock</span>
                      ) : cartItem ? (
                        <div style={styles.qtyBox}>
                          <button style={styles.btn} onClick={() => updateQty(cartItem.id, "decrease")} aria-label="Decrease quantity">−</button>
                          <span style={styles.qty}>{cartItem.quantity}</span>
                          <button style={styles.btn} onClick={() => updateQty(cartItem.id, "increase")} aria-label="Increase quantity">+</button>
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
      </div>
      <MobileBottomNav activeTab="home" setActiveTab={() => {}} />
    </div>
  );
}

const BRAND = "#8ec5fc";

const styles = {
  container: { 
    position: "fixed",  
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "#f5f7fa", 
    overflow: "hidden"
  },
  mainWrapper: { 
    position: "absolute",
    left: 0, right: 0,
    display: "flex", 
    boxSizing: "border-box",
    overflow: "hidden"
  },
  scrollArea: { 
    flex: 1, 
    height: "100%",
    minWidth: 0, 
    padding: "15px", 
    paddingBottom: "20px", 
    boxSizing: "border-box", 
    overflowY: "auto",      
    WebkitOverflowScrolling: "touch", 
  },
  sidebar: {
    width: "clamp(68px, 21vw, 85px)",
    height: "100%",
    backgroundColor: "#fff",
    borderRight: "1px solid #eef1f5",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: "15px",
    overflowY: "auto",
    boxSizing: "border-box",
  },
  sideItem: { marginBottom: "20px", textAlign: "center", cursor: "pointer", width: "100%" },
  catCircle: { width: "62%", aspectRatio: "1 / 1", borderRadius: "50%", backgroundColor: "#eef1f5", margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxSizing: "border-box" },
  catImage: { width: "100%", height: "100%", objectFit: "cover" },
  catPlaceholder: { width: "100%", height: "100%", backgroundColor: "#dbe4f0" },
  catLabel: { fontSize: "11px", color: "#667085", fontWeight: "600", display: "block", lineHeight: 1.3 },
  catLabelActive: { fontSize: "11px", color: "#2563eb", fontWeight: "700", display: "block", lineHeight: 1.3 },

  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  card: { backgroundColor: "#fff", padding: "12px", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" },
  imgWrapper: { width: "100%", aspectRatio: "1.0", overflow: "hidden", borderRadius: "10px", marginBottom: "8px", backgroundColor: "#f5f7fa", position: "relative" },
  image: { width: "100%", height: "100%", objectFit: "cover" },
  cardOutOfStock: { opacity: 0.6 },
  imageOutOfStock: { filter: "grayscale(1)" },
  outOfStockBadge: { position: "absolute", top: "6px", left: "6px", backgroundColor: "rgba(0,0,0,0.75)", color: "#fff", fontSize: "9px", fontWeight: "bold", padding: "3px 6px", borderRadius: "5px", textTransform: "uppercase", letterSpacing: "0.2px" },
  outOfStockText: { fontSize: "11px", fontWeight: "bold", color: "#e53935" },
  gridTitle: { fontSize: "14px", fontWeight: "700", color: "#000", margin: "8px 0 4px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  gridUnit: { fontSize: "12px", color: "#6b7280", margin: "0 0 12px 0", fontWeight: "500", display: "block" },
  priceRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" },
  price: { fontWeight: "900", fontSize: "13px", color: "#000", margin: 0 },
  addBtn: {margin:"0 0 2px", padding: "5px 10px", backgroundColor: "#7fb8ff", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "14px", cursor: "pointer" },
  qtyBox: { margin:"0 0 4px 7px",display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", backgroundColor: "#7fb8ff", borderRadius: "10px", padding: "1px 5px" },
  btn: { border: "none", background: "none", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "20px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  qty: { fontSize: "16px", fontWeight: "700", color: "#fff", minWidth: "14px", textAlign: "center" },

  statusWrap: { textAlign: "center", padding: "30px", width: "100%" },
  statusText: { textAlign: "center", color: "#888", padding: "0 0 12px", width: "100%", margin: 0 },
  retryBtn: { border: `1.5px solid ${BRAND}`, background: "#eaf1fe", color: "#2563eb", borderRadius: "8px", padding: "8px 18px", fontWeight: "700", fontSize: "13px", cursor: "pointer" },

  skeletonCard: { backgroundColor: "#fff", padding: "12px", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  skeletonImage: { width: "100%", aspectRatio: "1.3", borderRadius: "10px", marginBottom: "8px", background: "linear-gradient(90deg, #eef1f5 25%, #f7f9fb 37%, #eef1f5 63%)", backgroundSize: "400% 100%", animation: "itemsSkeleton 1.4s ease infinite" },
  skeletonLine: { height: "12px", borderRadius: "6px", marginBottom: "8px", width: "80%", background: "linear-gradient(90deg, #eef1f5 25%, #f7f9fb 37%, #eef1f5 63%)", backgroundSize: "400% 100%", animation: "itemsSkeleton 1.4s ease infinite" },

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 },
  loginBox: { background: "white", padding: "20px", borderRadius: "12px", width: "90%", maxWidth: "360px", position: "relative", boxSizing: "border-box" },
  closeBtn: { position: "absolute", top: "10px", right: "10px", border: "none", background: "none", fontSize: "24px", cursor: "pointer", color: "#333", zIndex: 10 },
};

if (typeof document !== "undefined" && !document.getElementById("items-skeleton-kf")) {
  const styleTag = document.createElement("style");
  styleTag.id = "items-skeleton-kf";
  styleTag.textContent = `@keyframes itemsSkeleton { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }`;
  document.head.appendChild(styleTag);
}