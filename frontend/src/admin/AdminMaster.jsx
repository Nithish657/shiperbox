import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";
import AdminGarlandReview from "./AdminGarlandReview";
import AdminCourierReview from "./AdminCourierReview";

export default function AdminMaster() {
  const [activeTab, setActiveTab] = useState("items");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  };

  return (
    <div style={styles.container}>
      {/* Sidebar / Top Navigation */}
      <div style={styles.navBar}>
        <h1 style={styles.logo}>Admin Portal</h1>
        <div style={styles.navLinks}>
          <button 
            style={activeTab === "items" ? styles.activeBtn : styles.btn} 
            onClick={() => setActiveTab("items")}
          >
            Manage Items & Groceries
          </button>
          <button 
            style={activeTab === "garland" ? styles.activeBtn : styles.btn} 
            onClick={() => setActiveTab("garland")}
          >
            Garland Requests
          </button>
          <button 
            style={activeTab === "courier" ? styles.activeBtn : styles.btn} 
            onClick={() => setActiveTab("courier")}
          >
            Courier Requests
          </button>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>

      {/* Render the active component */}
      <div style={styles.contentArea}>
        {activeTab === "items" && <AdminDashboard />}
        {activeTab === "garland" && <AdminGarlandReview />}
        {activeTab === "courier" && <AdminCourierReview />}
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "Arial, sans-serif",
    minHeight: "100vh",
    backgroundColor: "#f4f6f8"
  },
  navBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1f2937",
    padding: "15px 30px",
    color: "white",
    flexWrap: "wrap",
    gap: "10px"
  },
  logo: {
    margin: 0,
    fontSize: "20px"
  },
  navLinks: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },
  btn: {
    background: "transparent",
    color: "#9ca3af",
    border: "none",
    padding: "8px 16px",
    fontSize: "16px",
    cursor: "pointer",
    borderRadius: "6px",
    fontWeight: "500"
  },
  activeBtn: {
    background: "#374151",
    color: "white",
    border: "none",
    padding: "8px 16px",
    fontSize: "16px",
    cursor: "pointer",
    borderRadius: "6px",
    fontWeight: "bold"
  },
  logoutBtn: {
    backgroundColor: "#ef4444",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold"
  },
  contentArea: {
    padding: "20px",
    maxWidth: "1400px",
    margin: "0 auto"
  }
};