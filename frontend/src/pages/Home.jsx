import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import AdsSlider from "../components/AdsSlider";
import ItemsList from "../components/ItemsList";
import Cart from "../components/cart";
import Login from "./Login";
import axios from "axios";
import { API_URL } from "../api";

const BRAND_GREEN = "#8ec5fc";

// ==========================================
// FOOTER SOCIAL ICONS
// ==========================================
const FooterIcons = {
  Instagram: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke={color} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.3" stroke={color} strokeWidth="1.8" />
      <circle cx="17.4" cy="6.6" r="1.15" fill={color} />
    </svg>
  ),
  WhatsApp: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2.5A9.5 9.5 0 0 0 3.9 17.1L2.5 21.5l4.53-1.37A9.5 9.5 0 1 0 12 2.5z"
        stroke={color}
        strokeWidth="1.8"
      />
      <path
        d="M8.3 8.6c.15-.55.6-.55.9-.55h.35c.2 0 .4.05.55.4.2.45.65 1.6.7 1.7.05.1.1.25 0 .4-.1.15-.15.25-.3.4-.15.15-.3.3-.15.6.15.3.7 1.15 1.5 1.85.9.85 1.6 1.1 1.9 1.25.3.15.5.1.65-.05.2-.2.75-.85.95-1.15.2-.3.4-.25.65-.15.25.1 1.65.8 1.9.95.25.15.45.2.5.35.05.15.05.9-.25 1.75-.3.85-1.7 1.55-2.35 1.6-.6.1-1.35.15-2.15-.15-.5-.15-1.15-.35-2-.7-3.5-1.5-5.75-5-5.9-5.25-.15-.25-1.3-1.75-1.3-3.3 0-1.55.8-2.3 1.1-2.6z"
        fill={color}
      />
    </svg>
  ),
  Email: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="4.5" width="19" height="15" rx="3" stroke={color} strokeWidth="1.8" />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function Home() {
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [cartRefresh, setCartRefresh] = useState(0);
  const [showLogin, setShowLogin] = useState(false);

  const navigate = useNavigate();
  const headerRef = useRef(null);

  // Scrolls to an in-page section (used by footer Category links, since
  // Vegetables/Flowers render inline on this page — not on their own route).
  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const user_id = localStorage.getItem("phone") || "guest";
  const isLoggedIn = () => localStorage.getItem("isLoggedIn") === "true";

  const loadCart = async () => {
    if (!isLoggedIn()) return;
    try {
      const res = await axios.get(`${API_URL}/cart/${user_id}`);
      if (res.data.success) {
        setCartItems(res.data.cart);
        const uniqueItems = [...new Set(res.data.cart.map(item => item.product_id))];
        setCartCount(uniqueItems.length);
      }
    } catch (err) { console.log("Load cart error:", err); }
  };

  const addToCart = async (product_id, category) => {
    if (!isLoggedIn()) { setShowLogin(true); return; }
    try {
      await axios.post(`${API_URL}/cart/add`, { user_id, product_id, category });
      await loadCart();
      setCartRefresh(prev => prev + 1);
    } catch (err) { console.error(err); }
  };

  const updateQty = async (id, action) => {
    const item = cartItems.find(i => i.id === id);
    if (action === "decrease" && item.quantity <= 1) {
      await axios.delete(`${API_URL}/cart/${id}`);
    } else {
      await axios.put(`${API_URL}/cart/${action}/${id}`);
    }
    await loadCart();
    setCartRefresh(prev => prev + 1);
  };

  useEffect(() => { loadCart(); }, []);

  // Prevent background scrolling when cart is open
  useEffect(() => {
    document.body.style.overflow = showCart ? "hidden" : "auto";
  }, [showCart]);

  return (
    <div style={styles.page}>
      <Header ref={headerRef} cartCount={cartCount} openCart={() => setShowCart(true)} />
      
      <div style={{ marginTop: "130px" }}>
        <AdsSlider />
      </div>

      <div style={styles.content}>
        
        <div id="vegetables-section" style={{ scrollMarginTop: "130px" }}>
          <ItemsList 
            title="Fresh Vegetables" 
            category="vegetables" 
            addToCart={addToCart} 
            updateQty={updateQty} 
            cartItems={cartItems} 
            rows={2} 
          />
        </div>
        
        <div id="flowers-section" style={{ scrollMarginTop: "130px" }}>
          <ItemsList 
            title="Flowers" 
            category="flowers" 
            addToCart={addToCart} 
            updateQty={updateQty} 
            cartItems={cartItems} 
            rows={2} 
          />
        </div>

        {/* --- CUSTOM GARLAND BANNER --- */}
        <div style={styles.sectionWrapper}>
          <h2 style={styles.sectionTitle}>Custom Garlands</h2>
          <div style={styles.bannerSection}>
            <div style={styles.bannerText}>
              <h2 style={styles.bannerTitle}>🌸 Bespoke Garland Service</h2>
              <p style={styles.bannerSubtitle}>
                Looking for something specific? Upload a reference photo, tell us your requirements, and we'll handcraft the perfect garland for your special occasion.
              </p>
            </div>
            <button style={styles.bannerBtn} onClick={() => navigate("/custom-garland")}>
              Order Now
            </button>
          </div>
        </div>

        {/* --- 1-DAY COURIER BANNER --- */}
        <div style={styles.sectionWrapper}>
          <h2 style={styles.sectionTitle}>1-Day Delivery</h2>
          <div style={styles.bannerSection}>
            <div style={styles.bannerText}>
              <h2 style={styles.bannerTitle}>🚚 Express Courier Service</h2>
              <p style={styles.bannerSubtitle}>
                Same-day courier for distances over 100km. Set your pickup and
                drop locations and we'll confirm timing and pricing instantly.
              </p>
            </div>
            <button style={styles.bannerBtn} onClick={() => navigate("/courier")}>
              Request Courier
            </button>
          </div>
        </div>

      </div>

      {/* ========================================== */}
      {/* FOOTER — Blinkit-style desktop footer */}
      {/* ========================================== */}
      <footer style={styles.footer}>
        <div style={styles.footerTop}>

          <div style={styles.footerBrandCol}>
            <div style={styles.footerLogoRow}>
              <span style={styles.footerLogoShiper}>Shiper</span>
              <span style={styles.footerLogoBox}>Box</span>
            </div>
            <p style={styles.footerTagline}>
              Fresh flowers, vegetables, custom garlands and same-day courier —
              all delivered to your doorstep, fast.
            </p>
            <div style={styles.footerSocialRow}>
              <a
                href="https://instagram.com/shiperbox"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.footerSocialBtn}
                aria-label="Instagram"
              >
                <FooterIcons.Instagram size={18} color="#555" />
              </a>
              <a
                href="https://wa.me/916301912803?text=Hi%2C%20I%20have%20a%20question%20about%20ShiperBox"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.footerSocialBtn}
                aria-label="WhatsApp"
              >
                <FooterIcons.WhatsApp size={18} color="#555" />
              </a>
              <a
                href="mailto:support@shiperbox.com"
                style={styles.footerSocialBtn}
                aria-label="Email"
              >
                <FooterIcons.Email size={18} color="#555" />
              </a>
            </div>
          </div>

          <div style={styles.footerLinkCol}>
            <h4 style={styles.footerColTitle}>Categories</h4>
            <a style={styles.footerLink} onClick={() => scrollToSection("vegetables-section")}>Vegetables</a>
            <a style={styles.footerLink} onClick={() => scrollToSection("flowers-section")}>Flowers</a>
            <a style={styles.footerLink} onClick={() => navigate("/custom-garland")}>Garlands</a>
            <a style={styles.footerLink} onClick={() => navigate("/courier")}>Courier Service</a>
          </div>

          <div style={styles.footerLinkCol}>
            <h4 style={styles.footerColTitle}>Company</h4>
            <a style={styles.footerLink} onClick={() => headerRef.current?.openAccountSection("about")}>About Us</a>
            <a style={styles.footerLink} onClick={() => headerRef.current?.openAccountSection("orders")}>My Orders</a>
            <a style={styles.footerLink} onClick={() => headerRef.current?.openAccountSection("address")}>My Address</a>
            <a
              style={styles.footerLink}
              href="https://wa.me/916301912803?text=Hi%2C%20I%20need%20help%20with%20my%20ShiperBox%20order"
              target="_blank"
              rel="noopener noreferrer"
            >
              Need Help
            </a>
          </div>

          <div style={styles.footerLinkCol}>
            <h4 style={styles.footerColTitle}>Get in Touch</h4>
            <a style={styles.footerLink} href="mailto:shiperbox@gmail.com">shiperbox@gmail.com</a>
            <a
              style={styles.footerLink}
              href="https://wa.me/916301912803"
              target="_blank"
              rel="noopener noreferrer"
            >
              +91 63019 12803
            </a>
            <a
              style={styles.footerLink}
              href="https://instagram.com/shiperbox"
              target="_blank"
              rel="noopener noreferrer"
            >
              @shiperbox on Instagram
            </a>
          </div>

        </div>

        <div style={styles.footerDivider} />

        <div style={styles.footerBottom}>
          <p style={styles.footerCopyright}>
            © {new Date().getFullYear()} ShiperBox. All rights reserved.
          </p>
          <p style={styles.footerMadeWith}>Made with 💐 for every occasion.</p>
        </div>
      </footer>
      {showCart && (
        <div style={styles.cartOverlay} onClick={() => setShowCart(false)}></div>
      )}

      {/* Full-Height Cart Wrapper */}
      <div style={styles.cartWrapper(showCart)}>
        {showCart && isLoggedIn() && (
          <Cart user_id={user_id} refresh={cartRefresh} onCartChange={loadCart} closeCart={() => setShowCart(false)} />
        )}
      </div>

      {/* Login Modal */}
      {showLogin && (
        <div style={styles.overlay}>
          <div style={styles.loginBox}>
            <button style={styles.closeBtn} onClick={() => setShowLogin(false)}>×</button>
            <Login onLoginSuccess={() => { setShowLogin(false); loadCart(); }} />
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", backgroundColor: "#f5f6fb" },
  content: { padding: "20px", maxWidth: "1600px", margin: "0 auto" },
  sectionWrapper: { marginTop: "40px", marginBottom: "40px" },
  sectionTitle: { fontSize: "24px", fontWeight: "800", margin: "0 20px 20px 130px", color: "#111" },
  
  // Shared Banner Styles (Used for both Garland and Courier)
  bannerSection: {
    margin: "0px 120px", background: "#fff", borderRadius: "16px", padding: "30px 40px", minHeight:"100px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.03)", border: "1px solid #f0f0f0", flexWrap: "wrap",
  },
  bannerText: { flex: 1, minWidth: "260px" },
  bannerTitle: { margin: "0 0 8px 0", fontSize: "22px", color: "#111", fontWeight: "700" },
  bannerSubtitle: { margin: 0, fontSize: "15px", color: "#666", lineHeight: 1.5 },
  bannerBtn: {
    padding: "14px 28px", background: BRAND_GREEN, color: "#fff", border: "none",
    borderRadius: "10px", fontWeight: "bold", fontSize: "15px", cursor: "pointer",
    whiteSpace: "nowrap", transition: "background 0.2s ease",
    boxShadow: "0 4px 12px rgba(142, 197, 252, 0.4)",
  },

  cartOverlay: {
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)",
    zIndex: 9998,
  },
  cartWrapper: (showCart) => ({
    width: showCart ? "500px" : "0px",
    transition: "0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
    overflow: "hidden",
    backgroundColor: "#f4f6f9",
    height: "100vh",
    position: "fixed",
    right: 0,
    top: 0,
    boxShadow: showCart ? "-5px 0 25px rgba(0,0,0,0.15)" : "none",
    zIndex: 9999,
  }),
  overlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 },
  loginBox: { position: "relative", background: "#fff", borderRadius: "16px", minWidth: "380px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" },
  closeBtn: { position: "absolute", right: "12px", top: "8px", border: "none", background: "transparent", fontSize: "28px", cursor: "pointer", zIndex: 10, color: "#666" },

  // ==========================================
  // FOOTER STYLES — 
  // ==========================================
  footer: {
    marginTop: "60px",
    backgroundColor: "#fff",
    borderTop: "1px solid #eee",
    padding: "56px 0 0",
  },
  footerTop: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "0 130px",
    display: "flex",
    flexWrap: "wrap",
    gap: "48px",
    justifyContent: "space-between",
  },
  footerBrandCol: {
    flex: "1 1 320px",
    maxWidth: "360px",
  },
  footerLogoRow: {
    display: "flex",
    alignItems: "baseline",
    lineHeight: 0.9,
    transform: "skewX(-6deg)",
    marginBottom: "16px",
  },
  footerLogoShiper: {
    fontSize: "30px",
    fontWeight: "900",
    letterSpacing: "-1px",
    color:"#8ec5fc",
    textTransform: "uppercase",
  },
  footerLogoBox: {
    fontSize: "30px",
    fontWeight: "900",
    letterSpacing: "-1px",
    color: "#6e6e6e",
    textTransform: "uppercase",
    marginLeft: "3px",
  },
  footerTagline: {
    margin: "0 0 20px",
    fontSize: "14px",
    color: "#777",
    lineHeight: 1.6,
  },
  footerSocialRow: {
    display: "flex",
    gap: "10px",
  },
  footerSocialBtn: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "#f5f5f5",
    border: "1px solid #eee",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    textDecoration: "none",
    transition: "background 0.15s ease, transform 0.15s ease",
  },
  footerLinkCol: {
    flex: "0 1 200px",
    display: "flex",
    flexDirection: "column",
  },
  footerColTitle: {
    margin: "0 0 18px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#111",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  footerLink: {
    fontSize: "14px",
    color: "#666",
    textDecoration: "none",
    marginBottom: "14px",
    cursor: "pointer",
    width: "fit-content",
  },
  footerDivider: {
    height: "1px",
    background: "#eee",
    margin: "48px 0 0",
  },
  footerBottom: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "20px 130px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "8px",
  },
  footerCopyright: {
    margin: 0,
    fontSize: "13px",
    color: "#999",
  },
  footerMadeWith: {
    margin: 0,
    fontSize: "13px",
    color: "#999",
  },
};