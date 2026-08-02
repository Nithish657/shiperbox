import React, { useState } from "react";
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
  onLoginClick
}) {
  const navigate = useNavigate();
  
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [transcript, setTranscript] = useState("Listening...");
  const [isListening, setIsListening] = useState(false);
  
  const isHome = activeTab === "home"; 

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Your browser does not support voice search.");
      return;
    }

    const recognition = new SpeechRecognition();
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

        setTimeout(() => {
          setShowVoiceModal(false);
          navigate(`/search?q=${encodeURIComponent(cleanText)}`);
        }, 600);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      if (event.error === "no-speech") {
        setTranscript("Didn't catch that. Try speaking again.");
      } else {
        setTranscript("Microphone error. Please try again.");
      }
      setIsListening(false);
      
      setTimeout(() => {
        setShowVoiceModal(false);
      }, 2500);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const closeVoiceModal = () => {
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
      <path d="M7.5 7a4.5 4.5 0 0 1 9 0v4.5a4.5 4.5 0 0 1-9 0V7z" fill=" #79bcff" />
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

  return (
    <>
      <style>
        {`
          @keyframes pulseGlow {
            0% { box-shadow: 0 0 0 0 rgba(40, 116, 240, 0.4); }
            70% { box-shadow: 0 0 0 20px rgba(40, 116, 240, 0); }
            100% { box-shadow: 0 0 0 0 rgba(40, 116, 240, 0); }
          }
        `}
      </style>

      {showVoiceModal && (
        <div style={styles.voiceOverlay} onClick={closeVoiceModal}>
          <div style={styles.voiceModal} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeModalBtn} onClick={closeVoiceModal}>✕</button>
            
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

      <div style={styles.fixedHeader}>
        {(showLogo || showLocation) && (
          <div style={styles.headerTop}>
            {showLogo && (
              <h2 style={styles.logo} onClick={() => navigate("/")}>ShiperBox</h2>
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

        <div style={isHome ? styles.searchRowHome : styles.searchRowCart}>
          <div style={isHome ? styles.searchBoxHome : styles.searchBoxCart}>
            <div style={styles.searchIconWrapper}><SearchIcon size={16} /></div>
            <input 
              type="text" 
              placeholder="Search..." 
              style={isHome ? styles.searchInputHome : styles.searchInputCart} 
              value={searchValue} 
              onChange={(e) => setSearchValue && setSearchValue(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && onSearch && onSearch()}
            />
          </div>
          
          <button 
            style={isHome ? styles.micBtnHome : styles.micBtnCart} 
            onClick={handleVoiceSearch} 
          >
            <MicIcon size={20} />
          </button>
        </div>

        {showTitleBar && (
          <div style={styles.headerBottom}>
            {title && <h3 style={styles.categoryTitle}>{title.toUpperCase()}</h3>}
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  fixedHeader: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, display: "flex", flexDirection: "column", backgroundColor: "#8ec5fc" },
  headerTop: { display: "flex", alignItems: "stretch", gap: "5px", backgroundColor: " #8ec5fc", boxSizing: "border-box", padding: "12px 0" },
  logo: { margin: 0, padding: "12px 26px", fontSize: "23px", color: "#fff", cursor: "pointer", flexShrink: 0, fontWeight: "bold", display: "flex", alignItems: "center" },
  locationSlot: { flex: 1, display: "flex", alignItems: "center", minWidth: 0, paddingRight: "10px" },
  searchIconWrapper: { paddingLeft: "12px", display: "flex", alignItems: "center", justifyContent: "center" },

  loginWrapper: { display: "flex", justifyContent: "flex-end", width: "100%", paddingRight: "5px" },
  loginBtn: { backgroundColor: "#ff9f00", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "8px", fontWeight: "bold", fontSize: "14px", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" },

  searchRowHome: { display: "flex", alignItems: "center", gap: "10px", padding: "1px 16px", backgroundColor: "#8ec5fc", boxSizing: "border-box" },
  searchBoxHome: { margin: "5px 10px 10px 10px", flex: 1, height: "36px", display: "flex", alignItems: "center", backgroundColor: "#fff", border: "2px solid #ffffff", borderRadius: "10px", overflow: "hidden", boxSizing: "border-box", gap: "8px" },
  searchInputHome: { flex: 1, border: "none", padding: "0 10px 0 0", outline: "none", fontSize: "15px", background: "transparent", color: "#222" },
  micBtnHome: { margin: "5px 12px 7px 0px", width: "35px", height: "35px", border: "none", borderRadius: "50%", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },

  searchRowCart: { display: "flex", alignItems: "center", flex: 1, gap: "8px", backgroundColor: "#8ec5fc" },
  searchBoxCart: { margin: "25px 10px 10px 25px", flex: 1, height: "36px", display: "flex", alignItems: "center", backgroundColor: "#ffffff", borderRadius: "10px", overflow: "hidden" },
  searchInputCart: { flex: 1, border: "none", padding: "0 10px", outline: "none", fontSize: "13px", background: "transparent", color: "black" },
  micBtnCart: { margin: "25px 30px 10px 0px", width: "36px", height: "36px", border: "none", borderRadius: "50%", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },

  headerBottom: { display: "flex", alignItems: "center", justifyContent: "center", height: "50px", backgroundColor: "#ffffff", color: "#000000", borderBottom: "1px solid #ddd", boxSizing: "border-box" },
  categoryTitle: { margin: 0, fontSize: "16px", fontWeight: "bold", letterSpacing: "0.5px" },

  voiceOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn 0.2s ease" },
  voiceModal: { width: "100%", backgroundColor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "30px 20px 50px 20px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", boxShadow: "0 -4px 15px rgba(0,0,0,0.2)" },
  closeModalBtn: { position: "absolute", top: "15px", right: "20px", background: "none", border: "none", fontSize: "20px", color: "#666", cursor: "pointer", padding: "5px" },
  voiceTitle: { margin: "0 0 15px 0", fontSize: "18px", fontWeight: "bold", color: "#333" },
  voiceTranscript: { fontSize: "22px", textAlign: "center", minHeight: "60px", margin: "0 0 30px 0", display: "flex", alignItems: "center", fontStyle: "italic", maxWidth: "85%" },
  bigMicContainer: { width: "70px", height: "70px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.3s ease" }
};