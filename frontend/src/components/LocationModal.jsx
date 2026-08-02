import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function LocationModal({ onClose, onSelect }) {
  // Step state: 1 = Detect/Search Area, 2 = Enter Flat & Building Name
  const [step, setStep] = useState(1);
  const [selectedArea, setSelectedArea] = useState("");
  const [flatNo, setFlatNo] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [loading, setLoading] = useState(false);

  // Autocomplete Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // Fetch OpenStreetMap (Nominatim) Autocomplete Suggestions (100% Free)
  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      const fetchSuggestions = async () => {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=5`;
          const res = await axios.get(url);
          
          if (res.data && res.data.length > 0) {
            setSuggestions(res.data);
          }
        } catch (err) {
          console.error("OSM Autocomplete error:", err);
        }
      };
      
      const timeoutId = setTimeout(() => { fetchSuggestions(); }, 600);
      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  // Handle User clicking an Autocomplete Suggestion
  const handlePlaceSelect = (place) => {
    setSelectedArea(place.display_name);
    setSearchQuery(""); 
    setStep(2); 
  };

  // Handle Current Location Detection (OSM Reverse Geocoding - 100% Free)
  const handleDetect = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported by this browser.");
    
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
        const res = await axios.get(url);
        
        if (res.data && res.data.display_name) {
          setSelectedArea(res.data.display_name);
          setStep(2); 
        } else {
          alert("Location found, but no address details were returned.");
        }
      } catch (err) {
        console.error("Reverse geocoding error:", err);
        alert("Could not fetch address for your location. Please check your internet connection.");
      } finally {
        setLoading(false);
      }
    }, (err) => {
      setLoading(false);
      console.error(err);
      alert("Permission denied. Please enable location access in your browser settings.");
    });
  };

  // Handle Final Exact Location Save
  const handleConfirmLocation = (e) => {
    e.preventDefault();
    if (!flatNo.trim() || !buildingName.trim()) {
      return alert("Please enter both Flat/House No. and Building Name.");
    }

    const fullExactAddress = `${flatNo.trim()}, ${buildingName.trim()}, ${selectedArea}`;
    
    onSelect(fullExactAddress);
    onClose();
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        
        {step === 1 ? (
          <>
            <h3 style={{ margin: "0 0 15px 0", textAlign: "center" }}>Select Location</h3>
            
            <button onClick={handleDetect} style={styles.detectBtn} disabled={loading}>
              {loading ? "📍 Detecting location..." : "📍 Use Current Location"}
            </button>

            <div style={{ textAlign: 'center', margin: '15px 0', color: '#888', fontSize: '14px' }}>OR</div>

            {/* Custom Free Search Bar */}
            <div style={{ position: "relative" }}>
              <input 
                type="text" 
                placeholder="Search for area, street, or landmark..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              
              {/* Autocomplete Dropdown */}
              {suggestions.length > 0 && (
                <ul style={styles.suggestionList}>
                  {suggestions.map((place, index) => (
                    <li 
                      key={index} 
                      onClick={() => handlePlaceSelect(place)}
                      style={styles.suggestionItem}
                    >
                      {place.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button onClick={onClose} style={styles.closeBtn}>Cancel</button>
          </>
        ) : (
          <form onSubmit={handleConfirmLocation}>
            <h3 style={{ margin: "0 0 10px 0", textAlign: "center" }}>Exact Doorstep Details</h3>
            
            <div style={styles.areaBox}>
              <strong>Area / Locality:</strong>
              <p style={{ margin: "4px 0 0 0", color: "#555", fontSize: "13px" }}>{selectedArea}</p>
            </div>

            <input 
              type="text" 
              placeholder="House / Flat / Door No. (e.g. Flat 402)" 
              value={flatNo}
              onChange={(e) => setFlatNo(e.target.value)}
              style={styles.input}
              required
            />

            <input 
              type="text" 
              placeholder="Building / Society Name (e.g. Ganesh Krupa Apts)" 
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              style={styles.input}
              required
            />

            <button type="submit" style={styles.confirmBtn}>
              Save Exact Location
            </button>

            <button type="button" onClick={() => setStep(1)} style={styles.backBtn}>
              ← Change Area / Search Again
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

const styles = {
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center" },
  modalContent: { background: "#fff", padding: "20px", borderRadius: "12px", width: "90%", maxWidth: "400px", boxShadow: "0 4px 15px rgba(0,0,0,0.3)" },
  detectBtn: { width: "100%", padding: "12px", background: "#2874f0", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" },
  searchInput: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px", boxSizing: "border-box" },
  suggestionList: { listStyleType: "none", margin: 0, padding: 0, border: "1px solid #ddd", borderRadius: "8px", maxHeight: "150px", overflowY: "auto", position: "absolute", width: "100%", background: "#fff", zIndex: 10 },
  suggestionItem: { padding: "10px", borderBottom: "1px solid #eee", cursor: "pointer", fontSize: "13px", color: "#333" },
  areaBox: { background: "#f5f5f5", padding: "10px", borderRadius: "8px", marginBottom: "15px", fontSize: "14px" },
  input: { width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px", boxSizing: "border-box" },
  confirmBtn: { width: "100%", padding: "12px", background: "#0c831f", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", marginTop: "5px" },
  backBtn: { width: "100%", padding: "8px", background: "transparent", color: "#555", border: "none", cursor: "pointer", marginTop: "10px", fontSize: "13px" },
  closeBtn: { marginTop: "20px", width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", background: "#f8f8f8", cursor: "pointer" }
};