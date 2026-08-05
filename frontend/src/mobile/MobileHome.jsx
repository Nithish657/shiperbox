import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import MobileLogin from "./Mobilelogin";
import MobileAdsSlider from "./MobileAdsSlider";
import MobileCart from "./MobileCart";
import MobileHeader from "./MobileHeader";
import MobileBottomNav, { NAV_HEIGHT } from "./MobileBottomNav";
import axios from "axios";
import { API_URL } from "../api";

// Category images are served by the backend from /uploads/
const CATEGORY_IMG_BASE = `${API_URL}/uploads`;

/**
 * FIX NOTES for this file:
 * 1. paddingTop under the fixed header used to be hardcoded ("105px" /
 *    "75px") per tab. That only worked as long as the header rendered at
 *    exactly that height — the moment the address line wrapped, the
 *    device used a larger system font, or the screen was very narrow,
 *    content would render partly hidden underneath the header. The
 *    header now reports its *actual* rendered height (see MobileHeader's
 *    onHeightChange) and we pad by that real number instead of a guess.
 * 2. Category card images used fixed pixel heights (198px / 85px / 120px)
 *    while the card width shrinks with the screen. On a narrow phone
 *    (~320–360px) that produced very tall, skinny, oddly-cropped cards.
 *    Images now use `aspect-ratio` so they scale proportionally with the
 *    card's actual width on any screen.
 * 3. Bottom padding now accounts for env(safe-area-inset-bottom) so
 *    content doesn't end up hidden behind the home-indicator area /
 *    bottom nav on notched phones.
 * 4. Typo fixes in the footer tagline ("Vegitables" -> "Vegetables",
 *    missing spaces around "&").
 * 5. getInitials() could produce garbage ("undefined" fragments) on
 *    names with double spaces; now filters empty tokens.
 * 6. CategoryCard's pressed/scale state could get stuck "pressed" if a
 *    touch was interrupted (e.g. the user started scrolling); added
 *    onTouchCancel to always release it.
 * 7. Broken category images now fall back to a placeholder tile instead
 *    of leaving a blank hole with just a floating label.
 * 8. localStorage reads/writes wrapped in try/catch so private-browsing
 *    mode can't crash the page.
 * 9. Removed dead/unused styles (top-level loginBox/overlay/closeBtn —
 *    superseded by MobileLogin's own sheet — and a duplicate centerPrompt
 *    definition) to keep the stylesheet honest and easier to maintain.
 */

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
  )
};

// ==========================================
// DATA
// ==========================================
const CATEGORIES = [
  { key: "vegetables", label: "VEGETABLES", image: `${CATEGORY_IMG_BASE}/veggies.jpg`, path: "/category/vegetables", type: "tall" },
  { key: "flowers", label: "FLOWERS", image: `${CATEGORY_IMG_BASE}/flowers.jpg`, path: "/category/flowers", type: "flower" },
  { key: "garland", label: "CUSTOM FLOWERS GARLAND", image: `${CATEGORY_IMG_BASE}/flowergarland.jpg`, path: "/m-garland", type: "garland" },
  { key: "courier", label: "1 DAY COURIER SERVICE", image: `${CATEGORY_IMG_BASE}/1daycor.jpg`, path: "/courier", type: "full" }
];

// ==========================================
// COMPONENTS
// ==========================================
function CategoryCard({ label, image, onClick, type }) {
  const [pressed, setPressed] = useState(false);
  const [broken, setBroken] = useState(false);
  let s;
  let gridStyles = {};

  if (type === "tall") { s = tallStyles; gridStyles = layoutConfig.tallPlacement; }
  else if (type === "full") { s = fullStyles; gridStyles = layoutConfig.fullPlacement; }
  else if (type === "flower") { s = flowerStyles; gridStyles = layoutConfig.flowerPlacement; }
  else if (type === "garland") { s = garlandStyles; gridStyles = layoutConfig.garlandPlacement; }

  const release = () => setPressed(false);

  return (
    <div
      style={{ ...s.card, ...gridStyles, transform: pressed ? "scale(0.98)" : "scale(1)" }}
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
      <p style={s.text}>{label}</p>
      <div style={s.imageWrapper}>
        {broken ? (
          <div style={s.imageFallback}>{label}</div>
        ) : (
          <img src={image} alt={label} style={s.image} loading="lazy" onError={() => setBroken(true)} />
        )}
      </div>
    </div>
  );
}

// ==========================================
// CONFIGURATIONS
// ==========================================
const cardConfig = {
  borderColor: "#ffffff", cardBgColor: "#fff", textColor: "#222", borderWidth: "2px", borderRadius: "10px",
  // Aspect ratios (width / height) replace fixed pixel heights so cards
  // scale correctly with the actual column width on any phone.
  tallAspect: "0.78", flowerAspect: "1.8", garlandAspect: "1.8", fullAspect: "2.75",
  fontTall: "10px", fontPair: "10px", fontFull: "10px",
  textMarginBase: "0 0 6px 0", textMarginPair: "0 0 4px 0", transitionSpeed: "transform 0.12s ease-out"
};

