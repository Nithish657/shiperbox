import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";

/**
 * FIX NOTES:
 * 1. Added env(safe-area-inset-bottom) so the nav bar isn't obscured by
 *    (or doesn't obscure) the home-indicator on notched iPhones — this is
 *    the single most common "looks broken on my phone" bug in mobile web
 *    apps that use position:fixed at the bottom.
 * 2. localStorage read wrapped in try/catch (private-mode crash guard).
 * 3. Cart-count fetch now checks an `isMounted` flag so it never calls
 *    setState after the component has unmounted (was previously an
 *    uncaught React warning / potential leak on fast navigation).
 * 4. Badge count is now capped/formatted ("9+") so it can never blow out
 *    the fixed-size badge on screens or with carts with many items.
 */
export default function MobileBottomNav({ activeTab, setActiveTab }) {
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const getUserId = () => {
    try {
      return localStorage.getItem("phone") || "guest";
    } catch (_) {
      return "guest";
    }
  };

  const isMountedRef = useRef(true);

  const fetchCartCount = useCallback(async () => {
    const user_id = getUserId();
    if (user_id === "guest") {
      if (isMountedRef.current) setCartCount(0);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/cart/${user_id}`);
      if (!isMountedRef.current) return;
      if (res.data.success) {
        const uniqueItems = [...new Set(res.data.cart.map((item) => item.product_id))];
        setCartCount(uniqueItems.length);
      }
    } catch (err) {
      if (isMountedRef.current) setCartCount(0);
    }
  }, []);

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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  );

  const CartIcon = ({ color }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  );

  const UserIcon = ({ color }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );

  const homeColor = currentHighlight === "home" ? "#2874f0" : "#888";
  const cartColor = currentHighlight === "cart" ? "#2874f0" : "#888";
  const userColor = currentHighlight === "profile" ? "#2874f0" : "#888";
  const badgeText = cartCount > 9 ? "9+" : String(cartCount);

  return (
    <div style={styles.staticBottomNav}>
      <div
        style={currentHighlight === "home" ? styles.navItemActive : styles.navItem}
        onClick={() => handleTabClick("home")}
        role="button"
        aria-label="Home"
      >
        <span style={styles.navIcon}>
          <HomeIcon color={homeColor} />
        </span>
      </div>

      <div
        style={currentHighlight === "cart" ? styles.navItemActive : styles.navItem}
        onClick={() => handleTabClick("cart")}
        role="button"
        aria-label={`Cart, ${cartCount} items`}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={styles.navIcon}>
            <CartIcon color={cartColor} />
          </span>
          {cartCount > 0 && <span style={styles.badge}>{badgeText}</span>}
        </div>
      </div>

      <div
        style={currentHighlight === "profile" ? styles.navItemActive : styles.navItem}
        onClick={() => handleTabClick("profile")}
        role="button"
        aria-label="Profile"
      >
        <span style={styles.navIcon}>
          <UserIcon color={userColor} />
        </span>
      </div>
    </div>
  );
}

// Exported so pages can reserve exact bottom space instead of guessing
// a magic-number padding that drifts out of sync with this component.
export const NAV_HEIGHT = 65;

const styles = {
  staticBottomNav: {
    position: "fixed", bottom: 0, left: 0, right: 0,
    height: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    backgroundColor: "white",
    display: "flex", justifyContent: "space-around", alignItems: "center",
    borderTop: "1px solid #e0e0e0", zIndex: 9999, boxSizing: "border-box",
  },
  navItem: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#888", cursor: "pointer", flex: 1, height: "100%" },
  navItemActive: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#2874f0", cursor: "pointer", flex: 1, height: "100%", transform: "scale(1.05)" },
  navIcon: { display: "flex", alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: "-6px", right: "-10px", backgroundColor: "#ff5252", color: "white", fontSize: "10px", fontWeight: "bold", padding: "2px 5px", borderRadius: "10px", border: "2px solid white", minWidth: "16px", textAlign: "center", lineHeight: "14px" }
};