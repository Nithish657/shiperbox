import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import LocationModal from "./LocationModal";
import Login from "../pages/Login"; 
import { API_URL } from "../api";

const BRAND_GREEN = "#2c2b2b";

const ABOUT_STORY = [
  {
    heading: "Bringing your everyday needs closer to home",
    paragraphs: [
      "Shiperbox started with a simple observation: getting fresh vegetables, flowers for a special occasion, a custom garland made in time for a ceremony, or a package delivered across town shouldn't mean juggling five different apps, shops, and phone calls. We wanted one place that could handle all of it — reliably, quickly, and without the runaround.",
      "Today, ShiperBox is a local-first platform built around the things people in our community actually need on a regular basis: fresh groceries, flowers, custom garlands for festivals and functions, and dependable courier and delivery services. We're not trying to be everything to everyone — we're trying to be genuinely useful for the handful of things that matter most in daily life.",
    ],
  },
  {
    heading: "How it started",
    paragraphs: [
      "Shiperbox began as a small effort to solve a local problem. Vendors selling fresh vegetables and flowers had great produce but no easy way to reach customers beyond their immediate neighborhood. Customers, meanwhile, were stuck choosing between the inconvenience of visiting multiple shops or settling for less fresh options from generic delivery apps that treated groceries as an afterthought.",
      "We built ShiperBox to close that gap — to give local vendors a proper digital storefront, and to give customers a fast, honest way to get what they need without compromising on freshness or trust.",
      "From there, the platform grew naturally. Customers ordering flowers for weddings and festivals started asking for custom garlands — made to order, delivered on time, exactly as requested. So we added that. People needed small packages moved across town without waiting hours for a generalist courier service, so we built dedicated courier routes with transparent tracking. Every feature on ShiperBox exists because someone in our community actually asked for it.",
    ],
  },
  {
    heading: "What we do",
    paragraphs: [
      "Fresh groceries, delivered right. We work directly with local vegetable and flower vendors so what arrives at your door is as close to market-fresh as possible. No middlemen inflating prices, no produce sitting in a warehouse for days before it reaches you.",
      "Custom garlands, made with care. Whether it's for a wedding, a housewarming, a festival, or a religious ceremony, our garland service lets you send a reference photo and your requirements, and we handle the rest — sourced, made, and delivered by your needed date.",
      "Courier services that keep their word. We run structured delivery routes between key points in the city, so sending a package doesn't mean guessing when — or if — it'll arrive. Real-time status on your requests means no more calling around for updates.",
      "A cart that respects your time. Save your addresses once, reorder your regulars in seconds, and check out without re-entering the same details every time.",
    ],
  },
  {
    heading: "What we believe in",
    paragraphs: [
      "Trust over hype. We'd rather under-promise and consistently deliver than make big claims we can't back up. If something's out of stock, we say so. If a delivery will take longer, we tell you upfront.",
      "Local first. We prioritize working with vendors and partners in our own community rather than treating every city as an interchangeable market. That means better quality control, and it means the money customers spend actually supports people nearby.",
      "Simple should stay simple. Every addition to ShiperBox has to earn its place by solving a real, recurring problem — not just look good in a features list.",
      "Security and privacy as a baseline, not an afterthought. Your account, your orders, and your personal details are handled with the same care we'd want for our own information. We don't sell data, and we don't cut corners on how we protect it.",
    ],
  },
  {
    heading: "Who we serve",
    paragraphs: [
      "Shiperbox is built for people who want dependable, everyday services without friction — busy families ordering groceries for the week, someone arranging flowers for a last-minute occasion, a small business owner who needs a package couriered across town by afternoon, or a household preparing for a festival and needing a garland made exactly right. If that sounds like you, you're exactly who we built this for.",
    ],
  },
  {
    heading: "Where we're headed",
    paragraphs: [
      "We're still early, and we like it that way — it means we're still close enough to our customers to hear what's working and what isn't, and to change course quickly when something needs fixing. As we grow, our plan is to expand the range of local vendors we partner with, extend our courier network to cover more routes, and keep refining the experience based on what actual customers tell us, not what looks good on a roadmap slide.",
      "If you've got feedback, a request, or just want to tell us we got something wrong — we want to hear it. ShiperBox works because the people using it keep shaping what it becomes.",
    ],
  },
  {
    heading: "Thank you",
    paragraphs: [
      "To every vendor who trusted us with their produce and their reputation, to every customer who gave a new local service a chance instead of a familiar big name, and to everyone still discovering us for the first time — thank you for being part of building something genuinely useful, together.",
    ],
  },
];

