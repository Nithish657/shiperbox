import React, { useState, useEffect } from "react";
import LocationModal from "../components/LocationModal";

export default function MobileLocation() {
  const [address, setAddress] = useState(
    localStorage.getItem("user_address") || "Click to set location"
  );
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("user_address");
      if (saved) setAddress(saved);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleSave = (newAddr) => {
    setAddress(newAddr);
    localStorage.setItem("user_address", newAddr);
    setShowModal(false);
    window.dispatchEvent(new Event("locationUpdated"));
  };

  return (
    <>
      <div style={styles.container} onClick={() => setShowModal(true)}>
       
        <div style={styles.textGroup}>
          <span style={styles.deliverTo}>Deliver to</span>
          <span style={styles.address}>
            {/* Added arrow here with small margin-right */}
            <span style={styles.arrowIcon}>▼ </span>
            {address.length > 30 ? address.substring(0, 30) + "..." : address}
          </span>
        </div>
      </div>

      {showModal && (
        <LocationModal 
          onClose={() => setShowModal(false)} 
          onSelect={handleSave} 
        />
      )}
    </>
  );
}

const styles = {
  container: { 
    display: "flex", 
    alignItems: "center", 
    backgroundColor: "#8ec5fc", 
    color: "white", 
    padding: "5px 15px", // Improved padding for mobile
    cursor: "pointer",
    borderRadius: "8px"
  },
  icon: { 
    fontSize: "18px", 
    marginRight: "8px" // Added gap between icon and text
  },
  textGroup: { 
    display: "flex", 
    flexDirection: "column", 
    flex: 1,
    overflow: "hidden"
  },
  deliverTo: { 
    margin:"0px 0px 5px 15px",
    opacity: 0.8, 
    fontSize: "11px", // Smaller label for better hierarchy
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  address: { 
    
    fontWeight: "bold", 
    fontSize: "13px",
    whiteSpace: "nowrap", 
    overflow: "hidden", 
    textOverflow: "ellipsis",
    display: "flex",
    alignItems: "center"
  },
  arrowIcon: {
    fontSize: "12px", // Smaller arrow to fit perfectly
    marginRight: "4px",
    opacity: 0.7
  }
};