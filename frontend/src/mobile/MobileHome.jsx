import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import MobileLogin from "./Mobilelogin";
import MobileAdsSlider from "./MobileAdsSlider";
import MobileCart from "./MobileCart";
import MobileHeader from "./MobileHeader";
import MobileBottomNav, { NAV_HEIGHT } from "./MobileBottomNav";
import axios from "axios";
import { API_URL } from "../api";
import { COLOR, FONT, RADIUS, SHADOW, EASE, EASE_SPRING, GlobalMobileStyles } from "./mobiletheme";
import { useRevealOnScroll } from "./mobileMotion";

// Category card images - hosted on Cloudinary
const CATEGORY_IMAGES = {
  vegetables: "https://res.cloudinary.com/cj5eyjpf/image/upload/v1788168467/veggiescat_bfkuys.png",
  flowers: "https://res.cloudinary.com/cj5eyjpf/image/upload/v1788168494/flowescat_vg6efa.png",
  garland: "https://res.cloudinary.com/cj5eyjpf/image/upload/v1786521043/flowergarland_ni3pxp.jpg",
  courier: "https://res.cloudinary.com/cj5eyjpf/image/upload/v1786521034/1daycor_hn0vsx.jpg",
  accessories: "https://res.cloudinary.com/cj5eyjpf/image/upload/v1788168431/mobileaccess_p8f9wk.png",
};

const safeGet = (key, fallback = null) => {
  try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
};
const safeClear = () => {
  try { localStorage.clear(); } catch (_) {}
};

// ==========================================
// CUSTOM SVG ICONS
// ==========================================
const Icons = {
  User: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="7" r="4.5" fill={color} />
      <path d="M5 21.5c0-4.142 3.134-7.5 7-7.5s7 3.358 7 7.5" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  Orders: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 3h12a3 3 0 0 1 3 3v4H3V6a3 3 0 0 1 3-3z" fill={color} />
      <path d="M21 12H3v6a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-6z" fill={color} />
    </svg>
  ),
  Address: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" fill={color} />
    </svg>
  ),
  Help: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 5.58 2 10c0 2.5 1.45 4.73 3.73 6.13-.3 1.83-1.4 3.32-1.48 3.44a.5.5 0 0 0 .58.74c2.81-.82 4.74-2.22 5.74-3.04A10.98 10.98 0 0 0 12 18c5.52 0 10-3.58 10-8s-4.48-8-10-8z" fill={color} />
      <circle cx="7.5" cy="10" r="1.5" fill="#fff" />
      <circle cx="12" cy="10" r="1.5" fill="#fff" />
      <circle cx="16.5" cy="10" r="1.5" fill="#fff" />
    </svg>
  ),
  About: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="14" r="7" stroke={color} strokeWidth="2.5" fill="none" />
      <circle cx="20" cy="4" r="2.5" fill={color} />
    </svg>
  ),
  Logout: ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 22a10 10 0 1 1 0-20" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M14 12H3m0 0 4-4m-4 4 4 4" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Truck: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 6h11v9H2z" fill={color} />
      <path d="M13 10h4l4 3.2V15h-8z" fill={color} opacity="0.7" />
      <circle cx="6.5" cy="17.5" r="2" fill={color} />
      <circle cx="17" cy="17.5" r="2" fill={color} />
    </svg>
  ),
  Phone: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="2" width="12" height="20" rx="2.5" stroke={color} strokeWidth="2" fill="none" />
      <line x1="6" y1="18" x2="18" y2="18" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="20" r="0.9" fill={color} />
    </svg>
  ),
};

const TabIcons = {
  garland: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6c3 3 15 3 18 0" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="7" cy="12.5" r="3" stroke={color} strokeWidth="1.6" />
      <circle cx="12.5" cy="15" r="3" stroke={color} strokeWidth="1.6" />
      <circle cx="18" cy="12.5" r="3" stroke={color} strokeWidth="1.6" />
    </svg>
  ),
  courier: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8.5" width="16" height="11" rx="1.4" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M4 8.5l8-4 8 4" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8.5v11" stroke={color} strokeWidth="1.7" />
    </svg>
  ),
  vegetables: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.5 19.5c0-8.5 6.5-15 15-15 0 8.5-6.5 15-15 15z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M6.5 17.5c2.5-2.5 6-6 11-11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  flowers: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="2.3" stroke={color} strokeWidth="1.6" />
      <circle cx="12" cy="5.8" r="2.9" stroke={color} strokeWidth="1.5" />
      <circle cx="18.2" cy="12" r="2.9" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="18.2" r="2.9" stroke={color} strokeWidth="1.5" />
      <circle cx="5.8" cy="12" r="2.9" stroke={color} strokeWidth="1.5" />
    </svg>
  ),
  accessories: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <rect x="2.5" y="13" width="4" height="7" rx="1.5" stroke={color} strokeWidth="1.6" />
      <rect x="17.5" y="13" width="4" height="7" rx="1.5" stroke={color} strokeWidth="1.6" />
    </svg>
  ),
};

