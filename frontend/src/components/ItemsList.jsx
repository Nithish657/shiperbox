import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_URL } from "../api";
import { getImageUrl } from "../utils/imageUrl";

const BRAND_GREEN = "#8ec5fc";

// Custom SVG Icons for Arrows
const ChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

// --- INDIVIDUAL ROW COMPONENT ---
// FIXED: subcategory name header (headerRow / subTitle) removed per request —
// rows now render straight into the scroll area with no title above them.
const SubcategoryRow = ({ items, category, cartItems, addToCart, updateQty, rows }) => {
  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    
    // Left arrow appears as soon as we scroll slightly to the right
    setShowLeftArrow(scrollLeft > 0);
    // Hide right arrow if we've scrolled to the end (allow 1px margin of error)
    setShowRightArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1);
  };

  useEffect(() => {
    // Initial check and event listener for resize
    setTimeout(handleScroll, 100); 
    window.addEventListener("resize", handleScroll);
    return () => window.removeEventListener("resize", handleScroll);
  }, [items, rows]);

  const scrollLeftBtn = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -400, behavior: "smooth" });
    }
  };

  const scrollRightBtn = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 400, behavior: "smooth" });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div style={styles.subWrapper}>
      <div style={styles.scrollWrapper}>
        
        {/* Floating Left Arrow - Centered on the boundary edge */}
        {showLeftArrow && (
          <button style={{ ...styles.arrowBtn, left: "70px" }} onClick={scrollLeftBtn}>
            <ChevronLeft />
          </button>
        )}

        {/* Scrollable Container */}
        <div 
          ref={scrollRef} 
          onScroll={handleScroll} 
          style={styles.container(rows)}
        >
          {items.map((product) => {
            const cartItem = cartItems.find(
              (c) => c.product_id === product.id && c.category === category
            );
            const outOfStock = Number(product.stock) <= 0;

            return (
              <div key={product.id} style={outOfStock ? { ...styles.card, ...styles.cardOutOfStock } : styles.card}>
                <div style={styles.imgWrapper}>
                  <img
                    src={getImageUrl(product.image)}
                    style={outOfStock ? { ...styles.image, ...styles.imageOutOfStock } : styles.image}
                    alt={product.name}
                  />
                  {outOfStock && <div style={styles.outOfStockBadge}>Out of Stock</div>}
                </div>
                
                <h4 style={styles.name}>{product.name}</h4>
                {/* DYNAMIC QUANTITY UNIT */}
                <p style={styles.weight}>{product.quantity || "1 kg"}</p>
                
                <div style={styles.priceRow}>
                  <span style={styles.price}>₹{product.price}</span>
                  
                  {outOfStock ? (
                    <span style={styles.outOfStockText}>Out of Stock</span>
                  ) : cartItem ? (
                    <div style={styles.qtyBox}>
                      <button style={styles.btn} onClick={() => updateQty(cartItem.id, "decrease")}>-</button>
                      <span style={styles.qty}>{cartItem.quantity}</span>
                      <button style={styles.btn} onClick={() => updateQty(cartItem.id, "increase")}>+</button>
                    </div>
                  ) : (
                    <button style={styles.addBtn} onClick={() => addToCart(product.id, category)}>ADD</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Right Arrow - Centered on the boundary edge */}
        {showRightArrow && (
          <button style={{ ...styles.arrowBtn, right: "70px" }} onClick={scrollRightBtn}>
            <ChevronRight />
          </button>
        )}
      </div>
    </div>
  );
};

// FIXED: "Gourds" is folded into the "Cruciferous vegetables" bucket before
// grouping, so both subcategories render as a single combined row instead
// of two separate ones. Add more names here if you want other subcategories
// merged the same way.
const MERGE_SUBCATEGORY = {
  "Gourds": "Cruciferous vegetables",
};

// --- MAIN COMPONENT ---
export default function ItemsList({ addToCart, updateQty, cartItems, title, category }) {
  const [groupedItems, setGroupedItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadItems = () => {
    setLoading(true);
    setError(false);
    axios.get(`${API_URL}/items/${category}`)
      .then((res) => {
        if (res.data.success) {
          // Group items by their subcategory, merging any subcategories
          // listed in MERGE_SUBCATEGORY into their target group.
          const grouped = res.data.items.reduce((acc, item) => {
            let sub = item.subcategory || "Fresh vegetables";
            sub = MERGE_SUBCATEGORY[sub] || sub;
            if (!acc[sub]) acc[sub] = [];
            acc[sub].push(item);
            return acc;
          }, {});
          
          setGroupedItems(grouped);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return (
    <div style={styles.mainWrapper}>
      {/* Optional Top-Level Category Title */}
      {title && <h2 style={styles.mainTitle}>{title}</h2>}

      {loading ? (
        <p style={styles.statusText}>Loading...</p>
      ) : error ? (
        <div style={styles.statusText}>
          <p>Couldn't load items right now.</p>
          <button style={styles.retryBtn} onClick={loadItems}>Retry</button>
        </div>
      ) : Object.keys(groupedItems).length === 0 ? (
        <p style={styles.statusText}>No items available.</p>
      ) : (
        // Map over each subcategory and generate a dedicated row component
        Object.entries(groupedItems).map(([subKey, itemsList]) => (
          <SubcategoryRow 
            key={subKey}
            items={itemsList}
            category={category}
            cartItems={cartItems}
            addToCart={addToCart}
            updateQty={updateQty}
            rows={1} 
          />
        ))
      )}
    </div>
  );
}

const styles = {
  mainWrapper: { marginTop: "55px", marginBottom: "30px" },
  mainTitle: { fontSize: "28px", fontWeight: "900", margin: "10px 90px 20px 140px", color: "#111" },
  
  subWrapper: { marginBottom: "15px" }, 
  
  scrollWrapper: {
    position: "relative",
    width: "100%",
    display: "flex",
    alignItems: "center" 
  },

  arrowBtn: {
    position: "absolute",
    zIndex: 10,
    width: "42px",
    height: "62px",
    backgroundColor: "#fff",
    border: "1px solid #ffffff",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
    cursor: "pointer",
    transition: "transform 0.1s ease",
    padding: 0
  },

  statusText: { textAlign: "center", color: "#888", padding: "20px" },
  retryBtn: { marginTop: "8px", padding: "8px 20px", border: "none", borderRadius: "8px", background: BRAND_GREEN, color: "#fff", fontWeight: "bold", cursor: "pointer" },
  
  container: (rows) => ({ 
    display: "grid", 
    gridTemplateRows: `repeat(${rows}, 1fr)`, 
    gridAutoFlow: "column",
    gridAutoColumns: "max-content",
    justifyContent: "start",
    gap: "16px",
    overflowX: "auto", 
    
    // STRICT BOUNDARIES APPLIED HERE:
    width: "calc(100% - 250px)", // 100% minus 90px (Left) and 90px (Right)
    margin: "0 auto",            // Centers it, perfectly creating the 90px boundaries
    padding: "10px 0 20px 0",    // Reverted to normal padding
    
    scrollbarWidth: "none",                   
    msOverflowStyle: "none"                   
  }),
  
  card: { 
    width: "200px", 
    boxSizing: "border-box", 
    backgroundColor: "#fff", 
    borderRadius: "16px", 
    padding: "14px", 
    display: "flex", 
    flexDirection: "column",
    border: "1px solid #f0f0f0",
    boxShadow: "0 4px 12px rgba(0,0,0,0.04)", 
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    cursor: "pointer",
    textAlign: "left"
  },
  
  imgWrapper: { 
    
    position: "relative",
    width: "100%", height: "140px", marginBottom: "12px", overflow: "hidden", 
    borderRadius: "10px", backgroundColor: "#f9f9f9" 
  },
  image: { width: "100%", height: "100%", objectFit: "cover" },

  cardOutOfStock: { opacity: 0.6 },
  imageOutOfStock: { filter: "grayscale(1)" },
  outOfStockBadge: {
    position: "absolute", top: "8px", left: "8px",
    backgroundColor: "rgba(0,0,0,0.75)", color: "#fff",
    fontSize: "11px", fontWeight: "bold", padding: "4px 8px",
    borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.3px"
  },
  outOfStockText: { fontSize: "13px", fontWeight: "bold", color: "#e53935" },
  
  name: { fontSize: "16px", margin: "0", fontWeight: "700", color: "#222" },
  weight: { fontSize: "13px", color: "#888", margin: "4px 0 14px 0" },
  
  priceRow: { 
    display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" 
  },
  price: { fontWeight: "800", color: "#111", fontSize: "17px" },
  
  addBtn: { 
    display: "flex", alignItems: "center", justifyContent: "center",
    backgroundColor: "#8ec5fc", border: `1px solid ${BRAND_GREEN}`, 
    color: "#ffffff", borderRadius: "6px", padding: "6px 18px", 
    fontWeight: "bold", fontSize: "13px", cursor: "pointer",
    transition: "all 0.2s ease"
  },
  
  qtyBox: { 
    display: "flex", alignItems: "center", gap: "12px", 
    backgroundColor: BRAND_GREEN, borderRadius: "6px", padding: "6px 10px" 
  },
  btn: { border: "none", background: "none", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center" },
  qty: { fontSize: "14px", fontWeight: "bold", color: "#fff" },
};