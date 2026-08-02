import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
import MobileBottomNav from "../mobile/MobileBottomNav";
import useIsDesktop from "../hooks/useIsDesktop";

export default function MyOrders() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const user_id = localStorage.getItem("phone") || "guest";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user_id === "guest") {
      setLoading(false);
      return;
    }
    const fetchOrders = async () => {
      try {
        const timestamp = new Date().getTime();
        const res = await axios.get(`${API_URL}/orders/${user_id}?t=${timestamp}`);
        if (res.data.success) {
          // Sort by newest first
          const sortedOrders = res.data.orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setOrders(sortedOrders);
        }
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user_id]);

  const formatOrderDateTime = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
    });
  };

  const getStatusVisuals = (rawStatus) => {
    const s = String(rawStatus || "pending").toLowerCase().trim();
    if (s.includes("done") || s.includes("deliver") || s.includes("complet")) return { text: "Delivered", color: "#16a34a", bg: "#dcfce7" };
    if (s.includes("reject") || s.includes("cancel") || s.includes("delete")) return { text: "Cancelled", color: "#ef4444", bg: "#fee2e2" };
    if (s.includes("transit") || s.includes("dispatch")) return { text: "Arriving Soon", color: "#0284c7", bg: "#e0f2fe" };
    if (s.includes("approve") || s.includes("process") || s.includes("accept")) return { text: "Processing", color: "#d97706", bg: "#fef3c7" };
    return { text: "Order Placed", color: "#d97706", bg: "#fef3c7" };
  };

  const getOrderType = (type) => {
    const t = String(type || "cart").toLowerCase();
    if (t === "garland") return "Flower Garland";
    if (t === "courier") return "Courier Service";
    if (t === "bulk_veg") return "Bulk Vegetables";
    return "Grocery Delivery";
  };

  // --- Bulletproof Smart WhatsApp Function ---
  const openWhatsApp = (orderId) => {
    const phoneNumber = "916301912803";
    const message = encodeURIComponent(`Hi, I need help with my Order #${orderId}`);
    
    // Detect if the user is on a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Official fallback-safe link for mobile (Opens the app automatically)
      window.open(`https://api.whatsapp.com/send?phone=${phoneNumber}&text=${message}`, "_blank");
    } else {
      // Opens WhatsApp Web directly on computers
      window.open(`https://web.whatsapp.com/send?phone=${phoneNumber}&text=${message}`, "_blank");
    }
  };

  return (
    <div style={{ ...styles.page, ...(isDesktop && styles.pageDesktop) }}>
      <div style={isDesktop ? styles.cardDesktop : undefined}>
        
        {/* HEADER */}
        <div style={{ ...styles.header, ...(isDesktop && styles.headerDesktop) }}>
          <h2 style={styles.title}>My Orders</h2>
        </div>

        {/* CONTENT */}
        <div style={{ ...styles.scrollArea, ...(isDesktop && styles.scrollAreaDesktop) }}>
          {user_id === "guest" ? (
            <div style={styles.centerBox}>
              <div style={styles.emptyIcon}>📦</div>
              <p style={styles.emptyText}>Please log in to view your orders.</p>
              <button style={styles.loginBtn} onClick={() => navigate("/")}>Login</button>
            </div>
          ) : loading ? (
            <div style={styles.centerBox}><p style={styles.emptyText}>Loading your orders...</p></div>
          ) : orders.length === 0 ? (
            <div style={styles.centerBox}>
              <div style={styles.emptyIcon}>🛍️</div>
              <p style={styles.emptyText}>You haven't placed any orders yet.</p>
              <button style={styles.startShoppingBtn} onClick={() => navigate("/home")}>Start Shopping</button>
            </div>
          ) : (
            <div style={styles.orderList}>
              {orders.map((order) => {
                const statusVis = getStatusVisuals(order.status || order.approval_status);
                const hasItems = Array.isArray(order.items) && order.items.length > 0;

                return (
                  <div key={order.id} style={styles.orderCard}>
                    
                    {/* Card Top: Status & Date */}
                    <div style={styles.cardTopRow}>
                      <div style={styles.statusBox}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: statusVis.color, marginRight: "6px" }}></div>
                        <span style={{ color: statusVis.color, fontWeight: "800", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {statusVis.text}
                        </span>
                      </div>
                      <span style={styles.dateText}>{formatOrderDateTime(order.created_at)}</span>
                    </div>

                    <div style={styles.cardDivider}></div>

                    {/* Card Body: Full Item Details with Images */}
                    <div style={styles.cardBody}>
                      <p style={styles.orderTypeTag}>{getOrderType(order.order_type)} • Order #{order.id}</p>
                      
                      {hasItems ? (
                        <div style={styles.fullItemList}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={styles.itemRow}>
                              <div style={styles.imgBox}>
                                {item.image ? (
                                  <img src={item.image} alt={item.name} style={styles.itemImg} />
                                ) : (
                                  <span style={styles.imgFallback}>🛒</span>
                                )}
                              </div>
                              <div style={styles.itemDetails}>
                                <p style={styles.itemName}>{item.name}</p>
                                {item.quantity && <p style={styles.itemQty}>Qty: {item.quantity}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : order.items_names ? (
                        <p style={styles.itemNamesText}>{order.items_names}</p>
                      ) : order.notes ? (
                        <p style={styles.itemNamesText}>{order.notes}</p>
                      ) : (
                        <p style={styles.itemNamesText}>Details unavailable</p>
                      )}
                    </div>

                    <div style={styles.cardDivider}></div>

                    {/* Card Bottom: Total & Actions */}
                    <div style={styles.cardBottomRow}>
                      {order.total_price != null ? (
                        <div style={styles.totalBlock}>
                          <span style={styles.totalLabel}>Total Amount</span>
                          <span style={styles.totalValue}>₹{order.total_price}</span>
                        </div>
                      ) : (
                        <div style={styles.totalBlock}>
                          <span style={styles.totalLabel}>Amount</span>
                          <span style={styles.totalValue}>—</span>
                        </div>
                      )}
                      
                      {/* Navigate to help/support WhatsApp */}
                      <button 
                        style={styles.reorderBtn} 
                        onClick={() => openWhatsApp(order.id)}
                      >
                        Help Support
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {!isDesktop && <MobileBottomNav />}
    </div>
  );
}

const styles = {
  page: { backgroundColor: "#f4f6f9", minHeight: "100vh" },
  pageDesktop: { display: "flex", justifyContent: "center", backgroundColor: "#eef1f5", padding: "40px 20px", boxSizing: "border-box" },
  cardDesktop: { width: "100%", maxWidth: "680px", background: "#fff", borderRadius: "20px", boxShadow: "0 10px 40px rgba(0,0,0,0.08)", overflow: "hidden", height: "fit-content" },
  
  header: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, display: "flex", alignItems: "center", padding: "16px 20px", background: " #8ec5fc", color: "#222", gap: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  headerDesktop: { position: "static", borderRadius: "20px 20px 0 0", padding: "20px 24px", borderBottom: "1px solid #eee", boxShadow: "none" },
  backBtnHeader: { background: "none", border: "none", fontSize: "22px", color: "#222", cursor: "pointer", display: "flex", alignItems: "center" },
  title: { margin:"0 0 0 145px", fontSize: "20px", fontWeight: "800", color: "#ffffff" },
  
  scrollArea: { padding: "70px 14px 90px" },
  scrollAreaDesktop: { padding: "20px", backgroundColor: "#f4f6f9" },
  
  centerBox: { textAlign: "center", padding: "50px 20px", display: "flex", flexDirection: "column", alignItems: "center" },
  emptyIcon: { fontSize: "50px", marginBottom: "12px", opacity: 0.8 },
  emptyText: { color: "#64748b", fontSize: "14px", marginBottom: "16px", fontWeight: "500" },
  loginBtn: { background: "#ff9f00", color: "#fff", padding: "10px 28px", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "14px" },
  startShoppingBtn: { background: "#0c831f", color: "#fff", padding: "10px 28px", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "14px", boxShadow: "0 4px 12px rgba(12, 131, 31, 0.2)" },

  orderList: { display: "flex", flexDirection: "column", gap: "16px" }, 
  orderCard: { background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", overflow: "hidden" },
  
  cardTopRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px" }, 
  statusBox: { display: "flex", alignItems: "center" },
  dateText: { fontSize: "11px", color: "#64748b", fontWeight: "600" }, 
  cardDivider: { height: "1px", background: "#f1f5f9", margin: "0 14px" },
  
  cardBody: { padding: "14px" }, 
  orderTypeTag: { margin: "0 0 12px 0", fontSize: "11px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" },
  
  // --- Styles for Full Item List ---
  fullItemList: { display: "flex", flexDirection: "column", gap: "10px" },
  itemRow: { display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "10px", borderRadius: "10px", border: "1px solid #f1f5f9" },
  imgBox: { width: "50px", height: "50px", borderRadius: "8px", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  itemImg: { width: "100%", height: "100%", objectFit: "cover" },
  imgFallback: { fontSize: "20px", opacity: 0.5 },
  itemDetails: { display: "flex", flexDirection: "column", flex: 1 },
  itemName: { margin: "0 0 4px 0", fontSize: "14px", color: "#1e293b", fontWeight: "700", lineHeight: "1.3" },
  itemQty: { margin: 0, fontSize: "12px", color: "#64748b", fontWeight: "500" },
  
  itemNamesText: { margin: 0, fontSize: "13px", color: "#334155", lineHeight: "1.4" }, 
  
  cardBottomRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px" }, 
  totalBlock: { display: "flex", flexDirection: "column" },
  totalLabel: { fontSize: "10px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" },
  totalValue: { fontSize: "16px", color: "#0f172a", fontWeight: "800" }, 
  
  reorderBtn: { background: "#fff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }, 
};