const CATEGORIES = [
  { key: "garland", label: "Flower Garland", image: CATEGORY_IMAGES.garland, tabIcon: TabIcons.garland, path: "/m-garland" },
  { key: "courier", label: "1-Day Courier", image: CATEGORY_IMAGES.courier, icon: Icons.Truck, tabIcon: TabIcons.courier, path: "/courier" },
  { key: "vegetables", label: "Vegetables", image: CATEGORY_IMAGES.vegetables, tabIcon: TabIcons.vegetables, path: "/category/vegetables" },
  { key: "flowers", label: "Flowers", image: CATEGORY_IMAGES.flowers, tabIcon: TabIcons.flowers, path: "/category/flowers" },
  { key: "accessories", label: "Mobile Accessories", image: CATEGORY_IMAGES.accessories, icon: Icons.Phone, tabIcon: TabIcons.accessories, path: "/category/mobile-accessories" },
];

function CategoryStripItem({ label, tabIcon: TabIcon, active, onClick }) {
  const [pressed, setPressed] = useState(false);
  const release = () => setPressed(false);
  const tint = active ? "#ffffff" : "rgba(255,255,255,0.78)";

  return (
    <div
      style={{
        ...stripStyles.item,
        transform: pressed ? "scale(0.92)" : active ? "scale(1.02)" : "scale(1)",
        backgroundColor: active ? "rgba(255,255,255,0.16)" : "transparent",
      }}
      className="sb-tap"
      onClick={onClick}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={release}
      onTouchCancel={release}
      onMouseDown={() => setPressed(true)}
      onMouseUp={release}
      onMouseLeave={release}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      {TabIcon && <TabIcon size={19} color={tint} />}
      <span style={{ ...stripStyles.label, color: tint, fontWeight: active ? 700 : 600 }}>{label}</span>
      <span
        style={{
          ...stripStyles.underline,
          width: active ? "18px" : "0px",
          backgroundColor: "#ffffff",
        }}
      />
    </div>
  );
}

// ==========================================
// REDESIGNED: Big & Neat Category Tile
// ==========================================
function CategoryTile({ label, image, icon: IconComp, badge, index = 0, onClick, size = "md", imgAspectRatio }) {
  const [pressed, setPressed] = useState(false);
  const [broken, setBroken] = useState(false);
  const release = () => setPressed(false);
  const showImage = image && !broken;

  return (
    <div
      style={{
        ...tileStyles.card,
        animationDelay: `${index * 55}ms`,
        transform: pressed ? "scale(0.96) translateY(1px)" : "scale(1)",
        boxShadow: pressed ? SHADOW.rest : "0 4px 12px rgba(15,23,42,0.06)",
      }}
      className="sb-tap mil-card mil-tile"
      onClick={onClick}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={release}
      onTouchCancel={release}
      onMouseDown={() => setPressed(true)}
      onMouseUp={release}
      onMouseLeave={release}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div style={{ ...tileStyles.imgWrapper, aspectRatio: imgAspectRatio }}>
        {showImage ? (
          <img
            src={image}
            alt={label}
            style={{ ...tileStyles.image, transform: pressed ? "scale(1.05)" : "scale(1)" }}
            loading="lazy"
            onError={() => setBroken(true)}
          />
        ) : (
          <div style={{ ...tileStyles.iconFallback, background: COLOR.primarySoft }}>
            {IconComp ? <IconComp size={size === "lg" ? 34 : 26} color={COLOR.primaryDark} /> : <span style={tileStyles.fallbackLetter}>{label[0]}</span>}
          </div>
        )}

        {badge && (
          <span style={tileStyles.ribbon}>{badge}</span>
        )}
      </div>

      <div style={tileStyles.labelWrapper}>
        <span style={{ ...tileStyles.label, fontSize: size === "lg" ? "14px" : "12px" }}>{label}</span>
      </div>
    </div>
  );
}

// ==========================================
// ADJUSTABLE PRODUCT CARD & PRICE HELPERS
// ==========================================
function parsePrice(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[^0-9.]/g, "");
  if (cleaned === "") return null;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

