import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api";
import MobileBottomNav from "../mobile/MobileBottomNav";
import { getImageUrl } from "../utils/imageUrl";

const GRADIENT = "linear-gradient(135deg, #4a90f5 0%, #2563eb 100%)";

export default function CategoryItems() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedSub, setSelectedSub] = useState("All");
  const user_id = localStorage.getItem("phone") || "guest";

  const fetchCartData = async () => {
    if (user_id === "guest") return;
    try {
      const res = await axios.get(`${API_URL}/cart/${user_id}`);
      if (res.data.success) setCartItems(res.data.cart);
    } catch (err) { 
      console.log("Cart fetch error:", err); 
    }
  };

  const fetchItems = () => {
    setLoading(true);
    setError(false);
    axios.get(`${API_URL}/items/${categoryId}`)
      .then((res) => { 
        if (res.data.success) setItems(res.data.items); 
        else setError(true); 
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCartData();
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const isFlowers = categoryId === "flowers";
  const subCategories = isFlowers ? [] : ["All", ...new Set(items.map((i) => i.subcategory || "General"))];
  const filteredItems = (selectedSub === "All" || isFlowers) ? items : items.filter((i) => (i.subcategory || "General") === selectedSub);

  const goSearch = () => { 
    if (search.trim() !== "") navigate(`/search?q=${encodeURIComponent(search.trim())}`); 
  };

  const addToCart = async (product) => {
    if (user_id === "guest") return alert("Please login to add items.");
    try {
      await axios.post(`${API_URL}/cart/add`, { user_id, product_id: product.id, category: categoryId });
      await fetchCartData();
      window.dispatchEvent(new Event("cartUpdated")); 
    } catch (err) { 
      console.log(err); 
    }
  };

  const updateQty = async (cart_id, action) => {
    const item = cartItems.find((i) => i.id === cart_id);
    if (!item) return;
    try {
      if (action === "decrease" && item.quantity <= 1) {
        await axios.delete(`${API_URL}/cart/${cart_id}`);
      } else {
        await axios.put(`${API_URL}/cart/${action}/${cart_id}`);
      }
      await fetchCartData();
      window.dispatchEvent(new Event("cartUpdated")); 
    } catch (err) { 
      console.log(err); 
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.fixedHeader}>
        <div style={styles.headerTop}>
          <h2 style={styles.logo} onClick={() => navigate("/")}>ShiperBox</h2>
          <div style={styles.searchBox}>
            <input 
              type="text" 
              placeholder="Search..." 
              style={styles.searchInput} 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && goSearch()} 
            />
            <button style={styles.searchBtn} onClick={goSearch}>🔍</button>
          </div>
        </div>
      </div>

      <div style={styles.mainWrapper}>
        {!isFlowers && (
          <div style={styles.sidebar}>
            {subCategories.map((sub) => (
              <button 
                key={sub} 
                style={selectedSub === sub ? styles.sideBtnActive : styles.sideBtn} 
                onClick={() => setSelectedSub(sub)}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        <div style={{...styles.scrollArea, marginLeft: isFlowers ? "0" : "92px"}}>
          {loading ? (
            <p style={styles.statusText}>Loading...</p>
          ) : error ? (
            <p style={styles.statusText}>Couldn't load items right now.</p>
          ) : items.length === 0 ? (
            <p style={styles.statusText}>No items found.</p>
          ) : (
            <div style={styles.grid}>
              {filteredItems.map((product) => {
                const cartItem = cartItems.find((c) => c.product_id === product.id);
                return (
                  <div key={product.id} style={styles.card}>
                    <div style={styles.imgWrapper}>
                      <img src={getImageUrl(product.image)} style={styles.image} alt={product.name} />
                    </div>
                    <h4 style={styles.name}>{product.name}</h4>
                    <div style={styles.bottomRow}>
                      <p style={styles.price}>₹{product.price}</p>
                      {cartItem ? (
                        <div style={styles.qtyBox}>
                          <button style={styles.btn} onClick={() => updateQty(cartItem.id, "decrease")}>-</button>
                          <span style={styles.qty}>{cartItem.quantity}</span>
                          <button style={styles.btn} onClick={() => updateQty(cartItem.id, "increase")}>+</button>
                        </div>
                      ) : (
                        <button style={styles.addBtn} onClick={() => addToCart(product)}>ADD</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}

const styles = {
  container: { backgroundColor: "#f5f7fa", minHeight: "100vh" },
  fixedHeader: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, backgroundColor: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" },
  headerTop: { display: "flex", alignItems: "center", gap: "10px", padding: "14px 15px", background: GRADIENT, color: "white" },
  logo: { margin: 0, fontSize: "18px", fontWeight: "800", cursor: "pointer" },
  searchBox: { flex: 1, height: "38px", display: "flex", backgroundColor: "white", borderRadius: "10px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
  searchInput: { flex: 1, border: "none", padding: "0 12px", outline: "none", fontSize: "14px" },
  searchBtn: { border: "none", background: "white", padding: "0 12px", cursor: "pointer" },
  
  mainWrapper: { display: "flex", paddingTop: "66px", paddingBottom: "95px" },
  sidebar: { width: "92px", position: "fixed", top: "66px", bottom: "95px", backgroundColor: "#fff", borderRight: "1px solid #eef1f5", overflowY: "auto", padding: "8px 0" },
  
  sideBtn: { display: "block", width: "100%", padding: "14px 6px", border: "none", background: "transparent", fontSize: "11px", fontWeight: "600", color: "#667085", textAlign: "center", cursor: "pointer", transition: "0.2s", borderLeft: "3px solid transparent" },
  sideBtnActive: { display: "block", width: "100%", padding: "14px 6px", border: "none", background: "#eaf1fe", fontSize: "11px", fontWeight: "700", color: "#2563eb", textAlign: "center", cursor: "pointer", transition: "0.2s", borderLeft: "3px solid #2563eb" },
  scrollArea: { flex: 1, padding: "15px", paddingBottom: "20px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  card: { backgroundColor: "#fff", padding: "12px", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  imgWrapper: { width: "100%", height: "100px", overflow: "hidden", borderRadius: "10px", marginBottom: "8px", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#f5f7fa" },
  image: { width: "100%", height: "100%", objectFit: "cover" },
  name: { fontSize: "13px", margin: "0 0 10px 0", height: "30px", overflow: "hidden", fontWeight: "700", color: "#111" },
  bottomRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  price: { fontWeight: "800", fontSize: "14px", margin: 0, color: "#111" },
  addBtn: { padding: "7px 14px", border: "1.5px solid #2563eb", backgroundColor: "#eaf1fe", color: "#2563eb", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer" },
  qtyBox: { display: "flex", alignItems: "center", gap: "8px", background: GRADIENT, borderRadius: "8px", padding: "4px 8px" },
  btn: { border: "none", background: "none", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "16px" },
  qty: { fontSize: "14px", fontWeight: "bold", color: "#fff", minWidth: "12px", textAlign: "center" },
  statusText: { textAlign: "center", color: "#888", padding: "30px", width: "100%" }
};