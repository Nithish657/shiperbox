import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../api";

/**
 * FIX NOTES:
 * 1. Was showing 2 ads per "page" (paired side-by-side), which meant
 *    each ad image got squeezed to half width and looked different
 *    depending on screen width. Now shows exactly ONE ad at a time,
 *    full width.
 * 2. Switched to `aspect-ratio` so the slider's height scales proportionally 
 *    with its width. Increased aspect ratio to 10/6 and max-height to 280px 
 *    for a taller image presentation.
 * 3. Removed top margins to perfectly connect the #8ec5fc background with 
 *    the mobile header component.
 */
const AdsSlider = () => {
  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchAds = async () => {
      try {
        const res = await axios.get(`${API_URL}/ads`);
        if (!cancelled && res.data.success) setAds(res.data.ads);
      } catch (err) {
        console.log(err);
      }
    };
    fetchAds();
    return () => { cancelled = true; };
  }, []);

  // Auto-slide every 3 seconds
  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === ads.length - 1 ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [ads]);

  if (ads.length === 0) return null;

  return (
    <div style={styles.wrapper}>
      <div
        style={{
          ...styles.track,
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {ads.map((ad, i) => (
          <div key={ad.id ?? i} style={styles.slide}>
            <img src={ad.image} alt={ad.title || "Ad"} style={styles.image} />
          </div>
        ))}
      </div>

      {ads.length > 1 && (
        <div style={styles.dotsContainer}>
          {ads.map((_, index) => (
            <div
              key={index}
              onClick={() => setCurrentIndex(index)}
              style={currentIndex === index ? styles.activeDot : styles.inactiveDot}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdsSlider;

const styles = {
  wrapper: {
    width: "100%",
    // Increased proportion to give the image more height
    aspectRatio: "10 / 6",
    // Increased max-height guardrail so the banner can stretch taller
    maxHeight: "280px",
    overflow: "hidden",
    position: "relative",
    background: "#8ec5fc",
    boxSizing: "border-box",
    // Fixed invalid margin to smoothly connect with the header above
    marginTop: "-1px",
    paddingBottom: "30px",
  },
  track: {
    display: "flex",
    width: "100%",
    height: "100%",
    transition: "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)",
  },
  slide: {
    minWidth: "100%",
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "0 20px",
  },
  image: {
    width: "100%",
    height: "90%",
    boxSizing: "border-box",
    objectFit: "cover",
    display: "block",
    borderRadius: "16px",
    // Removed the 20px top margin so the image doesn't pull away from the header
    margin: "30px 0 0 0",
  },
  dotsContainer: {
    position: "absolute",
    bottom: "0",
    height: "20px",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "6px",
  },
  activeDot: {
    width: "18px",
    height: "5px",
    borderRadius: "4px",
    backgroundColor: "#2c3e50",
    transition: "all 0.3s ease",
    cursor: "pointer",
  },
  inactiveDot: {
    width: "5px",
    height: "5px",
    borderRadius: "50%",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    transition: "all 0.3s ease",
    cursor: "pointer",
  },
};