const layoutConfig = {
  gridColumns: "1fr 1fr", gridGap: "5px 25px", gridPadding: "40px clamp(16px, 8vw, 35px)", gridAlignItems: "start",
  tallPlacement: { gridColumn: "1", gridRow: "span 2" }, flowerPlacement: { gridColumn: "2", gridRow: "auto" },
  garlandPlacement: { gridColumn: "2", gridRow: "auto" }, fullPlacement: { gridColumn: "1 / -1", gridRow: "auto" }
};

const fallbackTileStyle = {
  width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
  backgroundColor: "#f0f4fa", color: "#8ec5fc", fontWeight: "700", fontSize: "10px", textAlign: "center", padding: "6px", boxSizing: "border-box"
};

const tallStyles = {
  card: { margin: "0", cursor: "pointer", transition: cardConfig.transitionSpeed, display: "flex", flexDirection: "column", height: "auto" },
  text: { margin: cardConfig.textMarginBase, fontSize: cardConfig.fontTall, fontWeight: "700", letterSpacing: "0.3px", textAlign: "center", color: cardConfig.textColor },
  imageWrapper: { width: "100%", aspectRatio: cardConfig.tallAspect, borderRadius: cardConfig.borderRadius, overflow: "hidden", border: `${cardConfig.borderWidth} solid ${cardConfig.borderColor}`, backgroundColor: cardConfig.cardBgColor },
  image: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  imageFallback: fallbackTileStyle,
};

const flowerStyles = {
  card: { margin: "3px", cursor: "pointer", transition: cardConfig.transitionSpeed, display: "flex", flexDirection: "column", height: "auto" },
  text: { margin: cardConfig.textMarginPair, fontSize: cardConfig.fontPair, fontWeight: "700", letterSpacing: "0.3px", textAlign: "center", color: cardConfig.textColor },
  imageWrapper: { width: "100%", aspectRatio: cardConfig.flowerAspect, borderRadius: cardConfig.borderRadius, overflow: "hidden", border: `${cardConfig.borderWidth} solid ${cardConfig.borderColor}`, backgroundColor: cardConfig.cardBgColor },
  image: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  imageFallback: fallbackTileStyle,
};

const garlandStyles = {
  card: { margin: "0 0 3px", cursor: "pointer", transition: cardConfig.transitionSpeed, display: "flex", flexDirection: "column", height: "auto" },
  text: { margin: cardConfig.textMarginPair, fontSize: cardConfig.fontPair, fontWeight: "700", letterSpacing: "0.3px", textAlign: "center", color: cardConfig.textColor },
  imageWrapper: { width: "100%", aspectRatio: cardConfig.garlandAspect, borderRadius: cardConfig.borderRadius, overflow: "hidden", border: `${cardConfig.borderWidth} solid ${cardConfig.borderColor}`, backgroundColor: cardConfig.cardBgColor },
  image: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  imageFallback: fallbackTileStyle,
};

const fullStyles = {
  card: { margin: "20px 0 0 0", cursor: "pointer", transition: cardConfig.transitionSpeed, display: "flex", flexDirection: "column", height: "auto" },
  text: { margin: cardConfig.textMarginBase, fontSize: cardConfig.fontFull, fontWeight: "700", letterSpacing: "0.3px", textAlign: "center", color: cardConfig.textColor },
  imageWrapper: { width: "100%", aspectRatio: cardConfig.fullAspect, borderRadius: cardConfig.borderRadius, overflow: "hidden", border: `${cardConfig.borderWidth} solid ${cardConfig.borderColor}`, backgroundColor: cardConfig.cardBgColor },
  image: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" },
  imageFallback: fallbackTileStyle,
};

