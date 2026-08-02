import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api";

export default function Address() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const user_id = localStorage.getItem("phone") || "guest";
  const navigate = useNavigate();

  useEffect(() => {
    if (user_id === "guest") {
      setLoading(false);
      return;
    }
    fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user_id]);

  const fetchAddresses = async () => {
    try {
      const res = await axios.get(`${API_URL}/address/${encodeURIComponent(user_id)}`);
      if (res.data.success) {
        setAddresses(res.data.addresses || []);
      }
    } catch (err) {
      console.error("Failed to fetch addresses", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteAddress = async (id) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    try {
      await axios.delete(`${API_URL}/address/${id}`);
      fetchAddresses(); // Refresh the list
    } catch (err) {
      alert("Failed to delete address");
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>&#8592;</button>
        <h2 style={styles.headerTitle}>My Addresses</h2>
        <div style={{ width: "24px" }}></div>
      </div>

      <div style={styles.content}>
        {loading ? (
          <p style={styles.statusText}>Loading your addresses...</p>
        ) : user_id === "guest" ? (
          <div style={styles.emptyState}>
            <p>Please log in to view your saved addresses.</p>
            <button style={styles.primaryBtn} onClick={() => navigate("/login")}>Login</button>
          </div>
        ) : addresses.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.iconPlaceholder}>📍</div>
            <h3>No Addresses Found</h3>
            <p style={{ color: "#666" }}>You haven't saved any addresses yet. Place an order to save your address automatically!</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {addresses.map((addr) => (
              <div key={addr.id} style={styles.addressCard}>
                {addr.is_default === 1 && (
                  <span style={styles.defaultBadge}>Default Address</span>
                )}
                <div style={styles.cardHeader}>
                  <h3 style={styles.name}>{addr.full_name || "Saved Address"}</h3>
                  <span style={styles.label}>{addr.label || "Home"}</span>
                </div>
                
                <p style={styles.details}>
                  {addr.building && <>{addr.building},<br/></>}
                  {addr.street && <>{addr.street}<br/></>}
                  {addr.landmark && <>{addr.landmark}<br/></>}
                  {addr.city} - {addr.postal_code}
                </p>
                
                <p style={styles.phone}>📞 +91 {addr.phone}</p>
                {addr.alt_phone && <p style={styles.phone}>📞 +91 {addr.alt_phone} (Alt)</p>}

                <div style={styles.actions}>
                  <button style={styles.deleteBtn} onClick={() => deleteAddress(addr.id)}>
                    Delete Address
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  pageContainer: { 
    minHeight: "100vh", 
    backgroundColor: "#f5f6f8", 
    fontFamily: "sans-serif" 
  },
  header: { 
    position: "fixed", 
    top: 0, left: 0, right: 0, 
    height: "60px", 
    backgroundColor: "#8ec5fc", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "space-between", 
    padding: "0 20px", 
    zIndex: 100,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
  },
  backBtn: { 
    background: "none", 
    border: "none", 
    fontSize: "24px", 
    color: "#fff", 
    cursor: "pointer", 
    padding: 0 
  },
  headerTitle: { 
    margin: 0, 
    fontSize: "18px", 
    color: "#fff", 
    fontWeight: "bold" 
  },
  content: { 
    padding: "80px 20px 40px", 
    maxWidth: "800px", 
    margin: "0 auto" 
  },
  statusText: { 
    textAlign: "center", 
    marginTop: "40px", 
    color: "#666", 
    fontSize: "16px" 
  },
  emptyState: { 
    textAlign: "center", 
    marginTop: "60px", 
    backgroundColor: "#fff", 
    padding: "40px 20px", 
    borderRadius: "16px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.03)"
  },
  iconPlaceholder: { 
    fontSize: "50px", 
    marginBottom: "15px" 
  },
  primaryBtn: { 
    backgroundColor: "#8ec5fc", 
    color: "#fff", 
    border: "none", 
    padding: "12px 24px", 
    borderRadius: "8px", 
    fontWeight: "bold", 
    marginTop: "15px", 
    cursor: "pointer" 
  },
  grid: { 
    display: "flex", 
    flexDirection: "column", 
    gap: "15px" 
  },
  addressCard: { 
    backgroundColor: "#fff", 
    borderRadius: "16px", 
    padding: "20px", 
    boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
    position: "relative"
  },
  defaultBadge: { 
    position: "absolute", 
    top: "-10px", 
    right: "20px", 
    backgroundColor: "#0c831f", 
    color: "#fff", 
    fontSize: "11px", 
    fontWeight: "bold", 
    padding: "4px 10px", 
    borderRadius: "12px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
  },
  cardHeader: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: "10px" 
  },
  name: { 
    margin: 0, 
    fontSize: "16px", 
    fontWeight: "bold", 
    color: "#222" 
  },
  label: { 
    backgroundColor: "#eaf1fe", 
    color: "#2874f0", 
    fontSize: "12px", 
    fontWeight: "bold", 
    padding: "4px 8px", 
    borderRadius: "6px" 
  },
  details: { 
    margin: "0 0 10px", 
    fontSize: "14px", 
    color: "#555", 
    lineHeight: "1.5" 
  },
  phone: { 
    margin: "0 0 4px", 
    fontSize: "14px", 
    color: "#333", 
    fontWeight: "600" 
  },
  actions: { 
    marginTop: "15px", 
    paddingTop: "15px", 
    borderTop: "1px solid #eee", 
    display: "flex", 
    justifyContent: "flex-end" 
  },
  deleteBtn: { 
    backgroundColor: "#fff2f2", 
    color: "#e53935", 
    border: "none", 
    padding: "8px 16px", 
    borderRadius: "8px", 
    fontWeight: "bold", 
    cursor: "pointer",
    fontSize: "13px"
  }
};