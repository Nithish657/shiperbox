import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileLocation from "./MobileLocation";
import { COLOR, FONT, RADIUS, EASE, EASE_SPRING, GlobalMobileStyles } from "./mobiletheme";
import { useScrollDirection } from "./mobileMotion";

const SEARCH_HINTS = ["tomatoes", "rose bouquet", "jasmine garland", "1-day courier", "phone case"];

export default function MobileHeader({
  searchValue, setSearchValue, onSearch,
  showLocation = false, showLogo = true, showTitleBar = false,
  title = "", activeTab = "home", isLoggedIn = true,
  onLoginClick, onHeightChange, showBackButton = false, onBack,
}) {
  const navigate = useNavigate();

  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [transcript, setTranscript] = useState("Listening...");
  const [isListening, setIsListening] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  const { scrolled } = useScrollDirection(28);
  const compact = scrolled && !searchFocused;

  const headerRef = useRef(null);
  const gradientRef = useRef(null);
  const recognitionRef = useRef(null);
  const navTimeoutRef = useRef(null);
  const [gradientHeight, setGradientHeight] = useState(0);

  const isHomeSearch = showLogo && showLocation;
  const showHint = !searchValue && !searchFocused;

  // Height of the floating title strip (see headerBottom) plus a visual gap
  // we want between that strip and the content below it.
  const TITLE_BAR_HEIGHT = 44;
  const TITLE_BAR_GAP = 14;

  // Reports the space MobileItemsList needs to reserve above its content.
  // The blue gradient area's own height always counts; when the title strip
  // is shown it floats *over* the content (see headerBottom below) rather
  // than pushing the layout down, so we add its height plus a small gap on
  // top of the gradient height here - otherwise the first row of content
  // ends up hidden behind/flush against the floating title strip.
  useEffect(() => {
    if (!gradientRef.current) return;
    const el = gradientRef.current;
    const report = () => {
      const h = el.offsetHeight;
      setGradientHeight(h);
      const reserved = showTitleBar ? h + TITLE_BAR_HEIGHT + TITLE_BAR_GAP : h;
      if (onHeightChange) onHeightChange(reserved);
    };
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
    if (!showHint) return undefined;
    const id = setInterval(() => setHintIndex((i) => (i + 1) % SEARCH_HINTS.length), 2200);
    return () => clearInterval(id);
  }, [showHint]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (_) {}
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Your browser does not support voice search.");

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    setShowVoiceModal(true);
    setTranscript("Listening...");
    setIsListening(true);

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      setTranscript(finalTranscript || interimTranscript);
      if (finalTranscript) {
        const cleanText = finalTranscript.replace(/\.$/, "").trim();
        setIsListening(false);
        if (setSearchValue) setSearchValue(cleanText);
        navTimeoutRef.current = setTimeout(() => {
          setShowVoiceModal(false);
          navigate(`/search?q=${encodeURIComponent(cleanText)}`);
        }, 600);
      }
    };

    recognition.onerror = (event) => {
      setTranscript(event.error === "no-speech" ? "Didn't catch that. Try speaking again." : "Microphone error. Please try again.");
      setIsListening(false);
      navTimeoutRef.current = setTimeout(() => setShowVoiceModal(false), 2500);
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const closeVoiceModal = () => {
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (_) {}
    setShowVoiceModal(false);
    setIsListening(false);
  };

  const SearchIcon = ({ size = 18, color = COLOR.muted }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.5" cy="10.5" r="7" />
      <line x1="20.5" y1="20.5" x2="15.8" y2="15.8" />
    </svg>
  );

  const MicIcon = ({ size = 19 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 7a4.5 4.5 0 0 1 9 0v4.5a4.5 4.5 0 0 1-9 0V7z" fill={COLOR.primary} />
      <circle cx="12" cy="5.5" r="1.2" fill={COLOR.ink} />
      <path d="M7.5 10.5l4.5 2 4.5-2" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M8 22h8" stroke={COLOR.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const BigMicIcon = ({ size = 34 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill={COLOR.primary} />
      <circle cx="12" cy="6" r="1.2" fill={COLOR.ink} />
      <path d="M8.5 10.5l3.5 1.6 3.5-1.6" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 12v0.5a6.5 6.5 0 0 0 13 0V12" stroke={COLOR.ink} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );

  const BackArrowIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLOR.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="20" y1="12" x2="4" y2="12"></line>
      <polyline points="10 18 4 12 10 6"></polyline>
    </svg>
  );

  return (
    <>
      <GlobalMobileStyles />
      <style>{`
        .sb-titlebar-in { animation: sb-fadeSlide 0.28s ${EASE} both; }
        .sb-voice-modal-in { animation: sb-voiceUp 0.32s ${EASE_SPRING} both; }
        @keyframes sb-voiceUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .sb-back-btn:active { background: ${COLOR.primarySoft} !important; }
        @keyframes sb-hintUp { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
        .sb-search-hint { animation: sb-hintUp 0.32s ${EASE} both; }
      `}</style>

      {showVoiceModal && (
        <div style={styles.voiceOverlay} onClick={closeVoiceModal}>
          <div style={styles.voiceModal} className="sb-voice-modal-in" onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeModalBtn} className="sb-tap" onClick={closeVoiceModal}>✕</button>
            <h3 style={styles.voiceTitle}>{isListening ? "Speak now" : "Processing"}</h3>
            <p style={{ ...styles.voiceTranscript, color: transcript === "Listening..." ? COLOR.muted : COLOR.ink }}>{transcript}</p>
            <div style={{ ...styles.bigMicContainer, animation: isListening ? "sb-pulseGlow 1.5s infinite" : "none", background: isListening ? COLOR.gradientCTA : COLOR.line }}>
              <BigMicIcon size={34} />
            </div>
          </div>
        </div>
      )}

      <div ref={headerRef} style={styles.fixedHeader}>
        <div ref={gradientRef} style={styles.gradientWrap}>
            {(showLogo || showLocation) && (
              <div
                style={{
                  ...styles.headerTop,
                  padding: compact ? "6px 12px 6px 0" : "12px 12px 12px 0",
                  opacity: compact ? 0.92 : 1,
                }}
              >
                {showLogo && (
                  <div
                    style={{ ...styles.textLogoContainer, fontSize: compact ? "19px" : "24px" }}
                    className="sb-tap"
                    onClick={() => navigate("/")}
                  >
                    <span style={styles.logoShiper}>Shiper</span>
                    <span style={styles.logoBox}>Box</span>
                  </div>
                )}
                {showLocation && (
                  <div style={styles.locationSlot}>
                    {isLoggedIn ? (
                      <MobileLocation />
                    ) : (
                      <div style={styles.loginWrapper}>
                        <button style={styles.loginBtn} className="sb-tap" onClick={onLoginClick}>Login</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                ...(isHomeSearch ? styles.searchRowHome : styles.searchRowOther),
                paddingBottom: compact ? "10px" : undefined,
              }}
            >
              <div
                style={{
                  ...styles.searchBox,
                  boxShadow: searchFocused
                    ? `0 0 0 4px ${COLOR.primarySoft}, 0 6px 16px rgba(15,23,42,0.10)`
                    : "0 4px 14px rgba(15,23,42,0.10)",
                  transform: searchFocused ? "translateY(-1px)" : "none",
                }}
              >
                <div style={styles.searchIconWrapper}><SearchIcon size={16} color={searchFocused ? COLOR.primaryDark : COLOR.muted} /></div>
                {showHint && (
                  <div style={styles.hintOverlay} aria-hidden="true">
                    <span style={styles.hintStatic}>Search</span>
                    <span key={hintIndex} style={styles.hintWord} className="sb-search-hint">
                      &ldquo;{SEARCH_HINTS[hintIndex]}&rdquo;
                    </span>
                  </div>
                )}
                <input
                  type="search"
                  placeholder=""
                  aria-label="Search items, courier, garlands"
                  style={styles.searchInput}
                  value={searchValue}
                  onChange={(e) => setSearchValue && setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSearch && onSearch()}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
              </div>
              <button style={styles.micBtn} className="sb-tap" onClick={handleVoiceSearch} type="button">
                <MicIcon size={19} />
              </button>
            </div>
        </div>

        {showTitleBar && (
          <div style={{ ...styles.headerBottom, top: `${gradientHeight}px` }} className="sb-titlebar-in">
            {showBackButton && (
              <button style={styles.backBtn} className="sb-tap sb-back-btn" onClick={onBack}>
                <BackArrowIcon />
              </button>
            )}
            {title && <h3 style={styles.categoryTitle}>{title}</h3>}
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  fixedHeader: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
    display: "flex", flexDirection: "column",
    background: "transparent",
    boxSizing: "border-box",
  },
  // Gradient + shadow live here now, wrapping only the logo/location/search
  // rows — so the title bar below can be genuinely transparent. A faint
  // radial highlight adds depth to the flat gradient without touching
  // the brand color itself.
  gradientWrap: {
    display: "flex", flexDirection: "column",
    background: `radial-gradient(120% 140% at 15% -20%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%), ${COLOR.gradientHeader}`,
    paddingTop: "env(safe-area-inset-top, 0px)",
    boxSizing: "border-box",
    boxShadow: "0 6px 20px rgba(107,170,245,0.22)",
  },
  headerTop: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 12px 12px 0", flexWrap: "wrap", transition: `padding 0.28s ${EASE}, opacity 0.28s ${EASE}` },

  // PURE CSS TEXT LOGO FOR HEADER
  textLogoContainer: {
    margin: "0 0 0 16px",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    fontFamily: FONT.display,
    fontSize: "24px",
    fontWeight: "800",
    letterSpacing: "-0.5px",
    lineHeight: 1,
    transition: `transform 0.18s ${EASE_SPRING}, font-size 0.28s ${EASE}`,
  },
  logoShiper: {
    color: "#0c1c38", // Deep navy blue from your image
  },
  logoBox: {
    color: "#2ea1ee", // Bright sky blue from your image
  },

  locationSlot: { flex: 1, display: "flex", alignItems: "center", minWidth: 0 },

  loginWrapper: { display: "flex", justifyContent: "flex-end", width: "100%" },
  loginBtn: {
    background: COLOR.pop, color: "#ffffff", border: "none", padding: "10px 22px", borderRadius: RADIUS.md,
    fontWeight: "800", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(153, 246, 228, 0.4)", fontFamily: FONT.body,
  },

  searchRowHome: { display: "flex", alignItems: "center", gap: "10px", padding: "2px 16px 16px", boxSizing: "border-box", transition: `padding 0.28s ${EASE}` },
  searchRowOther: { display: "flex", alignItems: "center", gap: "12px", padding: "16px 16px 14px", boxSizing: "border-box", width: "100%", transition: `padding 0.28s ${EASE}` },
  searchBox: {
    flex: 1, height: "38px", display: "flex", alignItems: "center", position: "relative",
    backgroundColor: COLOR.paper, borderRadius: RADIUS.md, overflow: "hidden",
    boxSizing: "border-box", gap: "8px",
    transition: `box-shadow 0.25s ${EASE}, transform 0.25s ${EASE}`,
  },
  searchIconWrapper: { paddingLeft: "14px", display: "flex", alignItems: "center" },
  hintOverlay: {
    position: "absolute", left: "40px", right: "12px", top: 0, bottom: 0,
    display: "flex", alignItems: "center", gap: "4px", overflow: "hidden",
    pointerEvents: "none", fontFamily: FONT.body, fontSize: "14.5px", fontWeight: 500,
  },
  hintStatic: { color: COLOR.muted, flexShrink: 0 },
  hintWord: { color: COLOR.ink, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  searchInput: { flex: 1, minWidth: 0, border: "none", padding: "0 10px 0 0", outline: "none", fontSize: "14.5px", background: "transparent", color: COLOR.ink, fontFamily: FONT.body, fontWeight: "500" },
  micBtn: {
    width: "38px", height: "38px", border: "none", borderRadius: RADIUS.md,
    backgroundColor: COLOR.paper, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0,
    boxShadow: "0 4px 14px rgba(15,23,42,0.10)",
    transition: `transform 0.18s ${EASE_SPRING}, box-shadow 0.18s ${EASE}`,
  },

  // Was fully transparent - with nothing behind it but the page's flat
  // background (mainWrapper only starts *below* this strip), that read as
  // a mismatched grey band between the blue header and the white sidebar.
  // Giving it the same soft tone as the page, plus a hairline to hand off
  // into the content below, removes that seam instead of leaving a gap.
  headerBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 12px",
    height: "44px",
    zIndex: 5,
  },
  categoryTitle: {
    margin: 0,
    background: "transparent",
    padding: "8px 18px",
    borderRadius: RADIUS.pill,
    boxShadow: "transparent",
    fontSize: "12px",
    fontWeight: "600",
    color: COLOR.ink,
    fontFamily: FONT.body,     // normal text style (was FONT.mono, all-caps)
    letterSpacing: "normal",
    textAlign: "center",
    boxSizing: "border-box",
  },
  backBtn: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    width: "28px",
    height: "28px",
    borderRadius: RADIUS.pill,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "transparent",
  },

  voiceOverlay: { position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", zIndex: 9999, display: "flex", alignItems: "flex-end", animation: "sb-fadeSlide 0.2s ease" },
  voiceModal: { width: "100%", backgroundColor: COLOR.paper, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: "30px 20px calc(50px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", boxShadow: "0 -12px 40px rgba(15,23,42,0.18)" },
  closeModalBtn: { position: "absolute", top: "16px", right: "20px", background: COLOR.mist, border: "none", borderRadius: RADIUS.pill, width: "32px", height: "32px", fontSize: "16px", color: COLOR.muted, cursor: "pointer" },
  voiceTitle: { margin: "0 0 16px 0", fontSize: "20px", fontWeight: "700", color: COLOR.ink, fontFamily: FONT.display },
  voiceTranscript: { fontSize: "21px", textAlign: "center", minHeight: "60px", margin: "0 0 32px 0", fontStyle: "italic", maxWidth: "85%", wordBreak: "break-word" },
  bigMicContainer: { width: "72px", height: "72px", borderRadius: RADIUS.pill, display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.3s ease" },
};