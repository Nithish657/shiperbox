import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_URL } from "../api";

const AdsSlider = () => {
  const [ads, setAds] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const sliderRef = useRef(null);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const res = await axios.get(`${API_URL}/ads`);
        if (res.data.success) setAds(res.data.ads);
      } catch (err) {
        console.log(err);
      }
    };
    fetchAds();
  }, []);

  // Group ads into pairs — each pair is one "page" of the slider
  const pages = [];
  for (let i = 0; i < ads.length; i += 2) {
    pages.push(ads.slice(i, i + 2));
  }

  // Auto-slide every 3 seconds
  useEffect(() => {
    if (pages.length === 0) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 3000);
    return () => clearInterval(interval);
  }, [ads, currentPage]);

  const nextSlide = () => {
    setCurrentPage((prev) => (prev === pages.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentPage((prev) => (prev === 0 ? pages.length - 1 : prev - 1));
  };

  if (ads.length === 0) return null;

  return (
    <div style={styles.wrapper}>
      <div
        ref={sliderRef}
        style={{
          ...styles.track,
          transform: `translateX(-${currentPage * 100}%)`,
        }}
      >
        {pages.map((pair, pageIndex) => (
          <div key={pageIndex} style={styles.page}>
            {pair.map((ad, i) => (
              <div 
  key={i} 
  style={{
    ...styles.slide,
    justifyContent: pair.length === 1 ? "center" : (i === 0 ? "flex-end" : "flex-start")
  }}
>
                <img src={ad.image} alt={ad.title || "Ad"} style={styles.image} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={styles.dotsContainer}>
        {pages.map((_, index) => (
          <div
            key={index}
            onClick={() => setCurrentPage(index)}
            style={currentPage === index ? styles.activeDot : styles.inactiveDot}
          />
        ))}
      </div>
    </div>
  );
};

export default AdsSlider;

const styles = {
  wrapper: {
    width: "100%",
    height: "500px", // Keeps the container large
    overflow: "hidden",
    position: "relative",
    background: "#8ec5fc",
    boxSizing: "border-box",
  },
  track: {
    display: "flex",
    width: "100%",
    height: "100%",
    transition: "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)",
  },
page: {
    minWidth: "100%",
    height: "100%",
    display: "flex",
    gap: "24px", // <-- This controls the exact gap between the two images
    boxSizing: "border-box",
    padding: "30px 12px 40px 12px",
  },
  slide: {
    flex: 1,
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center", 
    overflow: "hidden",
    // NOTE: Make sure 'justifyContent' is completely removed from here!
  },
  image: {
    maxHeight: "100%",
    maxWidth: "100%",
    objectFit: "contain", // <-- Make sure this says 'contain', not 'cover'
    display: "block",
    borderRadius: "16px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  },
  dotsContainer: {
    position: "absolute",
    bottom: "16px",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
  },
  activeDot: {
    width: "22px",
    height: "6px",
    borderRadius: "4px",
    backgroundColor: "#2c3e50",
    transition: "all 0.3s ease",
    cursor: "pointer",
  },
  inactiveDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    transition: "all 0.3s ease",
    cursor: "pointer",
  },
  left: {
    position: "absolute", top: "50%", left: "5px", transform: "translateY(-50%)",
    padding: "12px 16px", fontSize: "20px",
    background: "rgba(255,255,255,0.35)", backdropFilter: "blur(4px)",
    border: "none", borderRadius: "50%", color: "#2c3e50",
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    transition: "background 0.2s",
  },
  right: {
    position: "absolute", top: "50%", right: "5px", transform: "translateY(-50%)",
    padding: "12px 16px", fontSize: "20px",
    background: "rgba(255,255,255,0.35)", backdropFilter: "blur(4px)",
    border: "none", borderRadius: "50%", color: "#2c3e50",
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    transition: "background 0.2s",
  },
};