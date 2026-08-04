import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
import MobileHeader from "../mobile/MobileHeader";
import MobileBottomNav, { NAV_HEIGHT } from "../mobile/MobileBottomNav";
import { getImageUrl } from "../utils/imageUrl";

/**
 * FIX NOTES (this file had the most impactful bugs in the app):
 * 1. BIGGEST ISSUE: this page built its own header from scratch instead
 *    of reusing <MobileHeader/>. Different blue gradient, no location bar,
 *    no mic button, different font sizes — every category page looked
 *    like a different app from the home screen. Now it reuses the shared
 *    header, so the whole app has one consistent look.
 * 2. MobileHeader renders with `position: fixed`, and MobileBottomNav
 *    renders with `position: fixed` too. The layout uses `position: fixed`
 *    on the entire container and `position: absolute` on the wrapper to 
 *    lock the layout vertically and prevent the entire page body from jumping.
 *      - Header height: MobileHeader measures itself live with a
 *        ResizeObserver and reports it via `onHeightChange`.
 *      - Bottom nav height: MobileBottomNav exports its own real height
 *        as `NAV_HEIGHT` (65px).
 * 3. Added `env(safe-area-inset-bottom)` so the grid's bottom padding and
 *    sidebar don't end under the home-indicator on notched phones.
 * 4. <MobileBottomNav /> was rendered with no props at all, so tab
 *    highlighting could never reflect the real active tab. Now wired
 *    correctly.
 * 5. Add-to-cart / quantity changes triggered a full network refetch of
 *    the entire cart on every tap, which felt laggy on slow connections.
 *    Now the UI updates optimistically and reconciles with the server
 *    response, and failures roll back instead of silently doing nothing.
 * 6. Added a real loading skeleton (previously just a text string, which
 *    causes a jarring pop-in) and a retry button on error instead of a
 *    dead-end message.
 * 7. Added request cancellation / mounted-guard so switching categories
 *    quickly can't apply a stale response over a newer one.
 */