const Header = forwardRef(function Header({ cartCount = 0, openCart }, ref) {
  const [search, setSearch] = useState("");
  const [showAccount, setShowAccount] = useState(false);
  const [activeSection, setActiveSection] = useState(null); 
  const [showLocationModal, setShowLocationModal] = useState(false);

  // STRICT LOGIN CHECK
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const user_id = localStorage.getItem("phone") || "guest";

  // State for Login Modal
  const [showLoginModal, setShowLoginModal] = useState(false);

  // --- Inline right-pane data ---
  const [myAddresses, setMyAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // --- Address Management (LocationModal Style) ---
  const [addressMode, setAddressMode] = useState("list"); // 'list' | 'add' | 'edit'
  const [addrStep, setAddrStep] = useState(1); // 1 = Search Area, 2 = Doorstep Details
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    area: "",
    flatNo: "",
    buildingName: "",
    is_default: false
  });
  
  const [osmSearch, setOsmSearch] = useState("");
  const [osmSuggestions, setOsmSuggestions] = useState([]);
  const [locating, setLocating] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");

  const [address, setAddress] = useState(
    localStorage.getItem("user_address") || "Click to set location"
  );

  // --- Voice Search States ---
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [transcript, setTranscript] = useState("Listening...");
  const [isListening, setIsListening] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("user_address");
      if (saved) setAddress(saved);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleSaveAddress = (newAddr) => {
    setAddress(newAddr);
    localStorage.setItem("user_address", newAddr);
    setShowLocationModal(false);
  };

  const loadAddresses = async () => {
    setAddressesLoading(true);
    try {
      const timestamp = new Date().getTime();
      const res = await axios.get(`${API_URL}/address/${user_id}?t=${timestamp}`);
      if (res.data.success) setMyAddresses(res.data.addresses);
    } catch (err) {
      console.error("Failed to load addresses:", err);
    } finally {
      setAddressesLoading(false);
    }
  };

  const openSection = async (section) => {
    setActiveSection(section);
    setAddressMode("list");
    if (section === "address") {
      loadAddresses();
    } else if (section === "orders") {
      setOrdersLoading(true);
      try {
        const timestamp = new Date().getTime();
        const res = await axios.get(`${API_URL}/orders/${user_id}?t=${timestamp}`);
        if (res.data.success) setMyOrders(res.data.orders);
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setOrdersLoading(false);
      }
    }
  };

  const openAccountModal = () => {
    setShowAccount(true);
    if (!activeSection) openSection("orders"); 
  };

  // Lets parent components (e.g. a footer) open a specific account section
  // — "orders" | "address" | "about" — using the same inline modal above.
  useImperativeHandle(ref, () => ({
    openAccountSection: (section) => {
      setShowAccount(true);
      openSection(section);
    },
  }));

  // --- OpenStreetMap Autocomplete ---
  useEffect(() => {
    if (osmSearch.trim().length > 2) {
      const fetchSuggestions = async () => {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(osmSearch)}&countrycodes=in&limit=5`;
          const res = await axios.get(url);
          if (res.data && res.data.length > 0) setOsmSuggestions(res.data);
        } catch (err) {
          console.error("OSM Autocomplete error:", err);
        }
      };
      const timeoutId = setTimeout(() => fetchSuggestions(), 600);
      return () => clearTimeout(timeoutId);
    } else {
      setOsmSuggestions([]);
    }
  }, [osmSearch]);

  const handlePlaceSelect = (place) => {
    setAddressForm(prev => ({ ...prev, area: place.display_name }));
    setOsmSearch(""); 
    setAddrStep(2); 
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported by this browser.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
          const res = await axios.get(url);
          if (res.data && res.data.display_name) {
            setAddressForm(prev => ({ ...prev, area: res.data.display_name }));
            setAddrStep(2); 
          } else {
            alert("Location found, but no address details were returned.");
          }
        } catch (err) {
          alert("Error fetching location details. Please check connection.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        alert("Unable to retrieve your location. Please check browser permissions.");
        setLocating(false);
      }
    );
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setSavingAddress(true);
    setAddressError("");

    try {
      const parts = [];
      if (addressForm.flatNo.trim()) parts.push(addressForm.flatNo.trim());
      if (addressForm.buildingName.trim()) parts.push(addressForm.buildingName.trim());
      if (addressForm.area.trim()) parts.push(addressForm.area.trim());

      const fullExactAddress = parts.join(", ");

      const payload = {
        user_id,
        label: addressForm.label,
        full_address: fullExactAddress,
        is_default: addressForm.is_default ? 1 : 0
      };

      if (addressMode === "edit" && selectedAddressId) {
        await axios.put(`${API_URL}/address/${selectedAddressId}`, payload);
      } else {
        await axios.post(`${API_URL}/address`, payload);
      }

      setAddressForm({ label: "Home", area: "", flatNo: "", buildingName: "", is_default: false });
      setAddressMode("list");
      setSelectedAddressId(null);
      loadAddresses();
    } catch (err) {
      setAddressError(err.response?.data?.message || "Server error saving address.");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleStartEdit = (addr) => {
    setSelectedAddressId(addr.id);
    setAddressForm({
      label: addr.label || "Home",
      area: addr.full_address || "",
      flatNo: "",
      buildingName: "",
      is_default: addr.is_default === 1
    });
    setAddrStep(2); 
    setAddressMode("edit");
    setAddressError("");
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    try {
      const res = await axios.delete(`${API_URL}/address/${id}`);
      if (res.data.success) loadAddresses();
    } catch (err) {
      alert("Failed to delete address");
    }
  };

  const closeAccountPanel = () => {
    setShowAccount(false);
    setActiveSection(null);
    setAddressMode("list");
  };

  const formatOrderDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

  const formatOrderDateTime = (d) =>
    d
      ? new Date(d).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "—";



  const orderTypeLabel = (type) => ({
    cart: "Grocery Order",
    garland: "Garland Order",
    bulk_veg: "Bulk Vegetable Order",
    courier: "Courier",
  }[type] || "Order");

  const getBadgeStyle = (rawStatus) => {
    const status = String(rawStatus || "pending").toLowerCase().trim();
    if (status.includes("approve") || status.includes("deliver") || status.includes("done")) return { backgroundColor: "#dff8e6", color: "#0c831f" }; 
    if (status.includes("reject") || status.includes("cancel")) return { backgroundColor: "#fde8e8", color: "#e53935" }; 
    if (status.includes("transit")) return { backgroundColor: "#e0f2fe", color: "#0284c7" }; 
    return { backgroundColor: "#fff4e0", color: "#b8860b" };   
  };

  const renderOrderUpdates = (order) => {
    const type = String(order.order_type || "cart").toLowerCase().trim();
    const s = String(order.status || order.approval_status || "pending").toLowerCase().trim();
    
    let steps = [];
    let activeIndex = 0;
    let color = "#0c831f";

    // 1. Handle Cancellations
    if (s.includes("reject") || s.includes("cancel") || s.includes("delete")) {
      steps = ["Pending", "Cancelled"];
      activeIndex = 1;
      color = "#e53935";
    } 
    // 2. Handle Grocery / Cart / Bulk Veg
    else if (type === "cart" || type === "grocery" || type === "bulk_veg") {
      steps = ["Pending", "Processing", "In Transit", "Delivered"];
      if (s.includes("done") || s.includes("deliver") || s.includes("complet")) activeIndex = 3;
      else if (s.includes("transit") || s.includes("dispatch")) activeIndex = 2;
      else if (s.includes("approve") || s.includes("process") || s.includes("accept")) activeIndex = 1;
      else activeIndex = 0;
    } 
    // 3. Handle Courier
    else if (type === "courier") {
      steps = ["Pending", "Approved", "Completed"];
      if (s.includes("complet") || s.includes("done") || s.includes("deliver")) activeIndex = 2;
      else if (s.includes("approve") || s.includes("transit") || s.includes("accept")) activeIndex = 1;
      else activeIndex = 0;
    }
    // 4. Handle Custom Garland
    else if (type === "garland") {
      steps = ["Pending", "Approved"];
      if (s.includes("approve") || s.includes("done") || s.includes("complet") || s.includes("accept")) activeIndex = 1;
      else activeIndex = 0;
    }

    return (
      <div style={{ display: "flex", alignItems: "center", marginTop: "15px", width: "100%", padding: "0 5px", boxSizing: "border-box" }}>
        {steps.map((step, idx) => (
          <React.Fragment key={step}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              <div style={{ 
                width: "14px", height: "14px", borderRadius: "50%", 
                background: idx <= activeIndex ? color : "#e0e0e0", 
                zIndex: 2, transition: "background 0.3s ease" 
              }}></div>
              <span style={{ 
                position: "absolute", top: "20px", fontSize: "11px", 
                color: idx <= activeIndex ? "#333" : "#999", 
                fontWeight: idx <= activeIndex ? "bold" : "normal", 
                whiteSpace: "nowrap" 
              }}>
                {step}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div style={{ 
                height: "3px", flex: 1, 
                background: idx < activeIndex ? color : "#e0e0e0", 
                margin: "0 4px", borderRadius: "2px", transition: "background 0.3s ease" 
              }}></div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const goSearch = () => {
    let cleanText = search.trim().toLowerCase();
    
    const synonymDictionary = {
      "bangaladumpa": "potato", "bangala dumpa": "potato",
      "ulli": "onion", "ullipaya": "onion", "errapaya": "onion",
      "tamata": "tomato", "tomatoo": "tomato",
      "bendakaya": "okra", "benda kaya": "okra", "lady finger": "okra",
      "mirapakaya": "chilli", "pachi mirchi": "chilli", "mirchi": "chilli",
      "kothimeera": "coriander", "dhaniya": "coriander",
      "karivepaku": "curry leaves",
      "vankaya": "brinjal", "eggplant": "brinjal",
      "pudina": "mint",
      "kanda": "yam",
      "kyabeji": "cabbage"
    };

    if (synonymDictionary[cleanText]) {
      cleanText = synonymDictionary[cleanText];
    }

    if (cleanText !== "") navigate(`/search?q=${encodeURIComponent(cleanText)}`);
  };

  const logout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("email");
    localStorage.removeItem("phone");
    localStorage.removeItem("name");  
    localStorage.removeItem("userToken"); // clear the session token too
    setShowAccount(false);
    setActiveSection(null);
    navigate("/");
    window.location.reload(); 
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Your browser does not support voice search.");

    const recognition = new SpeechRecognition();
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
        let cleanText = finalTranscript.replace(/\.$/, "").trim().toLowerCase();
        
        const synonymDictionary = {
          "bangaladumpa": "potato", "bangala dumpa": "potato",
          "ulli": "onion", "ullipaya": "onion", "errapaya": "onion",
          "tamata": "tomato", "tomatoo": "tomato",
          "bendakaya": "okra", "benda kaya": "okra", "lady finger": "okra",
          "mirapakaya": "chilli", "pachi mirchi": "chilli", "mirchi": "chilli",
          "kothimeera": "coriander", "dhaniya": "coriander",
          "karivepaku": "curry leaves",
          "vankaya": "brinjal", "eggplant": "brinjal",
          "pudina": "mint",
          "kanda": "yam",
          "kyabeji": "cabbage"
        };

        if (synonymDictionary[cleanText]) {
          cleanText = synonymDictionary[cleanText];
        }

        setIsListening(false);
        setSearch(cleanText);
        setTimeout(() => {
          setShowVoiceModal(false);
          navigate(`/search?q=${encodeURIComponent(cleanText)}`);
        }, 600);
      }
    };

    recognition.onerror = () => {
      setTranscript("Microphone error. Please try again.");
      setIsListening(false);
      setTimeout(() => setShowVoiceModal(false), 2500);
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const closeVoiceModal = () => {
    setShowVoiceModal(false);
    setIsListening(false);
  };

  const openWhatsAppSupport = () => window.open(`https://wa.me/916301912803?text=${encodeURIComponent("Hi, I need help with my ShiperBox order.")}`, "_blank");

  // --- CUSTOM SVG ICONS ---
  const SearchIcon = ({ size = 20, color = "#555" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.5" cy="10.5" r="7.5" /><line x1="21" y1="21" x2="15.8" y2="15.8" /><circle cx="8" cy="8" r="1.5" fill={color} stroke="none" />
    </svg>
  );
  const MicIcon = ({ size = 24, standColor = "#555" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 7a4.5 4.5 0 0 1 9 0v4.5a4.5 4.5 0 0 1-9 0V7z" fill="#1877F2"/>
      <circle cx="12" cy="5.5" r="1.2" fill="white"/>
      <path d="M7.5 10.5l4.5 2 4.5-2" stroke="white" strokeWidth="1.5" fill="none" />
      <path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M8 22h8" stroke={standColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const CartIcon = ({ size = 22, color = "#000" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  );
  const UserIcon = ({ size = 20, color = BRAND_GREEN }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
  const AddressIcon = ({ size = 20, color = "#333" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"></path><circle cx="12" cy="10" r="3"></circle>
    </svg>
  );
  const OrdersIcon = ({ size = 20, color = "#333" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="7" rx="1.5"></rect><rect x="4" y="13" width="16" height="7" rx="1.5"></rect>
    </svg>
  );
  const HelpIcon = ({ size = 20, color = "#333" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-4.7 7.6 8.5 8.5 0 0 1-8.7-.8L3 21l1.9-5.6a8.38 8.38 0 0 1-.8-3.9 8.5 8.5 0 0 1 12.4-7.6 8.38 8.38 0 0 1 4.5 7.6z"></path>
      <circle cx="8.5" cy="11.5" r="0.5" fill={color} stroke="none"></circle><circle cx="12" cy="11.5" r="0.5" fill={color} stroke="none"></circle><circle cx="15.5" cy="11.5" r="0.5" fill={color} stroke="none"></circle>
    </svg>
  );
  const AboutIcon = ({ size = 20, color = "#333" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="12" r="8"></circle><circle cx="18" cy="6" r="1" fill={color} stroke="none"></circle>
    </svg>
  );
  const LogoutIcon = ({ size = 20, color = "#333" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="12" r="9"></circle><line x1="2" y1="12" x2="13" y2="12"></line><polyline points="6 8 2 12 6 16"></polyline>
    </svg>
  );

  return (
    <>
      <style>
        {`
          @keyframes pulseGlow {
            0% { box-shadow: 0 0 0 0 rgba(44, 43, 43, 0.4); }
            70% { box-shadow: 0 0 0 20px rgba(44, 43, 43, 0); }
            100% { box-shadow: 0 0 0 0 rgba(44, 43, 43, 0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
          }
        `}
      </style>

      {/* LOGIN MODAL OVERLAY */}
      {showLoginModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalLoginBox}>
            <button style={styles.modalCloseBtn} onClick={() => setShowLoginModal(false)}>×</button>
            <Login onLoginSuccess={() => { 
              setShowLoginModal(false); 
              window.location.reload(); 
            }} />
          </div>
        </div>
      )}

      {showVoiceModal && (
        <div style={styles.voiceOverlay} onClick={closeVoiceModal}>
          <div style={styles.voiceModal} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeModalBtn} onClick={closeVoiceModal}>✕</button>
            <h3 style={styles.voiceTitle}>{isListening ? "Speak now" : "Processing"}</h3>
            <p style={{ ...styles.voiceTranscript, color: transcript === "Listening..." ? "#888" : "#222" }}>{transcript}</p>
            <div style={{ ...styles.bigMicContainer, animation: isListening ? "pulseGlow 1.5s infinite" : "none", backgroundColor: isListening ? BRAND_GREEN : "#eee" }}>
              <MicIcon size={40} standColor={isListening ? "#fff" : "#555"} />
            </div>
          </div>
        </div>
      )}

      {showLocationModal && (
        <LocationModal onClose={() => setShowLocationModal(false)} onSelect={handleSaveAddress} />
      )}

      <div style={styles.header}>
        <div style={styles.topRow}>
          
          <div style={styles.leftSection}>
            <h2 style={styles.logo} onClick={() => navigate("/home")}>ShiperBox</h2>

            <div style={styles.locationContainer} onClick={() => setShowLocationModal(true)} title="Change Location">
              <div style={styles.deliveryTitle}>Delivery to</div>
              <div style={styles.locationWrapper}>
                <span style={styles.text}>{address}</span>
                <span style={styles.arrowIcon}>▼</span>
              </div>
            </div>
          </div>

          <div style={styles.searchBox}>
            <div style={styles.searchIconWrapper}><SearchIcon size={18} color="#555" /></div>
            <input type="text" placeholder='Search "butter"' style={styles.search} value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && goSearch()} />
            <button style={styles.micBtn} onClick={handleVoiceSearch} title="Voice Search"><MicIcon size={20} /></button>
            <button style={styles.searchBtn} onClick={goSearch}>Search</button>
          </div>

          <div style={styles.rightSection}>
            {isLoggedIn ? (
              <div style={styles.user} onClick={openAccountModal} title="Account">
                <UserIcon size={20} color={BRAND_GREEN} />
              </div>
            ) : (
              <button style={styles.loginBtnHeader} onClick={() => setShowLoginModal(true)}>
                Login
              </button>
            )}
            <div style={styles.cart} onClick={openCart}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "6px" }}>
                <CartIcon size={20} color="#000" /><span style={styles.cartText}></span>
                {cartCount > 0 && <span style={styles.badge}>{cartCount}</span>}
              </div>
            </div>
          </div>

        </div>
      </div>

      {showAccount && (
        <div style={styles.accountOverlay} onClick={closeAccountPanel}>
          <div style={styles.accountWrapper} onClick={(e) => e.stopPropagation()}>
            
            <div style={styles.accountBox}>
              <button style={styles.closeBtn} onClick={closeAccountPanel}>✕</button>
              <div style={styles.menuList}>
                <div style={styles.menuItem}><UserIcon size={18} color="#333" /><span style={styles.menuText}>{localStorage.getItem("name") || "Guest"}</span></div>
                <div style={activeSection === "address" ? styles.menuItemActive : styles.menuItem} onClick={() => openSection("address")}><AddressIcon size={18} /><span style={styles.menuText}>My Address</span></div>
                <div style={activeSection === "orders" ? styles.menuItemActive : styles.menuItem} onClick={() => openSection("orders")}><OrdersIcon size={18} /><span style={styles.menuText}>My Orders</span></div>
                <div style={styles.menuItem} onClick={openWhatsAppSupport}><HelpIcon size={18} /><span style={styles.menuText}>Need Help</span></div>
                <div style={activeSection === "about" ? styles.menuItemActive : styles.menuItem} onClick={() => openSection("about")}><AboutIcon size={18} /><span style={styles.menuText}>About Us</span></div>
                <div style={{ ...styles.menuItem, borderBottom: "none" }} onClick={logout}><LogoutIcon size={18} /><span style={styles.menuText}>Logout</span></div>
              </div>
            </div>

            <div style={styles.contentPane}>
              {activeSection === "address" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 style={{ ...styles.paneTitle, margin: 0 }}>My Address</h3>
                    {addressMode === "list" ? (
                      <button 
                        style={styles.addAddrToggleBtn} 
                        onClick={() => {
                          setAddressForm({ label: "Home", area: "", flatNo: "", buildingName: "", is_default: false });
                          setAddrStep(1);
                          setSelectedAddressId(null);
                          setAddressMode("add");
                        }}
                      >+ Add New Address</button>
                    ) : (
                      <button style={styles.cancelToggleBtn} onClick={() => setAddressMode("list")}>← Back to List</button>
                    )}
                  </div>

                  {addressMode !== "list" ? (
                    <div style={styles.addAddrForm}>
                      {addrStep === 1 ? (
                        <>
                          <h4 style={{ margin: "0 0 15px 0", fontSize: "16px", color: "#222" }}>Select Location</h4>
                          
                          <button onClick={handleUseCurrentLocation} style={styles.currentLocBtn} disabled={locating}>
                            {locating ? "📍 Detecting location..." : "📍 Use Current Location"}
                          </button>

                          <div style={{ textAlign: 'center', margin: '15px 0', color: '#888', fontSize: '14px' }}>OR</div>

                          <div style={{ position: "relative" }}>
                            <input 
                              type="text" 
                              placeholder="Search for area, street, or landmark..." 
                              value={osmSearch}
                              onChange={(e) => setOsmSearch(e.target.value)}
                              style={styles.formInput}
                            />
                            {osmSuggestions.length > 0 && (
                              <ul style={styles.suggestionList}>
                                {osmSuggestions.map((place, index) => (
                                  <li key={index} onClick={() => handlePlaceSelect(place)} style={styles.suggestionItem}>
                                    {place.display_name}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </>
                      ) : (
                        <form onSubmit={handleAddressSubmit}>
                          <h4 style={{ margin: "0 0 10px 0", fontSize: "16px", color: "#222" }}>Exact Doorstep Details</h4>
                          
                          <div style={styles.areaBox}>
                            <strong>Area / Locality:</strong>
                            <p style={{ margin: "4px 0 0 0", color: "#555", fontSize: "13px" }}>{addressForm.area}</p>
                          </div>

                          <label style={styles.formLabel}>Label</label>
                          <select 
                            value={addressForm.label} 
                            onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                            style={styles.formInput}
                          >
                            <option value="Home">Home</option>
                            <option value="Work">Work</option>
                            <option value="Other">Other</option>
                          </select>

                          <label style={styles.formLabel}>House / Flat / Door No. (Optional)</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Flat 402" 
                            value={addressForm.flatNo}
                            onChange={(e) => setAddressForm({ ...addressForm, flatNo: e.target.value })}
                            style={styles.formInput}
                          />

                          <label style={styles.formLabel}>Building / Society Name (Optional)</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Ganesh Krupa Apts" 
                            value={addressForm.buildingName}
                            onChange={(e) => setAddressForm({ ...addressForm, buildingName: e.target.value })}
                            style={styles.formInput}
                          />

                          <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "16px 0" }}>
                            <input 
                              type="checkbox"
                              id="defaultCheck"
                              checked={addressForm.is_default}
                              onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                            />
                            <label htmlFor="defaultCheck" style={{ fontSize: "14px", color: "#444", cursor: "pointer" }}>Make this my default address</label>
                          </div>

                          {addressError && <p style={styles.errorText}>{addressError}</p>}

                          <button type="submit" style={styles.saveAddrBtn} disabled={savingAddress}>
                            {savingAddress ? "Saving..." : addressMode === "edit" ? "Update Address" : "Save Exact Location"}
                          </button>
                          
                          {addressMode !== "edit" && (
                            <button type="button" onClick={() => setAddrStep(1)} style={styles.backBtn}>
                              ← Change Area / Search Again
                            </button>
                          )}
                        </form>
                      )}
                    </div>
                  ) : (
                    <>
                      {addressesLoading ? (
                        <p style={styles.paneEmpty}>Loading...</p>
                      ) : myAddresses.length === 0 ? (
                        <p style={styles.paneEmpty}>No saved addresses yet.</p>
                      ) : (
                        myAddresses.map((addr) => (
                          <div key={addr.id} style={styles.paneCard}>
                            <div style={styles.paneCardTop}>
                              <span style={styles.paneCardLabel}>{addr.label}</span>
                              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                {addr.is_default ? <span style={styles.paneDefaultBadge}>Default</span> : null}
                                <button style={styles.editCardBtn} onClick={() => handleStartEdit(addr)}>Edit</button>
                                <button style={styles.deleteCardBtn} onClick={() => handleDeleteAddress(addr.id)}>Delete</button>
                              </div>
                            </div>
                            <p style={styles.paneCardText}>{addr.full_address}</p>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              )}

              {activeSection === "orders" && (
                <div>
                  <h3 style={styles.paneTitle}>My Orders</h3>
                  {ordersLoading ? (
                    <p style={styles.paneEmpty}>Loading...</p>
                  ) : myOrders.length === 0 ? (
                    <p style={styles.paneEmpty}>You haven't placed any orders yet.</p>
                  ) : (
                    myOrders.map((order) => {
                      const dynamicBadgeStyle = getBadgeStyle(order.status || order.approval_status);
                      return (
                        <div key={order.id} style={styles.paneCard}>
                          <div style={styles.paneCardTop}>
                            <span style={styles.paneCardLabel}>{orderTypeLabel(order.order_type)}</span>
                            <span style={{ ...styles.paneStatusBadge, ...dynamicBadgeStyle }}>{order.status || order.approval_status || "pending"}</span>
                          </div>
                          
                          <p style={styles.paneCardSub}>Order #{order.id} • {formatOrderDateTime(order.created_at)}</p>

                          {Array.isArray(order.items) && order.items.length > 0 ? (
                            <div style={styles.orderDetailBox}>
                              <strong style={{ color: "#333", fontSize: "13px" }}>Items:</strong>
                              <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                {order.items.map((item, idx) => (
                                  <div key={idx} style={styles.orderItemRow}>
                                    {item.image ? (
                                      <img src={item.image} alt={item.name} style={styles.orderItemImage} />
                                    ) : (
                                      <div style={styles.orderItemImagePlaceholder}>🛒</div>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={styles.orderItemName}>{item.name}</p>
                                      <p style={styles.orderItemMeta}>
                                        {item.unit ? `${item.unit} • ` : ""}Qty: {item.quantity}
                                      </p>
                                    </div>
                                    {item.price != null && (
                                      <p style={styles.orderItemPrice}>₹{item.price}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : order.order_type === "garland" ? (
                            <div style={styles.orderDetailBox}>
                               <div style={styles.orderItemRow}>
                                  {order.reference_image ? (
                                    <img src={order.reference_image.startsWith("http") ? order.reference_image : `${API_URL}/uploads/${order.reference_image}`} alt="Garland" style={styles.orderItemImage} />
                                  ) : (
                                    <div style={styles.orderItemImagePlaceholder}>🌸</div>
                                  )}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                     <p style={styles.orderItemName}>Custom Garland Request</p>
                                     <p style={styles.orderItemMeta}>{order.notes || "No additional notes"}</p>
                                  </div>
                               </div>
                            </div>
                          ) : order.order_type === "courier" ? (
                            <div style={styles.orderDetailBox}>
                               <div style={styles.orderItemRow}>
                                  <div style={styles.orderItemImagePlaceholder}>📦</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                     <p style={styles.orderItemName}>Courier Delivery</p>
                                     <p style={styles.orderItemMeta}>{order.address}</p>
                                     {order.notes && <p style={styles.orderItemMeta}>Notes: {order.notes}</p>}
                                  </div>
                               </div>
                            </div>
                          ) : order.items_names ? (
                            <div style={styles.orderDetailBox}>
                              <strong style={{ color: "#333", fontSize: "13px" }}>Items:</strong>
                              <p style={{ margin: "4px 0 0 0", color: "#555", fontSize: "13px" }}>{order.items_names}</p>
                            </div>
                          ) : null}

                          {order.address && order.order_type !== "courier" && (
                            <div style={styles.orderDetailBox}>
                              <strong style={{ color: "#333", fontSize: "13px" }}>Delivery Address:</strong>
                              <p style={{ margin: "4px 0 0 0", color: "#555", fontSize: "13px", whiteSpace: "pre-wrap" }}>{order.address}</p>
                            </div>
                          )}

                          {order.total_price != null ? (
                            <p style={{ ...styles.paneCardText, marginTop: "12px", fontSize: "15px" }}>
                              <strong>Total: ₹{order.total_price}</strong>
                            </p>
                          ) : null}

                          <div style={{ marginTop: "24px", paddingBottom: "18px" }}>
                            {renderOrderUpdates(order)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeSection === "about" && (
                <div>
                  <h3 style={styles.paneTitle}>About Us</h3>
                  <p style={styles.paneAboutBrand}>Shiperbox</p>

                  {ABOUT_STORY.map((block, i) => (
                    <div key={i} style={i > 0 ? styles.paneStoryBlock : undefined}>
                      <h4 style={styles.paneStoryHeading}>{block.heading}</h4>
                      {block.paragraphs.map((p, j) => (
                        <p key={j} style={styles.paneStoryText}>{p}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </>
  );
});

export default Header;

const styles = {
  header: { position: "fixed", top: "0px", left: 0, right: 0, height: "130px", display: "flex", alignItems: "center", padding: "0 40px", backgroundColor:"#8ec5fc", borderBottom: "#8ec5fc", color: "#222", zIndex: 1000 },
  topRow: { display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between" },
  leftSection: { display: "flex", alignItems: "center", flex: 1, justifyContent: "flex-start", gap: "30px" },
  logo: { cursor: "pointer", fontSize: "40px", fontWeight: "900", color: "#ffffff", margin: 0, letterSpacing: "-0.5px", whiteSpace: "nowrap" },
  locationContainer: { display: "flex", flexDirection: "column", justifyContent: "center", cursor: "pointer", minWidth: "150px", maxWidth: "260px", margin: "0 0 0 25px" },
  deliveryTitle: {margin:"0 0 5px 0", fontSize: "18px", fontWeight: "900", color: "#ffffff", lineHeight: "1.2" },
  locationWrapper: { display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" },
  text: { fontSize: "15px", fontWeight: "600", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "220px" },
  arrowIcon: { fontSize: "10px", color: "#ffffff", fontWeight: "bold", display: "flex", alignItems: "center" },
  searchBox: { display: "flex", flex: 2, background: "#f8f8f8", borderRadius: "10px", overflow: "hidden", border: "1px solid #e0e0e0", height: "48px", maxWidth: "750px", margin: "0 0 0 50px" },
  searchIconWrapper: { paddingLeft: "16px", display: "flex", alignItems: "center", justifyContent: "center" },
  search: { flex: 1, padding: "0 12px", border: "none", outline: "none", fontSize: "15px", background: "transparent" },
  micBtn: { background: "transparent", border: "none", cursor: "pointer", padding: "0 14px", display: "flex", alignItems: "center", justifyContent: "center" },
  searchBtn: { padding: "0 20px", border: "none", background: "transparent", color: "#333", fontWeight: "bold", fontSize: "14px", cursor: "pointer" },
  rightSection: { display: "flex", alignItems: "center", flex: 1, justifyContent: "flex-end", gap: "110px", whiteSpace: "nowrap" },
  user: { cursor: "pointer", color: "#000000",background: "#f8f8f8", border: "1px solid #e0e0e0", width: "52px", height: "52px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" },
  
  // Header Login Button
  loginBtnHeader: { backgroundColor: "#d97706", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "8px", fontWeight: "bold", fontSize: "16px", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" },

  // Login Modal Styles
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 },
  modalLoginBox: { background: "white", padding: "20px", borderRadius: "12px", width: "400px", maxWidth: "90%", position: "relative", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" },
  modalCloseBtn: { position: "absolute", top: "10px", right: "15px", border: "none", background: "none", fontSize: "24px", cursor: "pointer", color: "#333", zIndex: 10 },

  cart: { cursor: "pointer", backgroundColor: "#ffff", color: "#000000", padding: "5px 15px", borderRadius: "35px", fontWeight: "700", fontSize: "15px", transition: "background 0.2s", display: "flex", alignItems: "center", height: "44px" },                                                                              
  cartText: { fontSize: "15px", fontWeight: "700" },
  badge: { position: "absolute", top: "-8px", right: "-10px", backgroundColor: "#ff5252", color: "white", fontSize: "10px", fontWeight: "bold", padding: "2px 6px", borderRadius: "10px", border: "2px solid white" },
  voiceOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s ease" },
  voiceModal: { width: "500px", maxWidth: "90%", backgroundColor: "#fff", borderRadius: "24px", padding: "40px 20px 50px 20px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" },
  closeModalBtn: { position: "absolute", top: "15px", right: "20px", background: "none", border: "none", fontSize: "24px", color: "#666", cursor: "pointer", padding: "5px" },
  voiceTitle: { margin: "0 0 15px 0", fontSize: "22px", fontWeight: "bold", color: "#333" },
  voiceTranscript: { fontSize: "24px", textAlign: "center", minHeight: "70px", margin: "0 0 30px 0", display: "flex", alignItems: "center", fontStyle: "italic", maxWidth: "85%" },
  bigMicContainer: { width: "80px", height: "80px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.3s ease" },
  accountOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", justifyContent: "center", alignItems: "center" },
  accountWrapper: { display: "flex", width: "850px", maxWidth: "90vw", height: "70vh", maxHeight: "600px", background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", position: "relative", animation: "fadeIn 0.25s ease-out" },
  accountBox: { width: "260px", flexShrink: 0, background: "#fff", borderRight: "1px solid #eee", overflowY: "auto", position: "relative", display: "flex", flexDirection: "column" },
  closeBtn: { margin:"0 10px 30px 0",position: "absolute", left: "13px", top: "12px", width: "35px", height: "35px", border: "none", borderRadius: "50%", background: "#f5f5f5", color: "#555", cursor: "pointer", fontWeight: "bold", fontSize: "14px", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  menuList: { paddingTop: "80px" },
  menuItem: { display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px", borderBottom: "1px solid #eee", cursor: "pointer", color: "#555", fontSize: "15px", transition: "background 0.2s" },
  menuItemActive: { display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px", borderBottom: "1px solid #eee", cursor: "pointer", color: "#111", fontSize: "15px", fontWeight: "bold", background: "#f9f9f9", borderLeft: "4px solid #0c831f" },
  menuText: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  contentPane: { flex: 1, background: "#fff", overflowY: "auto", padding: "30px" },
  paneTitle: { margin: "0 0 20px 0", fontSize: "20px", color: "#111", fontWeight: "bold" },
  paneEmpty: { color: "#888", fontSize: "15px" },
  paneCard: { border: "1px solid #eee", borderRadius: "10px", padding: "20px", marginBottom: "16px", background: "#fafafa" },
  paneCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  paneCardLabel: { fontWeight: "bold", fontSize: "16px", color: "#111" },
  paneCardText: { fontSize: "14px", color: "#333", margin: "8px 0 0", lineHeight: "1.4", whiteSpace: "pre-line" },
  paneCardSub: { fontSize: "13px", color: "#777", margin: "6px 0 0" },
  paneDefaultBadge: { fontSize: "11px", fontWeight: "bold", color: "#8ec5fc", background: "#dff8e6", padding: "4px 10px", borderRadius: "12px" },
  paneStatusBadge: { fontSize: "11px", fontWeight: "bold", padding: "4px 10px", borderRadius: "12px", textTransform: "capitalize" },
  paneAboutBrand: { fontWeight: "bold", color: "#8ec5fc", fontSize: "18px", margin: "0 0 6px" },
  paneSection: { marginTop: "20px" },
  paneStoryBlock: { marginTop: "18px" },
  paneStoryHeading: { margin: "0 0 6px", fontSize: "14px", color: "#111", fontWeight: "700" },
  paneStoryText: { margin: "0 0 8px", fontSize: "13px", color: "#555", lineHeight: 1.6 },
  orderDetailBox: { background: "#f1f5f9", padding: "10px", borderRadius: "8px", marginTop: "12px", border: "1px solid #e2e8f0" },
  orderItemRow: { display: "flex", alignItems: "center", gap: "10px" },
  orderItemImage: { width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover", flexShrink: 0, background: "#eee" },
  orderItemImagePlaceholder: { width: "44px", height: "44px", borderRadius: "8px", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 },
  orderItemName: { margin: 0, fontSize: "13px", fontWeight: "bold", color: "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  orderItemMeta: { margin: "2px 0 0 0", fontSize: "12px", color: "#666" },
  orderItemPrice: { margin: 0, fontSize: "13px", fontWeight: "bold", color: "#0c831f", flexShrink: 0 },
  
  // --- ADDRESS MANAGEMENT STYLES (Match LocationModal) ---
  addAddrToggleBtn: { background: "#8ec5fc", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" },
  cancelToggleBtn: { background: "#eee", color: "#333", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" },
  editCardBtn: { background: "#fff", color: "#8ec5fc", border: "1px solid #8ec5fc", padding: "4px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" },
  deleteCardBtn: { background: "#fff", color: "#e53935", border: "1px solid #e53935", padding: "4px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" },
  addAddrForm: { background: "#fafafa", border: "1px solid #eee", borderRadius: "12px", padding: "20px", marginBottom: "15px" },
  currentLocBtn: { width: "100%", background: "#2874f0", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold", fontSize: "14px", cursor: "pointer" },
  formLabel: { display: "block", fontSize: "13px", fontWeight: "bold", color: "#444", marginBottom: "6px", marginTop: "14px" },
  formInput: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px", boxSizing: "border-box", marginBottom: "10px" },
  suggestionList: { listStyleType: "none", margin: 0, padding: 0, border: "1px solid #ddd", borderRadius: "8px", maxHeight: "150px", overflowY: "auto", position: "absolute", width: "100%", background: "#fff", zIndex: 10 },
  suggestionItem: { padding: "10px", borderBottom: "1px solid #eee", cursor: "pointer", fontSize: "13px", color: "#333" },
  areaBox: { background: "#f5f5f5", padding: "10px", borderRadius: "8px", marginBottom: "15px", fontSize: "14px", border: "1px solid #eee" },
  saveAddrBtn: { width: "100%", padding: "12px", background: "#0c831f", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", marginTop: "15px" },
  backBtn: { width: "100%", padding: "8px", background: "transparent", color: "#555", border: "none", cursor: "pointer", marginTop: "10px", fontSize: "13px" },
  errorText: { color: "#e53935", fontSize: "13px", marginTop: "10px", fontWeight: "bold" }
};