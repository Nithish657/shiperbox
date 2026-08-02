import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";

export default function MobileBottomNav({ activeTab, setActiveTab }) {
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const user_id = localStorage.getItem("phone") || "guest";

  // UPDATED: Fetches the count of UNIQUE items
  const fetchCartCount = async () => {
    if (user_id === "guest") return setCartCount(0);
    try {
      const res = await axios.get(`${API_URL}/cart/${user_id}`);
      if (res.data.success) {
        // Create a set of unique product_ids to get the number of distinct items
        const uniqueItems = [...new Set(res.data.cart.map(item => item.product_id))];
        setCartCount(uniqueItems.length);
      }
    } catch (err) {
      console.log(err);
      setCartCount(0);
    }
  };

  useEffect(() => {
    fetchCartCount();
    // Listens for our custom "cartUpdated" event from ANY page
    window.addEventListener("cartUpdated", fetchCartCount);
    return () => window.removeEventListener("cartUpdated", fetchCartCount);
  }, [user_id]);

  const handleTabClick = (tab) => {
    if (location.pathname === "/" || location.pathname === "/home") {
      if (setActiveTab) setActiveTab(tab);
    } else {
      navigate("/", { state: { targetTab: tab } });
    }
  };

  const currentHighlight = (location.pathname !== "/" && location.pathname !== "/home") ? "home" : activeTab;

  // Custom SVG Icons matching your requested style
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

  return (
    <div style={styles.staticBottomNav}>
      <div style={currentHighlight === "home" ? styles.navItemActive : styles.navItem} onClick={() => handleTabClick("home")}>
        <span style={styles.navIcon}>
          <HomeIcon color={homeColor} />
        </span>
        <span style={styles.navText}></span>
      </div>
      
      <div style={currentHighlight === "cart" ? styles.navItemActive : styles.navItem} onClick={() => handleTabClick("cart")}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={styles.navIcon}>
            <CartIcon color={cartColor} />
          </span>
          {cartCount > 0 && <span style={styles.badge}>{cartCount}</span>}
        </div>
        <span style={styles.navText}></span>
      </div>
      
      <div style={currentHighlight === "profile" ? styles.navItemActive : styles.navItem} onClick={() => handleTabClick("profile")}>
        <span style={styles.navIcon}>
          <UserIcon color={userColor} />
        </span>
        <span style={styles.navText}></span>
      </div>
    </div>
  );
}

const styles = {
  staticBottomNav: { position: "fixed", bottom: 0, left: 0, right: 0, height: "65px", backgroundColor: "white", display: "flex", justifyContent: "space-around", alignItems: "center", borderTop: "1px solid #e0e0e0", zIndex: 9999 },
  navItem: { display: "flex", flexDirection: "column", alignItems: "center", color: "#888", cursor: "pointer", width: "33%" },
  navItemActive: { display: "flex", flexDirection: "column", alignItems: "center", color: "#2874f0", cursor: "pointer", width: "33%", transform: "scale(1.05)" },
  navIcon: { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" },
  navText: { fontSize: "12px", fontWeight: "600" },
  badge: { position: "absolute", top: "-4px", right: "-8px", backgroundColor: "#ff5252", color: "white", fontSize: "10px", fontWeight: "bold", padding: "2px 6px", borderRadius: "10px", border: "2px solid white" }
};