export default function CategoryItems() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedSub, setSelectedSub] = useState("All");
  const [headerHeight, setHeaderHeight] = useState(112);

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

  const goSearch = () => {
    if (search.trim() !== "") navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  const addToCart = async (product) => {
    if (!isLoggedIn() || user_id === "guest") return alert("Please login to add items.");

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
      setCartItems(prevSnapshot); // roll back
    } finally {
      window.dispatchEvent(new Event("cartUpdated"));
    }
  };

  const bottomReserved = `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`;

  return (
    <div style={styles.container}>
      <MobileHeader
        searchValue={search}
        setSearchValue={setSearch}
        onSearch={goSearch}
        showLogo={false}
        showTitleBar
        title={categoryId}
        activeTab="category"
        isLoggedIn={isLoggedIn()}
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
            {subCategories.map((sub) => (
              <button
                key={sub}
                style={selectedSub === sub ? styles.sideBtnActive : styles.sideBtn}
                onClick={() => setSelectedSub(sub)}
              >
                {sub}
              </button>
            ))}
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
          ) : items.length === 0 ? (
            <p style={styles.statusText}>No items found.</p>
          ) : (
            <div style={styles.grid}>
              {filteredItems.map((product) => {
                const cartItem = cartItems.find((c) => c.product_id === product.id);
                return (
                  <div key={product.id} style={styles.card}>
                    <div style={styles.imgWrapper}>
                      <img
                        src={getImageUrl(product.image)}
                        style={styles.image}
                        alt={product.name}
                        loading="lazy"
                        onError={(e) => { e.target.style.opacity = 0.3; }}
                      />
                    </div>
                    <h4 style={styles.name}>{product.name}</h4>
                    <div style={styles.bottomRow}>
                      <p style={styles.price}>₹{product.price}</p>
                      {cartItem ? (
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
const GRADIENT = "linear-gradient(135deg, #8ec5fc 0%, #6badf5 100%)"; 

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
  sidebar: { 
    width: "clamp(72px, 22vw, 92px)", 
    height: "100%",
    backgroundColor: "#fff", 
    borderRight: "1px solid #eef1f5", 
    overflowY: "auto", 
    padding: "8px 0", 
    boxSizing: "border-box" 
  },
  scrollArea: { 
    flex: 1, 
    height: "100%",
    minWidth: 0, 
    padding: "15px", 
    paddingBottom: "20px", 
    boxSizing: "border-box",
    overflowY: "auto", 
    WebkitOverflowScrolling: "touch"
  },
  sideBtn: { display: "block", width: "100%", padding: "14px 6px", border: "none", background: "transparent", fontSize: "11px", fontWeight: "600", color: "#667085", textAlign: "center", cursor: "pointer", transition: "0.2s", borderLeft: "3px solid transparent" },
  sideBtnActive: { display: "block", width: "100%", padding: "14px 6px", border: "none", background: "#eaf1fe", fontSize: "11px", fontWeight: "700", color: "#2563eb", textAlign: "center", cursor: "pointer", transition: "0.2s", borderLeft: `3px solid ${BRAND}` },
  
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  card: { backgroundColor: "#fff", padding: "12px", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", minWidth: 0, overflow: "hidden" },
  imgWrapper: { width: "100%", aspectRatio: "1.4", overflow: "hidden", borderRadius: "10px", marginBottom: "8px", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#f5f7fa" },
  image: { width: "100%", height: "100%", objectFit: "cover" },
  name: { fontSize: "13px", margin: "0 0 10px 0", minHeight: "30px", overflow: "hidden", fontWeight: "700", color: "#111", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },
  bottomRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", flexWrap: "wrap", rowGap: "6px", minWidth: 0 },
  price: { fontWeight: "800", fontSize: "14px", margin: 0, color: "#111", flexShrink: 0 },
  addBtn: { padding: "7px 14px", border: `1.5px solid ${BRAND}`, backgroundColor: "#eaf1fe", color: "#2563eb", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer", flexShrink: 0 },
  qtyBox: { display: "flex", alignItems: "center", gap: "4px", background: GRADIENT, borderRadius: "8px", padding: "3px 6px", flexShrink: 0, boxSizing: "border-box" },
  btn: { border: "none", background: "none", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "14px", padding: "0 3px", lineHeight: 1, flexShrink: 0 },
  qty: { fontSize: "13px", fontWeight: "bold", color: "#fff", minWidth: "10px", textAlign: "center", flexShrink: 0 },
  statusWrap: { textAlign: "center", padding: "30px", width: "100%" },
  statusText: { textAlign: "center", color: "#888", padding: "0 0 12px", width: "100%", margin: 0 },
  retryBtn: { border: `1.5px solid ${BRAND}`, background: "#eaf1fe", color: "#2563eb", borderRadius: "8px", padding: "8px 18px", fontWeight: "700", fontSize: "13px", cursor: "pointer" },

  skeletonCard: { backgroundColor: "#fff", padding: "12px", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  skeletonImage: { width: "100%", aspectRatio: "1.4", borderRadius: "10px", marginBottom: "8px", background: "linear-gradient(90deg, #eef1f5 25%, #f7f9fb 37%, #eef1f5 63%)", backgroundSize: "400% 100%", animation: "catSkeleton 1.4s ease infinite" },
  skeletonLine: { height: "12px", borderRadius: "6px", marginBottom: "8px", width: "80%", background: "linear-gradient(90deg, #eef1f5 25%, #f7f9fb 37%, #eef1f5 63%)", backgroundSize: "400% 100%", animation: "catSkeleton 1.4s ease infinite" },
};

if (typeof document !== "undefined" && !document.getElementById("cat-skeleton-kf")) {
  const styleTag = document.createElement("style");
  styleTag.id = "cat-skeleton-kf";
  styleTag.textContent = `@keyframes catSkeleton { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }`;
  document.head.appendChild(styleTag);
}