import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
import { COLOR, FONT, RADIUS, EASE, EASE_SPRING } from "./mobiletheme";
import { useSwipe } from "./mobileMotion";

/**
 * FIX NOTES (kept from previous pass):
 * 1. Exactly one ad shown at a time, full width (was squeezed 2-up).
 * 2. `aspect-ratio` scales height proportionally with width.
 * 3. No stray top margin — connects cleanly to the header above.
 *
 * DESIGN: each slide reads as a shipping label pinned under the header —
 * a die-cut notch top-left, a mono "01 / 04" tracking counter top-right
 * (a real ordered position, not decoration), and the caption sitting in
 * a bottom gradient scrim. Progress reads as a slim filled rail rather
 * than plain dots, echoing the OTP progress rail from login.
 *
 * ORDER NOW: each ad carries a `category` key (matches the CATEGORIES
 * keys used on MobileHome, e.g. "vegetables", "flowers", "garland",
 * "courier", "accessories"). Tapping the button routes straight to that
 * category's page — keep this map in sync with MobileHome's CATEGORIES.
 */
const CATEGORY_PATHS = {
  garland: "/m-garland",
  courier: "/courier",
  vegetables: "/category/vegetables",
  flowers: "/category/flowers",
  accessories: "/category/mobile-accessories",
};

// Tolerate label-style or differently-formatted values coming from the
// backend (e.g. "Mobile Accessories", "mobile_accessories", "Flower Garland")
// instead of the exact key.
const CATEGORY_ALIASES = {
  "mobile accessories": "accessories",
  "mobile-accessories": "accessories",
  "mobile_accessories": "accessories",
  "flower garland": "garland",
  "1-day courier": "courier",
  "1 day courier": "courier",
};

const resolveCategoryPath = (rawCategory) => {
  if (!rawCategory) return null;
  const normalized = String(rawCategory).trim().toLowerCase();
  const key = CATEGORY_ALIASES[normalized] || normalized;
  return CATEGORY_PATHS[key] || null;
};

