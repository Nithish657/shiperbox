import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
import { COLOR, FONT, RADIUS, SHADOW, EASE, EASE_SPRING } from "./mobiletheme";
import { useScrollDirection } from "./mobileMotion";
import { getImageUrl } from "../utils/imageUrl";

export default function MobileBottomNav({ activeTab, setActiveTab, onlyCart = false, transparent = false, viewCartBar = false }) {
  const [cartCount, setCartCount] = useState(0);
  // Only populated when viewCartBar is true - the plain tab bar never needs
  // per-item detail, just the unique-product count above.
  const [cartSummary, setCartSummary] = useState({ totalQty: 0, thumbnails: [] });
  const navigate = useNavigate();
  const location = useLocation();
  const { hidden } = useScrollDirection(24);

  const getUserId = () => {
    try { return localStorage.getItem("phone") || "guest"; } catch (_) { return "guest"; }
  };

  const isMountedRef = useRef(true);

  const fetchCartCount = useCallback(async () => {
    const user_id = getUserId();
    if (user_id === "guest") {
      if (isMountedRef.current) {
        setCartCount(0);
        setCartSummary({ totalQty: 0, thumbnails: [] });
      }
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/cart/${user_id}`);
      if (!isMountedRef.current) return;
      if (res.data.success) {
        const cart = res.data.cart;
        const uniqueItems = [...new Set(cart.map((item) => item.product_id))];
        setCartCount(uniqueItems.length);

        if (viewCartBar) {
          const totalQty = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
          const thumbnails = cart
            .map((item) => item.image || item.product_image)
            .filter(Boolean)
            .slice(0, 2)
            .map((img) => getImageUrl(img));
          setCartSummary({ totalQty, thumbnails });
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setCartCount(0);
        setCartSummary({ totalQty: 0, thumbnails: [] });
      }
    }
  }, [viewCartBar]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchCartCount();
    window.addEventListener("cartUpdated", fetchCartCount);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener("cartUpdated", fetchCartCount);
    };
  }, [fetchCartCount]);

  const handleTabClick = (tab) => {
    if (location.pathname === "/" || location.pathname === "/home") {
      if (setActiveTab) setActiveTab(tab);
    } else {
      navigate("/", { state: { targetTab: tab } });
    }
  };

  const currentHighlight = (location.pathname !== "/" && location.pathname !== "/home") ? "home" : activeTab;

  const HomeIcon = ({ color }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  );

  const CartIcon = ({ color }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  );

  const UserIcon = ({ color }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );

  const badgeText = cartCount > 9 ? "9+" : String(cartCount);

  // This mode replaces the whole tab row with a single floating "View cart"
  // pill - used only where a page opts in (e.g. the items list), so every
  // other screen keeps the normal Home/Cart/Profile tabs untouched.
  if (viewCartBar) {
    if (cartSummary.totalQty <= 0) return null;
    return (
      <div style={styles.viewCartWrap}>
        <style>{`
          @keyframes sb-cartBarIn { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
          .sb-view-cart-bar { animation: sb-cartBarIn 0.32s ${EASE_SPRING} both; }
          .sb-view-cart-bar:active { transform: scale(0.98); }
        `}</style>
        <div
          style={styles.viewCartBar}
          className="sb-tap sb-view-cart-bar"
          onClick={() => navigate("/", { state: { targetTab: "cart" } })}
          role="button"
          tabIndex={0}
        >
          <div style={styles.viewCartThumbs}>
            {cartSummary.thumbnails.length > 0 ? (
              cartSummary.thumbnails.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt=""
                  style={{ ...styles.viewCartThumbImg, marginLeft: idx === 0 ? 0 : "-14px", zIndex: cartSummary.thumbnails.length - idx }}
                />
              ))
            ) : (
              <div style={styles.viewCartThumbFallback} />
            )}
          </div>
          <div style={styles.viewCartTextBlock}>
            <span style={styles.viewCartTitle}>View cart</span>
            <span style={styles.viewCartSubtitle}>{cartSummary.totalQty} item{cartSummary.totalQty === 1 ? "" : "s"}</span>
          </div>
          <div style={styles.viewCartArrowCircle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  const tabs = onlyCart
    ? [
        { key: "cart", label: "Cart", Icon: CartIcon, badge: cartCount > 0 ? badgeText : null },
      ]
    : [
        { key: "home", label: "Home", Icon: HomeIcon },
        { key: "cart", label: "Cart", Icon: CartIcon, badge: cartCount > 0 ? badgeText : null },
        { key: "profile", label: "Profile", Icon: UserIcon },
      ];

  return (
    <div
      style={{
        ...styles.navWrapper,
        transform: hidden ? "translateY(140%)" : "translateY(0)",
        opacity: hidden ? 0 : 1,
      }}
    >
      <style>{`
        @keyframes sb-badgePop { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } }
        .sb-nav-item { transition: background-color 0.25s ${EASE}, box-shadow 0.32s ${EASE_SPRING}, padding 0.32s ${EASE_SPRING}, gap 0.32s ${EASE_SPRING}, width 0.32s ${EASE_SPRING}, color 0.25s ${EASE}; }
        .sb-nav-item:active { transform: scale(0.94); }
        .sb-nav-label-in { animation: sb-pop 0.28s ${EASE_SPRING} both; }
        .sb-badge-pop { animation: sb-badgePop 0.3s ${EASE_SPRING} both; }
      `}</style>
      <div style={transparent ? styles.staticBottomNavTransparent : styles.staticBottomNav}>
        {tabs.map(({ key, label, Icon, badge }) => {
          const active = currentHighlight === key;
          return (
            <div
              key={key}
              style={active ? styles.navItemActive : styles.navItem}
              className="sb-tap sb-nav-item"
              onClick={() => handleTabClick(key)}
            >
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon color={active ? COLOR.paper : COLOR.muted} />
                {badge && <span key={badge} style={styles.badge} className="sb-badge-pop">{badge}</span>}
              </div>
              {active && <span style={styles.navLabel} className="sb-nav-label-in">{label}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const NAV_HEIGHT = 80;

const styles = {
  navWrapper: {
    position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
    display: "flex", justifyContent: "center",
    paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
    paddingTop: "10px", pointerEvents: "none",
    backgroundColor: "transparent",
    transition: `transform 0.34s ${EASE}, opacity 0.28s ${EASE}`,
    willChange: "transform",
  },
  staticBottomNav: {
    pointerEvents: "auto", display: "flex", alignItems: "center", gap: "8px",
    // Frosted-glass instead of solid white: content scrolling underneath
    // stays faintly visible through the pill rather than being hidden by it.
    backgroundColor: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(18px) saturate(180%)",
    WebkitBackdropFilter: "blur(18px) saturate(180%)",
    padding: "8px", borderRadius: RADIUS.pill,
    boxShadow: "0 14px 34px rgba(15,23,42,0.14)", border: `1.5px solid rgba(255,255,255,0.6)`,
  },
  staticBottomNavTransparent: {
    pointerEvents: "auto", display: "flex", alignItems: "center", gap: "8px",
    // No bar behind the icons at all - used only where a page opts in via
    // the `transparent` prop. Only the active tab (its own colored pill via
    // navItemActive) stays visible against the page.
    backgroundColor: "transparent",
    padding: "8px", borderRadius: RADIUS.pill,
    boxShadow: "none", border: "none",
  },
  navItem: {
    display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center",
    color: COLOR.muted, cursor: "pointer", width: "54px", height: "54px",
    borderRadius: RADIUS.pill,
  },
  navItemActive: {
    display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: "8px", color: COLOR.paper, cursor: "pointer", height: "54px", padding: "0 20px 0 16px",
    borderRadius: RADIUS.pill, background: COLOR.gradientCTA,
    boxShadow: SHADOW.cta,
  },
  navLabel: { fontFamily: FONT.body, fontSize: "14px", fontWeight: 700, whiteSpace: "nowrap" },
  badge: {
    position: "absolute", top: "-8px", right: "-12px", backgroundColor: COLOR.pop, color: "#292828",
    fontSize: "10.5px", fontWeight: "800", padding: "2px 6px", borderRadius: "10px",
    // Was `border: "2px "` - no style/color, so it silently did nothing.
    // A solid white ring is what actually separates the badge from the icon behind it.
    border: `2px solid ${COLOR.paper}`, minWidth: "14px", textAlign: "center", lineHeight: "14px",
  },

  viewCartWrap: {
    position: "fixed",
    left: "16px", right: "16px",
    bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
    zIndex: 9999,
    display: "flex",
    justifyContent: "center",
  },
  viewCartBar: {
    width: "100%",
    maxWidth: "480px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 8px 8px 10px",
    borderRadius: RADIUS.pill,
    background: "linear-gradient(135deg, #34ab4a, #1f7a33)",
    boxShadow: "0 14px 30px rgba(31,122,51,0.42), inset 0 1px 0 rgba(255,255,255,0.18)",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  viewCartThumbs: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  viewCartThumbImg: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid rgba(255,255,255,0.85)",
    backgroundColor: "#eef1f5",
  },
  viewCartThumbFallback: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.85)",
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  viewCartTextBlock: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    color: "#fff",
  },
  viewCartTitle: {
    fontFamily: FONT.body,
    fontSize: "16px",
    fontWeight: "800",
    lineHeight: 1.25,
  },
  viewCartSubtitle: {
    fontFamily: FONT.body,
    fontSize: "12.5px",
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 1.3,
  },
  viewCartArrowCircle: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "rgba(255,255,255,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
};