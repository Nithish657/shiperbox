import React, { useState, useEffect } from "react";
import LocationModal from "../components/LocationModal";

/**
 * FIX NOTES:
 * 1. localStorage can throw in private/incognito modes on some browsers —
 *    reads/writes are now wrapped so the component never crashes the page.
 * 2. Text was being truncated TWICE (manual .substring(0, 30) AND a CSS
 *    ellipsis) which cut words off oddly and behaved differently depending
 *    on font size / screen width. Now truncation is handled by CSS alone,
 *    which adapts correctly to every screen size instead of a fixed
 *    30-character cutoff.
 * 3. Removed the unused `icon` style / dead margin values, tightened
 *    spacing so the label and address line up consistently.
 */
const safeGet = (key, fallback = "") => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (_) {
    return fallback;
  }
};

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (_) {
    // localStorage unavailable (private mode / quota) — fail silently,
    // the in-memory state still updates for this session.
  }
};

export default function MobileLocation() {
  const [address, setAddress] = useState(() => safeGet("user_address", "Click to set location"));
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = safeGet("user_address", "");
      if (saved) setAddress(saved);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleSave = (newAddr) => {
    setAddress(newAddr);
    safeSet("user_address", newAddr);
    setShowModal(false);
    window.dispatchEvent(new Event("locationUpdated"));
  };

  return (
    <>
      <div
        style={styles.container}
        onClick={() => setShowModal(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setShowModal(true)}
      >
        <div style={styles.textGroup}>
          <span style={styles.deliverTo}>Deliver to</span>
          <span style={styles.address}>
            <span style={styles.arrowIcon}>▼</span>
            <span style={styles.addressText}>{address}</span>
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
    padding: "5px 0px",
    cursor: "pointer",
    borderRadius: "8px",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
  },
  textGroup: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    gap: "3px",
  },
  deliverTo: {
    margin: "0 0 2px 15px",
    opacity: 0.8,
    fontSize: "14px",
    textTransform: "",
    letterSpacing: "0.5px",
  },
  address: {
    fontWeight: "bold",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    minWidth: 0,
  },
  addressText: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },
  arrowIcon: {
    fontSize: "12px",
    opacity: 0.7,
    flexShrink: 0,
  }
};