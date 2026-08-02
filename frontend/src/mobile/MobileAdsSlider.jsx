import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../api";

export default function MobileAdsSlider() {
  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    axios.get(`${API_URL}/ads`).then(res => { 
      if (res.data.success) setAds(res.data.ads); 
    });
  }, []);

  useEffect(() => {
    if (ads.length === 0) return;
    const int = setInterval(() => setCurrentIndex(prev => (prev === ads.length - 1 ? 0 : prev + 1)), 4000);
    return () => clearInterval(int);
  }, [ads]);

  if (ads.length === 0) return null;

  return (
    <div style={styles.wrapper}>
      <div style={{ ...styles.track, transform: `translateX(-${currentIndex * 100}%)` }}>
        {ads.map((ad, i) => (
          <div key={i} style={styles.slide}>
            <img src={ad.image} alt="Promotion" style={styles.image} />
          </div>
        ))}
      </div>
      
      {/* Redesigned Pagination Dots */}
      <div style={styles.dotsContainer}>
        {ads.map((_, i) => (
          <div 
            key={i} 
            style={currentIndex === i ? styles.activeDot : styles.inactiveDot} 
          />
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrapper: { 
    width: "100%", 
    height: "300px", 
    overflow: "hidden", 
    position: "relative", 
    background: " #8ec5fc ", // Premium gradient background
    padding: "15px 0 25px 0",
    boxSizing: "border-box"
  },
  track: { 
    display: "flex", 
    width: "100%", 
    height: "100%", 
    transition: "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)" // Smoother, spring-like transition
  },
  slide: { 
    minWidth: "100%", 
    height: "110%", 
    padding: "10px 29px", // Adds padding so the image doesn't touch screen edges
    boxSizing: "border-box",
    display: "flex",          
    justifyContent: "center", 
    alignItems: "center"      
  },
  image: { 
    width: "100%",
    height: "80%",
    boxSizing: "border-box",
    backgroundColor: "#fff",
    objectFit: "cover",     // 'cover' often looks better for modern UI if ad dimensions allow it
    borderRadius: "16px",   // Softer, modern rounded corners
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)" // Beautiful floating depth effect
  },
  dotsContainer: { 
    position: "absolute", 
    bottom: "12px", 
    width: "100%", 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center",
    gap: "8px" 
  },
  activeDot: { 
    width: "22px", // Pill shape for the active slide
    height: "6px", 
    borderRadius: "4px", 
    backgroundColor: "#2c3e50", // Bold active color
    transition: "all 0.3s ease" 
  },
  inactiveDot: {
    width: "6px", 
    height: "6px", 
    borderRadius: "50%", 
    backgroundColor: "rgba(255, 255, 255, 0.7)", // Semi-transparent for inactive
    transition: "all 0.3s ease" 
  }
};