// ==========================================
// USER PROFILE STYLES
// ==========================================
const userProfileStyles = {
  container: { display: "flex", flexDirection: "column", flex: 1, padding: "50px 16px 40px", backgroundColor: "#f5f5f5", boxSizing: "border-box" },
  profileCard: { background: "#8ec5fc", borderRadius: "20px", padding: "28px 20px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 10px 25px rgba(138, 191, 221, 0.25)", marginBottom: "20px" },
  avatar: { width: "64px", height: "64px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "800", color: "#fff", flexShrink: 0 },
  profileTextWrap: { textAlign: "left", overflow: "hidden", minWidth: 0 },
  accountTitle: { margin: "0 0 4px", fontSize: "18px", fontWeight: "700", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  accountEmail: { margin: 0, color: "rgba(255,255,255,0.85)", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  menuBox: { background: "#fff", borderRadius: "16px", padding: "6px", display: "flex", flexDirection: "column", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden" },
  menuBtn: { display: "flex", alignItems: "center", gap: "14px", padding: "15px 14px", border: "none", borderBottom: "1px solid #f0f0f0", background: "transparent", color: "#222", fontWeight: "600", fontSize: "14px", textAlign: "left", cursor: "pointer", width: "100%", boxSizing: "border-box" },
  menuIcon: { width: "36px", height: "36px", borderRadius: "10px", background: "#f0f4fa", color: "#8ec5fc", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  menuChevron: { marginLeft: "auto", color: "#bbb", fontSize: "16px" },
  logoutBtn: { display: "flex", alignItems: "center", gap: "14px", padding: "16px 0 16px 20px", border: "none", background: "transparent", color: "#d32f2f", fontWeight: "700", fontSize: "14px", textAlign: "left", cursor: "pointer", width: "100%", boxSizing: "border-box" },
  logoutIcon: { width: "36px", height: "36px", borderRadius: "10px", background: "transparent", color: "#d32f2f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },

  centerPrompt: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 20px", background: "#fff", borderRadius: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", flex: 1 },
  guestAvatar: { width: "72px", height: "72px", borderRadius: "50%", background: "#eaf6ec", color: "#2f9e44", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  guestTitle: { margin: "0 0 6px", fontSize: "18px", fontWeight: "700", color: "#222" },
  guestSubtitle: { margin: "0 0 20px", fontSize: "13px", color: "#888" },
  loginBtn: { background: "#ff9f00", color: "white", border: "none", padding: "14px 24px", borderRadius: "10px", width: "100%", fontWeight: "700", fontSize: "14px", cursor: "pointer", boxShadow: "0 6px 16px rgba(255,159,0,0.3)" }
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function MobileHome() {
  const [activeTab, setActiveTab] = useState("home");
  const [showLogin, setShowLogin] = useState(false);
  const [cartRefresh, setCartRefresh] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [search, setSearch] = useState("");
  const [headerHeight, setHeaderHeight] = useState(130);
  const navigate = useNavigate();
  const location = useLocation();
  const user_id = safeGet("phone", "guest");

  const isLoggedIn = () => safeGet("isLoggedIn") === "true";

  const loadCart = useCallback(async () => {
    if (!isLoggedIn()) return setCartCount(0);
    try {
      const res = await axios.get(`${API_URL}/cart/${user_id}`);
      if (res.data.success) {
        const uniqueItems = [...new Set(res.data.cart.map(item => item.product_id))];
        setCartCount(uniqueItems.length);
      } else setCartCount(0);
    } catch (err) { console.log("Load cart error:", err); }
  }, [user_id]);

  useEffect(() => {
    if (location.state?.targetTab) {
      setActiveTab(location.state.targetTab);
      window.history.replaceState({}, document.title);
    }
    loadCart();
  }, [location, loadCart]);

  const logout = () => { safeClear(); setActiveTab("home"); window.location.reload(); };
  const goSearch = () => { if (search.trim() !== "") navigate(`/search?q=${encodeURIComponent(search.trim())}`); };

  const notifyCartUpdate = () => {
    window.dispatchEvent(new Event("cartUpdated"));
    setCartRefresh(prev => prev + 1);
    loadCart();
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

  // Cart tab manages its own header inside MobileCart, so no extra top pad.
  const contentPaddingTop = activeTab === "cart" ? "0px" : `${headerHeight}px`;

  return (
    <div style={styles.appContainer}>

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
            <MobileAdsSlider />
            <div style={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <CategoryCard key={cat.key} label={cat.label} image={cat.image} onClick={() => navigate(cat.path)} type={cat.type} />
              ))}
            </div>

            <div style={styles.brandFooter}>
              <div style={styles.brandDivider}>
                <span style={styles.brandDividerLine} />
                <span style={styles.brandDividerDot} />
                <span style={styles.brandDividerLine} />
              </div>

              <div style={styles.brandLogoRow}>
                <span style={styles.brandShiper}>Shiper</span>
                <span style={styles.brandBox}>box</span>
              </div>

              <p style={styles.brandTagline}>Flowers, Vegetables &amp; Garlands, delivered with love</p>
              <p style={styles.brandSubline}>Fastest florist &amp; courier partner</p>
            </div>
          </>
        )}

        {activeTab === "cart" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {isLoggedIn() ? (
              <MobileCart user_id={user_id} refresh={cartRefresh} onCartChange={notifyCartUpdate} onBack={() => setActiveTab("home")} />
            ) : (
              <div style={styles.centerPrompt}>
                <h2>Login to view your cart</h2>
                <button style={styles.loginBtn} onClick={() => setShowLogin(true)}>Login to Continue</button>
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div style={userProfileStyles.container}>
            {isLoggedIn() ? (
              <>
                <div style={userProfileStyles.profileCard}>
                  <div style={userProfileStyles.avatar}>{getInitials()}</div>
                  <div style={userProfileStyles.profileTextWrap}>
                    <h3 style={userProfileStyles.accountTitle}>{safeGet("name", "My Account")}</h3>
                    <p style={userProfileStyles.accountEmail}>{safeGet("phone")}</p>
                  </div>
                </div>

                <div style={userProfileStyles.menuBox}>
                  <button style={userProfileStyles.menuBtn} onClick={() => navigate("/my-orders")}>
                    <span style={userProfileStyles.menuIcon}><Icons.Orders size={20} color="currentColor" /></span>
                    My Orders
                    <span style={userProfileStyles.menuChevron}>›</span>
                  </button>

                  <button style={userProfileStyles.menuBtn} onClick={() => navigate("/my-address")}>
                    <span style={userProfileStyles.menuIcon}><Icons.Address size={20} color="currentColor" /></span>
                    My Address
                    <span style={userProfileStyles.menuChevron}>›</span>
                  </button>

                  <button style={userProfileStyles.menuBtn} onClick={openWhatsAppSupport}>
                    <span style={userProfileStyles.menuIcon}><Icons.Help size={20} color="currentColor" /></span>
                    Need Help
                    <span style={userProfileStyles.menuChevron}>›</span>
                  </button>
                  <button style={userProfileStyles.menuBtn} onClick={() => navigate("/about-us")}>
                    <span style={userProfileStyles.menuIcon}><Icons.About size={20} color="currentColor" /></span>
                    About Us
                    <span style={userProfileStyles.menuChevron}>›</span>
                  </button>
                  <button style={userProfileStyles.logoutBtn} onClick={logout}>
                    <span style={userProfileStyles.logoutIcon}><Icons.Logout size={20} color="currentColor" /></span>
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div style={userProfileStyles.centerPrompt}>
                <div style={userProfileStyles.guestAvatar}><Icons.User size={36} color="currentColor" /></div>
                <h2 style={userProfileStyles.guestTitle}>Hello Guest</h2>
                <p style={userProfileStyles.guestSubtitle}>Log in to see your orders & addresses</p>
                <button style={userProfileStyles.loginBtn} onClick={() => setShowLogin(true)}>Login / Sign Up</button>
              </div>
            )}
          </div>
        )}
      </div>

      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} cartCount={cartCount} />

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
// MAIN GENERAL STYLES
// ==========================================
const styles = {
  appContainer: { display: "flex", flexDirection: "column", backgroundColor: "#f5f5f5", minHeight: "100vh" },

  scrollArea: {
    display: "flex", flexDirection: "column", flex: 1,
    paddingBottom: `calc(${NAV_HEIGHT}px + 24px + env(safe-area-inset-bottom, 0px))`,
    boxSizing: "border-box"
  },

  categoryGrid: {
    display: "grid",
    gridTemplateColumns: layoutConfig.gridColumns,
    gap: layoutConfig.gridGap,
    padding: layoutConfig.gridPadding,
    alignItems: layoutConfig.gridAlignItems
  },

  brandFooter: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "48px 24px 32px" },
  brandDivider: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", maxWidth: "220px", marginBottom: "22px" },
  brandDividerLine: { flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, #d8d8d8, transparent)" },
  brandDividerDot: { width: "6px", height: "6px", borderRadius: "50%", background: "#9a9a9a", flexShrink: 0 },
  brandLogoRow: { display: "flex", alignItems: "baseline", justifyContent: "center", lineHeight: 0.9, transform: "skewX(-6deg)", flexWrap: "wrap" },
  brandShiper: { fontSize: "clamp(38px, 12vw, 56px)", fontWeight: "900", letterSpacing: "-2px", color: "#8ec5fc", fontFamily: "'Segoe UI', system-ui, sans-serif", textTransform: "uppercase" },
  brandBox: { fontSize: "clamp(38px, 12vw, 56px)", fontWeight: "900", letterSpacing: "-2px", color: "#6e6e6e", fontFamily: "'Segoe UI', system-ui, sans-serif", textTransform: "uppercase", marginLeft: "4px" },
  brandTagline: { margin: "10px 0 4px", fontSize: "14px", fontWeight: "700", color: "#444", letterSpacing: "0.2px" },
  brandSubline: { margin: 0, fontSize: "12px", fontWeight: "500", color: "#aaa", letterSpacing: "0.3px" },

  centerPrompt: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 20px", flex: 1, gap: "16px" },

  loginBtn: { background: "#ff9f00", color: "white", border: "none", padding: "12px 24px", borderRadius: "8px", width: "100%", fontWeight: "bold", cursor: "pointer" },
};