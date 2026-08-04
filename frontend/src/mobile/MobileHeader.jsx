import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileLocation from "./MobileLocation";

export default function MobileHeader({
  searchValue,
  setSearchValue,
  onSearch,
  showLocation = false,
  showLogo = true,
  showTitleBar = false,
  title = "",
  activeTab = "home",
  isLoggedIn = true,
  onLoginClick,
  onHeightChange,
  showBackButton = false,
  onBack,
}) {
  const navigate = useNavigate();

  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [transcript, setTranscript] = useState("Listening...");
  const [isListening, setIsListening] = useState(false);

  const headerRef = useRef(null);
  const recognitionRef = useRef(null);
  const navTimeoutRef = useRef(null);

  // Auto-detects if this is the Home page because Home has both Logo and Location active
  const isHomeSearch = showLogo && showLocation;

  useEffect(() => {
    if (!headerRef.current || !onHeightChange) return;
    const el = headerRef.current;

    const report = () => onHeightChange(el.offsetHeight);
    report();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(report);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", report);
    return () => window.removeEventListener("resize", report);
  }, [onHeightChange, showLocation, showLogo, showTitleBar, title, showBackButton]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Your browser does not support voice search.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    setShowVoiceModal(true);
    setTranscript("Listening...");
    setIsListening(true);

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const displayText = finalTranscript || interimTranscript;
      setTranscript(displayText);

      if (finalTranscript) {
        const cleanText = finalTranscript.replace(/\.$/, "").trim();
        setIsListening(false);

        if (setSearchValue) {
          setSearchValue(cleanText);
        }

        navTimeoutRef.current = setTimeout(() => {
          setShowVoiceModal(false);
          navigate(`/search?q=${encodeURIComponent(cleanText)}`);
        }, 600);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        setTranscript("Didn't catch that. Try speaking again.");
      } else {
        setTranscript("Microphone error. Please try again.");
      }
      setIsListening(false);

      navTimeoutRef.current = setTimeout(() => {
        setShowVoiceModal(false);
      }, 2500);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const closeVoiceModal = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setShowVoiceModal(false);
    setIsListening(false);
  };

  // --- CUSTOM SVG ICONS ---
  const SearchIcon = ({ size = 18, color = "#333" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.5" cy="10.5" r="7" />
      <line x1="20.5" y1="20.5" x2="15.8" y2="15.8" />
      <circle cx="8" cy="8" r="1.4" fill={color} stroke="none" />
    </svg>
  );

  const MicIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 7a4.5 4.5 0 0 1 9 0v4.5a4.5 4.5 0 0 1-9 0V7z" fill="#79bcff" />
      <circle cx="12" cy="5.5" r="1.2" fill="#333" />
      <path d="M7.5 10.5l4.5 2 4.5-2" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M8 22h8" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const BigMicIcon = ({ size = 34 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill="#79bcff" />
      <circle cx="12" cy="6" r="1.2" fill="#333" />
      <path d="M8.5 10.5l3.5 1.6 3.5-1.6" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 12v0.5a6.5 6.5 0 0 0 13 0V12" stroke="#333" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );

  const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="20" y1="12" x2="4" y2="12"></line>
      <polyline points="10 18 4 12 10 6"></polyline>
    </svg>
  );

  return (
    <>
      <style>
        {`
          @keyframes pulseGlow {
            0% { box-shadow: 0 0 0 0 rgba(40, 116, 240, 0.4); }
            70% { box-shadow: 0 0 0 20px rgba(40, 116, 240, 0); }
            100% { box-shadow: 0 0 0 0 rgba(40, 116, 240, 0); }
          }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}
      </style>

      {/* Voice Search Modal */}
      {showVoiceModal && (
        <div style={styles.voiceOverlay} onClick={closeVoiceModal}>
          <div style={styles.voiceModal} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeModalBtn} onClick={closeVoiceModal} aria-label="Close voice search">✕</button>

            <h3 style={styles.voiceTitle}>
              {isListening ? "Speak now" : "Processing"}
            </h3>

            <p style={{
              ...styles.voiceTranscript,
              color: transcript === "Listening..." ? "#888" : "#222"
            }}>
              {transcript}
            </p>

            <div style={{
              ...styles.bigMicContainer,
              animation: isListening ? "pulseGlow 1.5s infinite" : "none",
              backgroundColor: isListening ? "#2874f0" : "#ccc"
            }}>
              <BigMicIcon size={34} />
            </div>
          </div>
        </div>
      )}

      {/* Fixed Header Bar */}
      <div ref={headerRef} style={styles.fixedHeader}>
        {(showLogo || showLocation) && (
          <div style={styles.headerTop}>
            {showLogo && (
              <h2 style={styles.logo} onClick={() => navigate("/")}>Shiperbox</h2>
            )}
            {showLocation && (
              <div style={styles.locationSlot}>
                {isLoggedIn ? (
                  <MobileLocation />
                ) : (
                  <div style={styles.loginWrapper}>
                    <button style={styles.loginBtn} onClick={onLoginClick}>
                      Login
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Search Row (Switches between Home style and Inner Page style) */}
        <div style={isHomeSearch ? styles.searchRowHome : styles.searchRowOther}>
          <div style={isHomeSearch ? styles.searchBoxHome : styles.searchBoxOther}>
            <div style={styles.searchIconWrapper}><SearchIcon size={16} /></div>
            <input
              type="search"
              placeholder="Search..."
              style={isHomeSearch ? styles.searchInputHome : styles.searchInputOther}
              value={searchValue}
              onChange={(e) => setSearchValue && setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch && onSearch()}
              aria-label="Search products"
            />
          </div>

          <button
            style={isHomeSearch ? styles.micBtnHome : styles.micBtnOther}
            onClick={handleVoiceSearch}
            aria-label="Search by voice"
            type="button"
          >
            <MicIcon size={20} />
          </button>
        </div>

        {showTitleBar && (
          <div style={styles.headerBottom}>
            {showBackButton ? (
              <button style={styles.backBtn} onClick={onBack} aria-label="Go back">
                <BackArrowIcon />
              </button>
            ) : (
              <div style={{ width: "24px" }}></div>
            )}
            
            {title && <h3 style={styles.categoryTitle}>{title.toUpperCase()}</h3>}
            
            <div style={{ width: "24px" }}></div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  fixedHeader: {
    position: "fixed", 
    top: 0, 
    left: 0, 
    right: 0, 
    zIndex: 1000,
    display: "flex", 
    flexDirection: "column", 
    backgroundColor: "#8ec5fc",
    paddingTop: "env(safe-area-inset-top, 0px)",
    boxSizing: "border-box",
  },
  headerTop: { display: "flex", alignItems: "stretch", gap: "5px", backgroundColor: "#8ec5fc", boxSizing: "border-box", padding: "12px 0", flexWrap: "wrap" },
  logo: { margin: 0, padding: "12px clamp(14px, 5vw, 26px)", fontSize: "clamp(25px, 5.5vw, 24px)", color: "#fff", cursor: "pointer", flexShrink: 0, fontWeight: "bold", display: "flex", alignItems: "center" },
  locationSlot: { flex: 1, display: "flex", alignItems: "center", minWidth: 0, paddingRight: "10px" },
  searchIconWrapper: { paddingLeft: "12px", display: "flex", alignItems: "center", justifyContent: "center" },

  loginWrapper: { display: "flex", justifyContent: "flex-end", width: "100%", paddingRight: "5px" },
  loginBtn: { backgroundColor: "#ff9f00", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "8px", fontWeight: "bold", fontSize: "14px", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" },

  // --- 1. HOME SEARCH STYLES (Kept exactly as original) ---
  searchRowHome: { display: "flex", alignItems: "center", gap: "10px", padding: "1px 16px", backgroundColor: "#8ec5fc", boxSizing: "border-box" },
  searchBoxHome: { margin: "5px 10px 10px 10px", flex: 1, minWidth: 0, height: "36px", display: "flex", alignItems: "center", backgroundColor: "#fff", border: "2px solid #ffffff", borderRadius: "10px", overflow: "hidden", boxSizing: "border-box", gap: "8px" },
  searchInputHome: { flex: 1, minWidth: 0, border: "none", padding: "0 10px 0 0", outline: "none", fontSize: "15px", background: "transparent", color: "#222" },
  micBtnHome: { margin: "5px 12px 7px 0px", width: "35px", height: "35px", border: "none", borderRadius: "50%", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },

  // --- 2. INNER PAGE SEARCH STYLES (Garland, ItemList, Cart, Courier) ---
  searchRowOther: { display: "flex", alignItems: "center", gap: "12px", padding: "18px 16px 12px 16px", backgroundColor: "#8ec5fc", boxSizing: "border-box", width: "100%" },
  searchBoxOther: { flex: 1, minWidth: 0, height: "38px", display: "flex", alignItems: "center", backgroundColor: "#fff", borderRadius: "10px", overflow: "hidden", boxSizing: "border-box", gap: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  searchInputOther: { flex: 1, minWidth: 0, border: "none", padding: "0 10px 0 0", outline: "none", fontSize: "14px", background: "transparent", color: "#222" },
  micBtnOther: { width: "38px", height: "38px", border: "none", borderRadius: "50%", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },

  headerBottom: { display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "clamp(38px, 10vw, 46px)", backgroundColor: "#8ec5fc", color: "#ffffff", boxSizing: "border-box", padding: "5px 12px" },
  categoryTitle: { margin: 0, fontSize: "clamp(13px, 4vw, 15px)", fontWeight: "850", letterSpacing: "0.5px", textAlign: "center", color: "#ffffff" },
  
  backBtn: { background: "none", border: "none", cursor: "pointer", padding: 0, margin: "0 0 0 10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" },

  voiceOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn 0.2s ease" },
  voiceModal: { width: "100%", backgroundColor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "30px 20px calc(50px + env(safe-area-inset-bottom, 0px)) 20px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", boxShadow: "0 -4px 15px rgba(0,0,0,0.2)", boxSizing: "border-box" },
  closeModalBtn: { position: "absolute", top: "15px", right: "20px", background: "none", border: "none", fontSize: "20px", color: "#666", cursor: "pointer", padding: "5px" },
  voiceTitle: { margin: "0 0 15px 0", fontSize: "18px", fontWeight: "bold", color: "#333" },
  voiceTranscript: { fontSize: "22px", textAlign: "center", minHeight: "60px", margin: "0 0 30px 0", display: "flex", alignItems: "center", fontStyle: "italic", maxWidth: "85%", wordBreak: "break-word" },
  bigMicContainer: { width: "70px", height: "70px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.3s ease", flexShrink: 0 }
};