function formatPrice(num) {
  return num % 1 === 0 ? num.toLocaleString("en-IN") : num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ProductCard({ product, cartItem, onAdd, onUpdateQty, addPending, actionPending, onClick }) {
  const [broken, setBroken] = useState(false);

  const name = product.name || product.title || "Item";
  const image = product.image || product.image_url || product.photo;
  const price = parsePrice(
    product.price ?? product.sale_price ?? product.selling_price ?? product.discounted_price ??
    product.rate ?? product.amount ?? product.cost ?? product.mrp
  );
  const mrp = parsePrice(product.mrp ?? product.original_price ?? product.list_price ?? product.strike_price);
  const hasStrike = mrp !== null && price !== null && mrp > price;
  const discountPct = hasStrike ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const unit = product.quantity || product.unit || product.weight || "";
  
  const stockNum = Number(product.stock || 10);
  const outOfStock = stockNum <= 0;
  const lowStock = !outOfStock && stockNum <= 5;
  const atStockLimit = !!cartItem && stockNum > 0 && cartItem.quantity >= stockNum;

  return (
    <div
      className="mil-card"
      style={{
        ...(outOfStock ? { ...productCardStyles.card, ...productCardStyles.cardOutOfStock } : productCardStyles.card),
      }}
    >
      <div style={productCardStyles.imgWrapper} onClick={onClick}>
        {!image || broken ? (
          <div style={productCardStyles.imgFallback}>{name[0]}</div>
        ) : (
          <img
            src={image}
            style={outOfStock ? { ...productCardStyles.image, ...productCardStyles.imageOutOfStock } : productCardStyles.image}
            alt={name}
            loading="lazy"
            onError={() => setBroken(true)}
          />
        )}
        {outOfStock && <div style={productCardStyles.outOfStockBadge}>Out of Stock</div>}
        {lowStock && <div style={productCardStyles.lowStockBadge}>{stockNum === 1 ? "1 left" : `${stockNum} left`}</div>}
      </div>

      <div style={{ padding: "0 6px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h4 style={productCardStyles.gridTitle} onClick={onClick}>{name}</h4>
        {unit && <span style={productCardStyles.gridUnit}>{unit}</span>}
        {hasStrike && (
          <span style={productCardStyles.discountTag}>{discountPct}% OFF</span>
        )}
      </div>

      <div style={productCardStyles.priceRow}>
        <div style={productCardStyles.priceWrap}>
          <p style={productCardStyles.price}>
            {price !== null ? `₹${formatPrice(price)}` : "Unavailable"}
          </p>
          {hasStrike && <span style={productCardStyles.mrp}>₹{formatPrice(mrp)}</span>}
        </div>

        <div style={{ width: "100%", marginTop: "6px" }}>
          {outOfStock ? (
            <span style={productCardStyles.outOfStockText}>Out of Stock</span>
          ) : cartItem ? (
            <div style={productCardStyles.qtyBox} className="mil-qty-box">
              <button
                style={productCardStyles.btn}
                className="mil-press"
                disabled={actionPending || addPending}
                onClick={() => onUpdateQty(cartItem.id, "decrease")}
              >−</button>
              <span
                style={productCardStyles.qty}
                className="mil-qty-pulse"
                key={`${cartItem.id}-${cartItem.quantity}`}
              >
                {cartItem.quantity}
              </span>
              <button
                style={{ ...productCardStyles.btn, ...((atStockLimit || addPending) ? productCardStyles.btnDisabled : {}) }}
                className="mil-press"
                disabled={actionPending || addPending || atStockLimit}
                onClick={() => onUpdateQty(cartItem.id, "increase")}
              >+</button>
            </div>
          ) : (
            <button
              style={productCardStyles.addBtn}
              className="mil-press"
              disabled={addPending}
              onClick={() => onAdd(product)}
            >
              {addPending ? "···" : "ADD"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// HORIZONTAL PRODUCT RAIL
// ==========================================
function ProductSection({
  title, loading, products, categoryId, cartItems, pendingIds,
  onAdd, onUpdateQty, onSeeAll, seeAllLabel, revealRef,
}) {
  return (
    <section ref={revealRef} className="sb-reveal">
      <div style={itemSectionStyles.head}>
        <div style={itemSectionStyles.titleRow}>
          <span style={itemSectionStyles.titleAccent} />
          <span style={styles.sectionTitle}>{title}</span>
        </div>
        <button style={itemSectionStyles.seeAllLink} className="sb-tap" onClick={onSeeAll}>
          See all <span style={{ fontSize: "15px", lineHeight: 1 }}>›</span>
        </button>
      </div>

      {loading ? (
        <div className="sb-scroll-x" style={itemSectionStyles.rail}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="sb-snap sb-shimmer" style={{ ...itemSectionStyles.railItem, ...itemSectionStyles.skeletonCard }} />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="sb-scroll-x" style={itemSectionStyles.rail}>
          {products.map((item, i) => {
            const cartItem = cartItems.find((c) => c.product_id === item.id && c.category === categoryId);
            return (
              <div key={item.id ?? i} className="sb-snap" style={itemSectionStyles.railItem}>
                <ProductCard
                  product={item}
                  cartItem={cartItem}
                  onAdd={(prod) => onAdd(prod, categoryId)}
                  onUpdateQty={onUpdateQty}
                  addPending={!!pendingIds[`add-${item.id}`]}
                  actionPending={cartItem ? !!pendingIds[cartItem.id] : false}
                  onClick={onSeeAll}
                />
              </div>
            );
          })}

          <div className="sb-snap" style={itemSectionStyles.railItem}>
            <button style={itemSectionStyles.railSeeAllCard} className="sb-tap" onClick={onSeeAll}>
              <span style={itemSectionStyles.railSeeAllCircle}>›</span>
              <span style={itemSectionStyles.railSeeAllText}>{seeAllLabel}</span>
            </button>
          </div>
        </div>
      ) : (
        <p style={itemSectionStyles.emptyText}>No {title.toLowerCase()} available right now.</p>
      )}
    </section>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function MobileHome() {
  const [activeTab, setActiveTab] = useState("home");
  const [showLogin, setShowLogin] = useState(false);
  
  // Cart State
  const [cartItems, setCartItems] = useState([]);
  const [cartRefresh, setCartRefresh] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [pendingIds, setPendingIds] = useState({});

  const [search, setSearch] = useState("");
  const [headerHeight, setHeaderHeight] = useState(130);
  
  // Item States
  const [vegProducts, setVegProducts] = useState([]);
  const [vegLoading, setVegLoading] = useState(true);
  
  const [flowerProducts, setFlowerProducts] = useState([]);
  const [flowerLoading, setFlowerLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const revealRef = useRevealOnScroll();
  const user_id = safeGet("phone", "guest");

  const isLoggedIn = () => safeGet("isLoggedIn") === "true";

  useEffect(() => {
    const uniqueItems = [...new Set(cartItems.map(item => item.product_id))];
    setCartCount(uniqueItems.length);
  }, [cartItems]);

  const loadCart = useCallback(async () => {
    if (!isLoggedIn() || user_id === "guest") {
      setCartItems([]);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/cart/${user_id}`);
      if (res.data.success) {
        setCartItems(res.data.cart);
      } else setCartItems([]);
    } catch (err) { console.log("Load cart error:", err); }
  }, [user_id]);

  const loadVegetables = useCallback(async () => {
    setVegLoading(true);
    try {
      const res = await axios.get(`${API_URL}/items/vegetables`);
      if (res.data.success) setVegProducts(res.data.items || []);
      else setVegProducts([]);
    } catch (err) {
      console.log("Load vegetables error:", err);
      setVegProducts([]);
    } finally {
      setVegLoading(false);
    }
  }, []);

  const loadFlowers = useCallback(async () => {
    setFlowerLoading(true);
    try {
      const res = await axios.get(`${API_URL}/items/flowers`);
      if (res.data.success) setFlowerProducts(res.data.items || []);
      else setFlowerProducts([]);
    } catch (err) {
      console.log("Load flowers error:", err);
      setFlowerProducts([]);
    } finally {
      setFlowerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (location.state?.targetTab) {
      setActiveTab(location.state.targetTab);
      window.history.replaceState({}, document.title);
    }
    loadCart();
    loadVegetables();
    loadFlowers();
  }, [location, loadCart, loadVegetables, loadFlowers]);

  const logout = () => { safeClear(); setActiveTab("home"); window.location.reload(); };
  const goSearch = () => { if (search.trim() !== "") navigate(`/search?q=${encodeURIComponent(search.trim())}`); };

  const notifyCartUpdate = () => {
    window.dispatchEvent(new Event("cartUpdated"));
    setCartRefresh(prev => prev + 1);
    loadCart();
  };

  const addToCart = async (product, categoryId = "vegetables") => {
    if (!isLoggedIn() || user_id === "guest") {
      setShowLogin(true);
      return;
    }
    const pendingKey = `add-${product.id}`;
    if (pendingIds[pendingKey]) return; 
    setPendingIds((p) => ({ ...p, [pendingKey]: true }));

    const tempId = `temp-${product.id}`;
    setCartItems((prev) => [...prev, { id: tempId, product_id: product.id, category: categoryId, quantity: 1 }]);
    window.dispatchEvent(new Event("cartUpdated"));

    try {
      const res = await axios.post(`${API_URL}/cart/add`, { user_id, product_id: product.id, category: categoryId });
      const real = res.data?.cartItem;
      setCartItems((prev) => prev.map((i) => (i.id === tempId
        ? { ...i, id: real ? real.id : i.id, quantity: real ? real.quantity : i.quantity }
        : i)));
    } catch (err) {
      setCartItems((prev) => prev.filter((i) => i.id !== tempId));
      alert("Couldn't add item — please try again.");
    } finally {
      window.dispatchEvent(new Event("cartUpdated"));
      setPendingIds((p) => {
        const next = { ...p };
        delete next[pendingKey];
        return next;
      });
    }
  };

  const updateQty = async (cart_id, action) => {
    if (typeof cart_id === "string" && cart_id.startsWith("temp-")) return; 
    if (pendingIds[cart_id]) return; 
    const item = cartItems.find((i) => i.id === cart_id);
    if (!item) return;
    const prevSnapshot = cartItems;
    setPendingIds((p) => ({ ...p, [cart_id]: true }));

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
    } catch (err) {
      setCartItems(prevSnapshot);
    } finally {
      window.dispatchEvent(new Event("cartUpdated"));
      setPendingIds((p) => {
        const next = { ...p };
        delete next[cart_id];
        return next;
      });
    }
  };

  const openWhatsAppSupport = () => {
    window.open(`https://wa.me/916301912803?text=${encodeURIComponent("Hi, I need help with my ShiperBox order.")}`, "_blank");
  };

  const getInitials = () => {
    const name = safeGet("name");
    if (!name) return "G";
    const tokens = name.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return "G";
    return tokens.map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  };

  const contentPaddingTop = activeTab === "cart" ? "0px" : `${headerHeight}px`;

  return (
    <div style={styles.appContainer}>
      <GlobalMobileStyles />
      <style>{blinkitAnimations}</style>

      <MobileHeader
        searchValue={search}
        setSearchValue={setSearch}
        onSearch={goSearch}
        showLocation={activeTab === "home"}
        showLogo={activeTab === "home"}
        activeTab={activeTab}
        isLoggedIn={isLoggedIn()}
        onLoginClick={() => setShowLogin(true)}
        onHeightChange={activeTab !== "cart" ? setHeaderHeight : undefined}
      />

      <div style={{ ...styles.scrollArea, paddingTop: contentPaddingTop }}>

        {activeTab === "home" && (
          <>
            {/* ONLY CATEGORY STRIP IS STICKY NOW */}
            <div
              style={{
                position: "sticky",
                top: `${headerHeight}px`,
                zIndex: 5,
                backgroundColor: COLOR.mist
              }}
            >
              <div style={stripStyles.heroBand}>
                <div className="sb-scroll-x" style={stripStyles.row}>
                  {CATEGORIES.map(cat => (
                    <CategoryStripItem
                      key={cat.key}
                      label={cat.label}
                      tabIcon={cat.tabIcon}
                      active={location.pathname === cat.path}
                      onClick={() => navigate(cat.path)}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* UNFIXED ADS SECTION */}
            <MobileAdsSlider />

            <div style={styles.categorySectionHead} ref={revealRef} className="sb-reveal">
              <div style={itemSectionStyles.titleRow}>
                <span style={itemSectionStyles.titleAccent} />
                <span style={styles.sectionTitle}>Shop by category</span>
              </div>
              <span style={styles.categoryCountChip}>{CATEGORIES.length} to explore</span>
            </div>

            {/* BIG & NEAT CATEGORY CARDS */}
            <div style={styles.categoryGridTop}>
              {CATEGORIES.slice(0, 2).map((cat, i) => (
                <CategoryTile
                  key={cat.key}
                  index={i}
                  badge={cat.key === "garland" ? "Trending" : null}
                  label={cat.label}
                  image={cat.image}
                  icon={cat.icon}
                  onClick={() => navigate(cat.path)}
                  imgAspectRatio="1.6 / 1"
                  size="lg"
                />
              ))}
            </div>

            <div style={styles.categoryGridBottom}>
              {CATEGORIES.slice(2).map((cat, i) => (
                <CategoryTile
                  key={cat.key}
                  index={i + 2}
                  label={cat.label}
                  image={cat.image}
                  icon={cat.icon}
                  onClick={() => navigate(cat.path)}
                  imgAspectRatio="1"
                  size="md"
                />
              ))}
            </div>

            {/* SECOND AD SECTION */}
            <div style={styles.adSectionWrap}>
              <MobileAdsSlider />
            </div>

            <ProductSection
              title="Vegetables"
              loading={vegLoading}
              products={vegProducts.slice(0, 10)}
              categoryId="vegetables"
              cartItems={cartItems}
              pendingIds={pendingIds}
              onAdd={addToCart}
              onUpdateQty={updateQty}
              onSeeAll={() => navigate("/category/vegetables")}
              seeAllLabel="See all vegetables"
              revealRef={revealRef}
            />

            <ProductSection
              title="Flowers"
              loading={flowerLoading}
              products={flowerProducts.slice(0, 10)}
              categoryId="flowers"
              cartItems={cartItems}
              pendingIds={pendingIds}
              onAdd={addToCart}
              onUpdateQty={updateQty}
              onSeeAll={() => navigate("/category/flowers")}
              seeAllLabel="See all flowers"
              revealRef={revealRef}
            />

            <div style={styles.brandFooter} ref={revealRef} className="sb-reveal">
              <div style={styles.brandDivider} />
              <div style={styles.brandLogoRow}>
                <span style={styles.brandShiper}>Shiper</span>
                <span style={styles.brandBox}>box</span>
              </div>
              <p style={styles.brandTagline}>Flowers, Vegetables &amp; Garlands, delivered with love</p>
              <p style={styles.brandSubline}>Fastest florist &amp; courier partner</p>
            </div>
          </>
        )}

        {/* ... (CART & PROFILE TABS REMAIN UNCHANGED) ... */}
        {activeTab === "cart" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {isLoggedIn() ? (
              <MobileCart user_id={user_id} refresh={cartRefresh} onCartChange={notifyCartUpdate} onBack={() => setActiveTab("home")} />
            ) : (
              <div style={styles.centerPrompt}>
                <h2 style={{ fontFamily: FONT.display, color: COLOR.ink }}>Login to view your cart</h2>
                <button style={styles.loginBtn} className="sb-tap" onClick={() => setShowLogin(true)}>Login to Continue</button>
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div style={userProfileStyles.container}>
            {isLoggedIn() ? (
              <>
                <div style={userProfileStyles.profileCard} className="mil-profile-card">
                  <div style={userProfileStyles.avatar}>{getInitials()}</div>
                  <div style={userProfileStyles.profileTextWrap}>
                    <h3 style={userProfileStyles.accountTitle}>{safeGet("name", "My Account")}</h3>
                    <p style={userProfileStyles.accountEmail}>{safeGet("phone")}</p>
                  </div>
                </div>

                <div style={userProfileStyles.menuBox}>
                  <button style={userProfileStyles.menuBtn} className="sb-tap mil-menu-btn" onClick={() => navigate("/my-orders")}>
                    <span style={userProfileStyles.menuIcon}><Icons.Orders size={18} color="currentColor" /></span>
                    My Orders
                    <span style={userProfileStyles.menuChevron}>›</span>
                  </button>

                  <button style={userProfileStyles.menuBtn} className="sb-tap mil-menu-btn" onClick={() => navigate("/my-address")}>
                    <span style={userProfileStyles.menuIcon}><Icons.Address size={18} color="currentColor" /></span>
                    My Address
                    <span style={userProfileStyles.menuChevron}>›</span>
                  </button>

                  <button style={userProfileStyles.menuBtn} className="sb-tap mil-menu-btn" onClick={openWhatsAppSupport}>
                    <span style={userProfileStyles.menuIcon}><Icons.Help size={18} color="currentColor" /></span>
                    Need Help
                    <span style={userProfileStyles.menuChevron}>›</span>
                  </button>
                  <button style={userProfileStyles.menuBtn} className="sb-tap mil-menu-btn" onClick={() => navigate("/about-us")}>
                    <span style={userProfileStyles.menuIcon}><Icons.About size={18} color="currentColor" /></span>
                    About Us
                    <span style={userProfileStyles.menuChevron}>›</span>
                  </button>
                  <button style={userProfileStyles.logoutBtn} className="sb-tap mil-logout-btn" onClick={logout}>
                    <span style={userProfileStyles.logoutIcon}><Icons.Logout size={18} color="currentColor" /></span>
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div style={userProfileStyles.centerPrompt}>
                <div style={userProfileStyles.guestAvatar}><Icons.User size={32} color="currentColor" /></div>
                <h2 style={userProfileStyles.guestTitle}>Hello Guest</h2>
                <p style={userProfileStyles.guestSubtitle}>Log in to see your orders & addresses</p>
                <button style={userProfileStyles.loginBtn} className="sb-tap" onClick={() => setShowLogin(true)}>Login / Sign Up</button>
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab !== "cart" && (
        <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} cartCount={cartCount} />
      )}

      {showLogin && (
        <MobileLogin
          onClose={() => setShowLogin(false)}
          onLoginSuccess={() => { setShowLogin(false); loadCart(); }}
        />
      )}
    </div>
  );
}

// ==========================================
// CSS KEYFRAMES
// ==========================================
const blinkitAnimations = `
  @keyframes mil-fadeInUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes mil-pulse {
    0% { transform: scale(1); }
    40% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
  .mil-card { animation: mil-fadeInUp 0.36s cubic-bezier(0.22, 1, 0.36, 1) both; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease; }
  .mil-card:active { transform: scale(0.97); box-shadow: 0 2px 6px rgba(15,23,42,0.06); }
  .mil-press { transition: transform 0.12s ease, filter 0.12s ease; }
  .mil-press:active:not(:disabled) { transform: scale(0.92); filter: brightness(0.96); }
  .mil-press:disabled { cursor: not-allowed; }
  .mil-qty-box { transition: background-color 0.2s ease; }
  .mil-qty-pulse { animation: mil-pulse 0.26s ease; }
  .mil-menu-btn:active { background-color: ${COLOR.primarySoft} !important; }
  .mil-logout-btn:active { background-color: ${COLOR.errorSoft} !important; }
  .mil-profile-card { transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.24s ease; }
  @media (prefers-reduced-motion: reduce) {
    .mil-card, .mil-press, .mil-qty-pulse {
      animation: none !important;
      transition: none !important;
    }
  }
`;

// ==========================================
// STYLES
// ==========================================
const BRAND = "#7fb8ff";

const productCardStyles = {
  card: { width: "100%", backgroundColor: COLOR.paper, padding: 0, borderRadius: RADIUS.md, border: `1px solid ${COLOR.line}`, boxShadow: SHADOW.rest, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" },
  imgWrapper: { width: "100%", aspectRatio: "1", overflow: "hidden", borderRadius: `${RADIUS.md} ${RADIUS.md} 0 0`, marginBottom: "8px", backgroundColor: "#eef1f5", position: "relative", cursor: "pointer" },
  image: { width: "100%", height: "100%", objectFit: "cover", transition: `transform 0.35s ${EASE}` },
  imgFallback: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", backgroundColor: "#eef1f5", color: "#aab3c0", fontFamily: FONT.display, fontWeight: 800 },
  cardOutOfStock: { opacity: 0.6 },
  imageOutOfStock: { filter: "grayscale(1)" },
  outOfStockBadge: { position: "absolute", top: "4px", left: "4px", backgroundColor: "rgba(15,23,42,0.78)", color: "#fff", fontSize: "8px", fontWeight: "bold", padding: "3px 5px", borderRadius: RADIUS.sm, textTransform: "uppercase" },
  outOfStockText: { fontSize: "10px", fontWeight: "bold", color: COLOR.error, paddingRight: "2px" },
  lowStockBadge: { position: "absolute", top: "4px", left: "4px", backgroundColor: "#ff6b35", color: "#fff", fontSize: "8px", fontWeight: "bold", padding: "3px 5px", borderRadius: RADIUS.sm, letterSpacing: "0.2px", boxShadow: "0 2px 6px rgba(255,107,53,0.4)" },
  btnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  gridTitle: { fontSize: "11.5px", fontWeight: "700", color: COLOR.ink, margin: "0 0 2px", lineHeight: 1.25, cursor: "pointer", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "28px" },
  gridUnit: { fontSize: "9.5px", color: COLOR.muted, margin: "0 0 6px", fontWeight: "500", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  
  priceRow: { display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-start", marginTop: "auto", padding: "0 6px 8px", gap: "6px" },
  priceWrap: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px", minWidth: 0 },
  price: {
    fontWeight: "800", fontSize: "12.5px", color: COLOR.ink, margin: 0, fontFamily: FONT.body, whiteSpace: "nowrap"
  },
  mrp: {
    fontSize: "9.5px", color: COLOR.muted, textDecoration: "line-through", fontWeight: "500"
  },
  discountTag: {
    marginBottom: "4px", alignSelf: "flex-start", backgroundColor: "#E8F8EC", color: "#1D8A3D",
    fontSize: "9px", fontWeight: "800", padding: "2px 5px", borderRadius: RADIUS.sm,
  },
  addBtn: {
    width: "100%", height: "28px", padding: "0", backgroundColor: BRAND, color: "#fff", border: "none",
    borderRadius: RADIUS.md, fontWeight: "800", fontSize: "11px",
    cursor: "pointer", boxShadow: "0 2px 6px rgba(127,184,255,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  qtyBox: {
    width: "100%", height: "28px", boxSizing: "border-box",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    backgroundColor: BRAND, borderRadius: RADIUS.md, padding: "0 4px",
    boxShadow: "0 2px 6px rgba(127,184,255,0.4)", flexShrink: 0,
  },
  btn: { border: "none", background: "none", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "16px", width: "24px", height: "24px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  qty: { fontSize: "12.5px", fontWeight: "700", color: "#fff", minWidth: "16px", textAlign: "center", display: "inline-block" },
};

const stripStyles = {
  heroBand: {
    background: `linear-gradient(180deg, ${COLOR.primary} 0%, ${COLOR.primaryDark} 100%)`,
    borderRadius: `0 0 ${RADIUS.lg} ${RADIUS.lg}`,
    boxShadow: "0 4px 12px rgba(107,170,245,0.18)",
  },
  row: { gap: "2px", padding: "7px 4px 8px" },
  item: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", cursor: "pointer",
    flex: "1 0 19%", minWidth: "64px",
    padding: "4px 2px 5px", borderRadius: RADIUS.sm,
    transition: `transform 0.28s ${EASE_SPRING}, background-color 0.22s ${EASE}`,
  },
  label: { fontFamily: FONT.body, fontSize: "9.5px", textAlign: "center", lineHeight: 1.1, whiteSpace: "normal", wordBreak: "normal", overflowWrap: "break-word", transition: `color 0.2s ${EASE}` },
  underline: { height: "2px", borderRadius: RADIUS.pill, marginTop: "0px", transition: `width 0.28s ${EASE_SPRING}` },
};

// ==========================================
// MATCHING UI FOR CATEGORY TILES
// ==========================================
const tileStyles = {
  card: {
    display: "flex", flexDirection: "column", cursor: "pointer",
    borderRadius: "14px", overflow: "hidden", backgroundColor: "#ffffff", 
    padding: "6px",
    transition: `transform 0.24s ${EASE_SPRING}, box-shadow 0.24s ${EASE}`,
    position: "relative",
    border: "none",
  },
  imgWrapper: {
    width: "100%", borderRadius: "10px", overflow: "hidden", backgroundColor: COLOR.mist,
    display: "flex", justifyContent: "center", alignItems: "center",
    position: "relative"
  },
  image: { width: "100%", height: "100%", objectFit: "cover", transition: `transform 0.4s ${EASE}` },
  iconFallback: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  labelWrapper: {
    padding: "10px 4px 6px", display: "flex", justifyContent: "center", alignItems: "center"
  },
  label: {
    fontFamily: FONT.display, fontWeight: 700, color: COLOR.ink, textAlign: "center", lineHeight: 1.2
  },
  ribbon: {
    position: "absolute", top: "6px", right: "6px", zIndex: 1,
    backgroundColor: "#ff4d6d", color: "#ffffff", 
    fontFamily: FONT.body, fontSize: "10px", fontWeight: "800",
    padding: "4px 8px", borderRadius: "12px",
    boxShadow: "0 2px 6px rgba(255,77,109,0.25)",
  },
};

const itemSectionStyles = {
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px clamp(12px, 4vw, 24px) 12px", gap: "10px" },
  titleRow: { display: "flex", alignItems: "center", gap: "8px" },
  titleAccent: { width: "4px", height: "16px", borderRadius: RADIUS.pill, backgroundColor: "#5b95ff", flexShrink: 0 },
  rail: { gap: "10px", padding: "0 clamp(12px, 4vw, 24px) 22px", alignItems: "stretch" },
  railItem: { flex: "0 0 142px", maxWidth: "142px", display: "flex" },
  skeletonCard: { borderRadius: RADIUS.md, border: `1px solid ${COLOR.line}`, aspectRatio: "0.72" },
  emptyText: { padding: "0 clamp(12px, 4vw, 24px) 8px", fontFamily: FONT.body, fontSize: "12.5px", color: COLOR.muted },
  seeAllLink: {
    background: "transparent", border: "none", padding: "4px 2px", cursor: "pointer",
    color: COLOR.primaryDark, fontFamily: FONT.body, fontSize: "13px", fontWeight: 700,
    display: "flex", alignItems: "center", gap: "3px", whiteSpace: "nowrap",
  },
  railSeeAllCard: {
    width: "100%", backgroundColor: COLOR.paper, border: `1px dashed ${COLOR.primary}`, borderRadius: RADIUS.md,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px",
    cursor: "pointer", boxShadow: SHADOW.rest, padding: "12px",
  },
  railSeeAllCircle: {
    width: "38px", height: "38px", borderRadius: "50%", background: COLOR.primarySoft, color: COLOR.primaryDark,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", lineHeight: 1, fontWeight: 700,
  },
  railSeeAllText: { fontFamily: FONT.body, fontSize: "12px", fontWeight: 700, color: COLOR.primaryDark, textAlign: "center" },
};

const userProfileStyles = {
  container: { display: "flex", flexDirection: "column", flex: 1, padding: "24px 16px 40px", backgroundColor: COLOR.mist, boxSizing: "border-box" },
  profileCard: { backgroundColor: COLOR.paper, border: `1px solid ${COLOR.line}`, borderRadius: RADIUS.md, padding: "18px 16px", display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" },
  avatar: { width: "52px", height: "52px", borderRadius: "50%", backgroundColor: COLOR.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "800", color: COLOR.primaryDark, flexShrink: 0, fontFamily: FONT.display },
  profileTextWrap: { textAlign: "left", overflow: "hidden", minWidth: 0 },
  accountTitle: { margin: "0 0 2px", fontSize: "16px", fontWeight: "700", color: COLOR.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: FONT.display },
  accountEmail: { margin: 0, color: COLOR.muted, fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  menuBox: { backgroundColor: COLOR.paper, border: `1px solid ${COLOR.line}`, borderRadius: RADIUS.md, padding: "4px", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: SHADOW.rest },
  menuBtn: { display: "flex", alignItems: "center", gap: "14px", padding: "14px", border: "none", borderRadius: RADIUS.sm, borderBottom: `1px solid ${COLOR.line}`, background: "transparent", color: COLOR.ink, fontWeight: "600", fontSize: "14px", textAlign: "left", cursor: "pointer", width: "100%", boxSizing: "border-box", transition: `background-color 0.18s ${EASE}` },
  menuIcon: { width: "34px", height: "34px", borderRadius: RADIUS.sm, background: COLOR.primarySoft, color: COLOR.primaryDark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  menuChevron: { marginLeft: "auto", color: COLOR.muted, fontSize: "16px" },
  logoutBtn: { display: "flex", alignItems: "center", gap: "14px", padding: "14px", border: "none", borderRadius: RADIUS.sm, background: "transparent", color: COLOR.error, fontWeight: "700", fontSize: "14px", textAlign: "left", cursor: "pointer", width: "100%", boxSizing: "border-box", transition: `background-color 0.18s ${EASE}` },
  logoutIcon: { width: "34px", height: "34px", borderRadius: RADIUS.sm, background: "transparent", color: COLOR.error, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  centerPrompt: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 20px", background: COLOR.paper, border: `1px solid ${COLOR.line}`, borderRadius: RADIUS.md, flex: 1 },
  guestAvatar: { width: "64px", height: "64px", borderRadius: "50%", background: COLOR.primarySoft, color: COLOR.primaryDark, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  guestTitle: { margin: "0 0 6px", fontSize: "17px", fontWeight: "700", color: COLOR.ink, fontFamily: FONT.display },
  guestSubtitle: { margin: "0 0 20px", fontSize: "13px", color: COLOR.muted },
  loginBtn: { backgroundColor: COLOR.primaryDark, color: "#fff", border: "none", padding: "13px 24px", borderRadius: RADIUS.md, width: "100%", fontWeight: "700", fontSize: "14px", cursor: "pointer", boxShadow: SHADOW.cta, transition: `transform 0.18s ${EASE_SPRING}` }
};

const styles = {
  appContainer: { display: "flex", flexDirection: "column", backgroundColor: "#f2f5f9", minHeight: "100vh", fontFamily: FONT.body },
  scrollArea: { display: "flex", flexDirection: "column", flex: 1, paddingBottom: `calc(${NAV_HEIGHT}px + 24px + env(safe-area-inset-bottom, 0px))`, boxSizing: "border-box" },
  categorySectionHead: { padding: "20px clamp(12px, 4vw, 24px) 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" },
  categoryCountChip: {
    fontFamily: FONT.body, fontSize: "11px", fontWeight: "700", color: "#5b95ff",
    backgroundColor: "#e8f0ff", padding: "5px 12px", borderRadius: "14px", whiteSpace: "nowrap",
  },
  adSectionWrap: { padding: "12px 0 10px" },
  sectionTitle: { fontFamily: FONT.display, fontSize: "16px", fontWeight: 800, color: COLOR.ink },
  categoryGridTop: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", padding: "0 clamp(12px, 4vw, 24px) 12px" },
  categoryGridBottom: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", padding: "0 clamp(12px, 4vw, 24px) 6px" },
  brandFooter: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "26px 24px 20px" },
  brandDivider: { width: "36px", height: "2px", backgroundColor: COLOR.line, marginBottom: "16px", borderRadius: RADIUS.pill },
  brandLogoRow: { display: "flex", alignItems: "baseline", justifyContent: "center", lineHeight: 0.9, flexWrap: "wrap" },
  brandShiper: { fontSize: "clamp(30px, 10vw, 44px)", fontWeight: "800", letterSpacing: "-1.2px", color: COLOR.primaryDark, fontFamily: FONT.display },
  brandBox: { fontSize: "clamp(30px, 10vw, 44px)", fontWeight: "800", letterSpacing: "-1.2px", color: COLOR.ink, fontFamily: FONT.display, marginLeft: "4px" },
  brandTagline: { margin: "10px 0 4px", fontSize: "13px", fontWeight: "600", color: COLOR.ink, letterSpacing: "0.1px" },
  brandSubline: { margin: 0, fontSize: "12px", fontWeight: "500", color: COLOR.muted, letterSpacing: "0.2px" },
  centerPrompt: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 20px", flex: 1, gap: "16px" },
  loginBtn: { backgroundColor: COLOR.primaryDark, color: "white", border: "none", padding: "12px 24px", borderRadius: RADIUS.md, width: "100%", fontWeight: "bold", cursor: "pointer", boxShadow: SHADOW.cta, transition: `transform 0.18s ${EASE_SPRING}` },
};