const AdsSlider = () => {
  const navigate = useNavigate();
  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const resumeTimerRef = useRef(null);

  const goTo = (index) => {
    if (ads.length === 0) return;
    setCurrentIndex(((index % ads.length) + ads.length) % ads.length);
  };

  const { offset, dragging, handlers } = useSwipe({
    onNext: () => goTo(currentIndex + 1),
    onPrev: () => goTo(currentIndex - 1),
  });

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

  useEffect(() => {
    if (ads.length <= 1 || !autoPlay) return undefined;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === ads.length - 1 ? 0 : prev + 1));
    }, 3500);
    return () => clearInterval(interval);
  }, [ads, autoPlay]);

  // Autoplay stays off for a beat after a swipe/tap so a slide the user
  // just chose doesn't get yanked away mid-read.
  const pauseAutoPlay = () => {
    setAutoPlay(false);
    clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setAutoPlay(true), 6000);
  };

  useEffect(() => () => clearTimeout(resumeTimerRef.current), []);

  if (ads.length === 0) return null;

  const goToAdCategory = (ad) => {
    const path = resolveCategoryPath(ad.category);
    if (path) {
      navigate(path);
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `[AdsSlider] "Order Now" tapped but ad.category ("${ad.category}") didn't match a known category. Ad payload:`,
        ad
      );
    }
  };

  return (
    <div style={styles.wrapper}>
      <style>{`
        @keyframes sb-adKenBurns { from { transform: scale(1); } to { transform: scale(1.06); } }
        .sb-ad-img-active { animation: sb-adKenBurns 4s ease-out both; }
        .sb-ad-order-btn { transition: transform 0.16s ${EASE_SPRING}, box-shadow 0.16s ${EASE}; }
        .sb-ad-order-btn:active { transform: scale(0.92); }
      `}</style>
      <div
        style={{
          ...styles.track,
          transform: `translate3d(calc(-${currentIndex * 100}% + ${offset}px), 0, 0)`,
          transition: dragging ? "none" : styles.track.transition,
        }}
        onTouchStart={(e) => { pauseAutoPlay(); handlers.onTouchStart(e); }}
        onTouchMove={handlers.onTouchMove}
        onTouchEnd={handlers.onTouchEnd}
        onTouchCancel={handlers.onTouchCancel}
      >
        {ads.map((ad, i) => (
          <div key={ad.id ?? i} style={styles.slide}>
            <div style={styles.card}>
              <img
                src={ad.image}
                alt={ad.title || "Ad"}
                style={styles.image}
                className={i === currentIndex ? "sb-ad-img-active" : undefined}
              />

              {/* die-cut notch, top-left — parcel-label signature */}
              <span style={styles.notch} />

              {/* mono tracking counter — real sequence position */}
              {ads.length > 1 && (
                <span style={styles.counter}>{String(i + 1).padStart(2, "0")} / {String(ads.length).padStart(2, "0")}</span>
              )}

              {/* bottom scrim + caption/CTA row — Order Now is always shown as the ad's call-to-action */}
              <div style={styles.scrim} />
              <div style={styles.captionWrap}>
                <div style={styles.captionTextCol}>
                  {ad.title && (
                    <>
                      <span style={styles.captionEyebrow}>FEATURED</span>
                      <span style={styles.captionText}>{ad.title}</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="sb-tap sb-ad-order-btn"
                  style={styles.orderBtn}
                  onClick={() => goToAdCategory(ad)}
                >
                  Order Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {ads.length > 1 && (
        <div style={styles.railTrack}>
          {ads.map((_, index) => (
            <div
              key={index}
              onClick={() => { pauseAutoPlay(); goTo(index); }}
              className="sb-tap"
              style={index === currentIndex ? styles.railSegActive : styles.railSeg}
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
    aspectRatio: "10 / 6",
    maxHeight: "280px",
    overflow: "hidden",
    position: "relative",
    background: COLOR.gradientHeader,
    boxSizing: "border-box",
    marginTop: "-1px",
    paddingBottom: "26px",
  },
  track: {
    display: "flex",
    width: "100%",
    height: "100%",
    transition: `transform 0.55s ${EASE}`,
  },
  slide: {
    minWidth: "100%",
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "18px 18px 0",
  },
  card: {
    position: "relative",
    width: "100%",
    height: "100%",
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    boxShadow: "0 16px 34px rgba(15,50,110,0.32), 0 2px 8px rgba(15,50,110,0.18)",
    background: "#0b1a33",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transformOrigin: "center",
  },
  notch: {
    position: "absolute",
    top: "10px",
    left: "10px",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    background: "rgba(11,26,51,0.55)",
    backdropFilter: "blur(2px)",
  },
  counter: {
    position: "absolute",
    top: "10px",
    right: "10px",
    fontFamily: FONT.mono,
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    color: "#fff",
    background: "rgba(11,26,51,0.55)",
    backdropFilter: "blur(2px)",
    padding: "4px 9px",
    borderRadius: RADIUS.pill,
  },
  scrim: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    height: "48%",
    background: "linear-gradient(to top, rgba(6,14,28,0.72) 0%, rgba(6,14,28,0.0) 100%)",
    pointerEvents: "none",
  },
  captionWrap: {
    position: "absolute",
    left: "14px",
    right: "14px",
    bottom: "12px",
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "10px",
  },
  captionTextCol: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    minWidth: 0,
    flex: 1,
  },
  orderBtn: {
    flexShrink: 0,
    fontFamily: FONT.mono,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#0b1a33",
    background: "#ffffff",
    border: "none",
    padding: "8px 14px",
    borderRadius: RADIUS.pill,
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
  },
  captionEyebrow: {
    fontFamily: FONT.mono,
    fontSize: "9.5px",
    fontWeight: 700,
    letterSpacing: "0.14em",
    color: COLOR.pop,
  },
  captionText: {
    fontFamily: FONT.display,
    fontSize: "15px",
    fontWeight: 700,
    color: "#fff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  railTrack: {
    position: "absolute",
    bottom: "0",
    height: "20px",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "5px",
  },
  railSegActive: {
    width: "22px",
    height: "4px",
    borderRadius: RADIUS.pill,
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    transition: `width 0.32s ${EASE_SPRING}, background-color 0.32s ${EASE}`,
    cursor: "pointer",
  },
  railSeg: {
    width: "9px",
    height: "4px",
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    transition: `width 0.32s ${EASE_SPRING}, background-color 0.32s ${EASE}`,
    cursor: "pointer",
  },
};