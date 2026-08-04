import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api";

const CATEGORIES = ["vegetables", "flowers"];
const emptyForm = { name: "", price: "", stock: "", quantity: "", image: null, subcategory: "Fresh vegetables" };
const SUBCATEGORY_OPTIONS = ["Root vegetables", "Cruciferous vegetables", "Fresh vegetables", "Leafy vegetables", "Gourds"];

export default function AdminDashboard() {
  const [view, setView] = useState("items"); 

  const [itemsByCategory, setItemsByCategory] = useState({ vegetables: [], flowers: [] });
  const [newItemForms, setNewItemForms] = useState({ vegetables: { ...emptyForm }, flowers: { ...emptyForm } });
  const [adding, setAdding] = useState({ vegetables: false, flowers: false });

  const [ads, setAds] = useState([]);
  const [newAdImage, setNewAdImage] = useState(null);
  const [uploadingAd, setUploadingAd] = useState(false);

  const [garlandRequests, setGarlandRequests] = useState([]);
  const [garlandLoading, setGarlandLoading] = useState(true);
  const [garlandFilter, setGarlandFilter] = useState("pending"); 
  const [garlandActingOn, setGarlandActingOn] = useState(null);

  const [groceryRequests, setGroceryRequests] = useState([]);
  const [groceryLoading, setGroceryLoading] = useState(true);
  const [groceryFilter, setGroceryFilter] = useState("pending");
  const [groceryActingOn, setGroceryActingOn] = useState(null); 

  const [courierRequests, setCourierRequests] = useState([]);
  const [courierLoading, setCourierLoading] = useState(true);
  const [courierFilter, setCourierFilter] = useState("pending");
  const [courierActingOn, setCourierActingOn] = useState(null);
  const [courierRoutes, setCourierRoutes] = useState([]); 

  const navigate = useNavigate();

  useEffect(() => { loadItems(); }, []);

  useEffect(() => {
    if (view === "garland") loadGarlandRequests();
    if (view === "grocery") loadGroceryRequests();
    if (view === "courier") loadCourierRequests(); 
    if (view === "ads") loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, garlandFilter, groceryFilter, courierFilter]);

  const loadItems = async () => {
    try {
      const results = await Promise.all(CATEGORIES.map(cat => axios.get(`${API_URL}/items/${cat}`)));
      const next = {};
      CATEGORIES.forEach((cat, i) => { next[cat] = results[i].data.items || []; });
      setItemsByCategory(next);
    } catch (err) { alert("Failed to load items"); }
  };

  const updateItem = async (category, id, name, price, stock, subcategory, quantity, imageFile) => {
    const payload = new FormData();
    payload.append("name", name);
    payload.append("price", price);
    payload.append("stock", stock);
    payload.append("subcategory", subcategory || "Fresh vegetables"); 
    payload.append("quantity", quantity || "");

    if (imageFile) payload.append("image", imageFile);

    try {
      await axios.put(`${API_URL}/admin/update-item/${category}/${id}`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
      });
      // Removed alert("Updated!"); to prevent multiple popups during background auto-saves
      loadItems();
    } catch (err) { alert(err.response?.data?.message || "Update failed"); }
  };

  const deleteItem = async (category, id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await axios.delete(`${API_URL}/admin/delete-item/${category}/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
      });
      loadItems(); 
    } catch (err) { alert(err.response?.data?.message || "Failed to delete item"); }
  };

  const handleFormChange = (category, field, value) => {
    setNewItemForms(prev => ({ ...prev, [category]: { ...prev[category], [field]: value } }));
  };

  const submitNewItem = async (category, e) => {
    e.preventDefault();
    const form = newItemForms[category];
    if (!form.name || form.price === "" || form.stock === "" || !form.image) return alert("Name, price, stock, and image are all required");

    const payload = new FormData();
    payload.append("name", form.name);
    payload.append("price", form.price);
    payload.append("stock", form.stock);
    payload.append("image", form.image);
    payload.append("subcategory", form.subcategory); 
    payload.append("quantity", form.quantity || "");

    setAdding(prev => ({ ...prev, [category]: true }));
    try {
      await axios.post(`${API_URL}/admin/add-item/${category}`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
      });
      setNewItemForms(prev => ({ ...prev, [category]: { ...emptyForm } }));
      loadItems();
    } catch (err) { alert(err.response?.data?.message || "Failed to add item"); } 
    finally { setAdding(prev => ({ ...prev, [category]: false })); }
  };

  const loadAds = async () => {
    try {
      const res = await axios.get(`${API_URL}/ads`);
      if (res.data.success) setAds(res.data.ads);
    } catch (err) { console.error("Failed to load ads"); }
  };

  const submitNewAd = async (e) => {
    e.preventDefault();
    if (!newAdImage) return alert("Please select an image first.");
    
    setUploadingAd(true);
    const payload = new FormData();
    payload.append("image", newAdImage);

    try {
      await axios.post(`${API_URL}/admin/add-ad`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
      });
      setNewAdImage(null);
      e.target.reset();
      loadAds(); 
    } catch (err) { alert("Failed to upload ad"); } 
    finally { setUploadingAd(false); }
  };

  const deleteAd = async (id) => {
    if (!window.confirm("Are you sure you want to delete this ad banner?")) return;
    try {
      await axios.delete(`${API_URL}/admin/delete-ad/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
      });
      loadAds(); 
    } catch (err) { alert("Failed to delete ad"); }
  };

  const loadGarlandRequests = async () => {
    setGarlandLoading(true);
    try {
      const endpoint = garlandFilter === "pending" ? "/garland/pending" : "/garland/all";
      const res = await axios.get(`${API_URL}${endpoint}`, { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } });
      if (res.data.success) setGarlandRequests(res.data.requests);
    } catch (err) {
      console.error("Garland fetch error:", err);
      if (err.response?.status === 401) {
        alert("Your admin session has expired. Please log in again.");
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
        return;
      }
      alert("Error fetching garland requests: " + (err.response?.data?.message || err.message));
    } finally { setGarlandLoading(false); }
  };

  const reviewGarlandRequest = async (id, decision) => {
    setGarlandActingOn(id);
    try {
      const res = await axios.put(`${API_URL}/garland/${id}/review`, { decision }, { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } });
      if (res.data.success) await loadGarlandRequests();
    } catch (err) { alert("Failed to update request"); } finally { setGarlandActingOn(null); }
  };

  const deleteGarlandRequest = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this garland request?")) return;
    setGarlandActingOn(id);
    try {
      const res = await axios.delete(`${API_URL}/garland/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } });
      if (res.data.success) { alert("Garland request deleted successfully!"); await loadGarlandRequests(); }
    } catch (err) { alert("Failed to delete garland request"); } finally { setGarlandActingOn(null); }
  };

  const loadGroceryRequests = async () => {
    setGroceryLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/grocery/${groceryFilter}`, { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } });
      if (res.data.success) setGroceryRequests(res.data.requests);
    } catch (err) {
      console.error("Grocery fetch error:", err);
      if (err.response?.status === 401) {
        alert("Your admin session has expired. Please log in again.");
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
        return;
      }
      alert("Error fetching grocery orders: " + (err.response?.data?.message || err.message));
    } finally { setGroceryLoading(false); }
  };

  const updateGroceryStatus = async (id, status) => {
    setGroceryActingOn(id);
    try {
      const res = await axios.put(`${API_URL}/admin/grocery/${id}/status`, { status }, { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } });
      if (res.data.success) await loadGroceryRequests();
    } catch (err) { alert("Failed to update status"); } finally { setGroceryActingOn(null); }
  };

  const deleteGroceryOrder = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this grocery order?")) return;
    setGroceryActingOn(id);
    try {
      const res = await axios.delete(`${API_URL}/admin/grocery/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } });
      if (res.data.success) { alert("Grocery order deleted successfully!"); await loadGroceryRequests(); }
    } catch (err) { alert("Failed to delete grocery order"); } finally { setGroceryActingOn(null); }
  };

  const loadCourierRequests = async () => {
    setCourierLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/courier/${courierFilter}`, { 
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } 
      });
      if (res.data.success) {
        setCourierRequests(res.data.requests);
        if (res.data.routes) setCourierRoutes(res.data.routes); 
      } else { alert("Server said: " + res.data.message); }
    } catch (err) { 
      console.error("Courier fetch error:", err);
      if (err.response?.status === 401) {
        alert("Your admin session has expired. Please log in again.");
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
        return;
      }
      alert("Error fetching courier orders: " + (err.response?.data?.message || err.message));
    } finally { setCourierLoading(false); }
  };

  const updateCourierRoute = async (e, id) => {
    e.preventDefault();
    const from = e.target.routeFrom.value;
    const to = e.target.routeTo.value;
    try {
      await axios.put(`${API_URL}/admin/courier/update-route`, { id, route_from: from, route_to: to }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
      });
      alert(`Route ${id} Updated Successfully and Ticks Reset!`);
      loadCourierRequests(); 
    } catch (err) { alert("Failed to update route"); }
  };

  const reviewCourierRequest = async (id, decision) => {
    setCourierActingOn(id);
    try {
      const res = await axios.put(`${API_URL}/admin/courier/${id}/review`, { decision }, { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } });
      if (res.data.success) await loadCourierRequests();
    } catch (err) { alert("Failed to update request"); } finally { setCourierActingOn(null); }
  };

  const deleteCourierRequest = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this courier request?")) return;
    setCourierActingOn(id);
    try {
      const res = await axios.delete(`${API_URL}/admin/courier/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } });
      if (res.data.success) { alert("Courier request deleted successfully!"); await loadCourierRequests(); }
    } catch (err) { alert("Failed to delete courier request"); } finally { setCourierActingOn(null); }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString() : "—");

  const badgeColor = (rawStatus) => {
    const status = String(rawStatus || "pending").toLowerCase().trim();
    if (status.includes("approve") || status.includes("deliver") || status.includes("done")) return { bg: "#dff8e6", color: "#0c831f" };
    if (status.includes("reject") || status.includes("cancel") || status.includes("delete")) return { bg: "#fde8e8", color: "#e53935" };
    if (status.includes("transit")) return { bg: "#eef4ff", color: "#2874f0" };
    return { bg: "#fff4e0", color: "#b8860b" };
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={dashboardStyles.headerRow}>
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
        <button onClick={() => { localStorage.removeItem("adminToken"); navigate("/admin/login"); }}>Logout</button>
      </div>

      <div style={dashboardStyles.mainTabs}>
        <button style={view === "items" ? dashboardStyles.mainTabActive : dashboardStyles.mainTab} onClick={() => setView("items")}>Items</button>
        <button style={view === "ads" ? dashboardStyles.mainTabActive : dashboardStyles.mainTab} onClick={() => setView("ads")}>Manage Ads</button>
        <button style={view === "garland" ? dashboardStyles.mainTabActive : dashboardStyles.mainTab} onClick={() => setView("garland")}>Garland Requests</button>
        <button style={view === "grocery" ? dashboardStyles.mainTabActive : dashboardStyles.mainTab} onClick={() => setView("grocery")}>Grocery Orders</button>
        <button style={view === "courier" ? dashboardStyles.mainTabActive : dashboardStyles.mainTab} onClick={() => setView("courier")}>Courier Requests</button>
      </div>

      {view === "items" && (
        <div>
           {CATEGORIES.map(category => (
            <div key={category} style={{ marginBottom: "40px" }}>
              <h2 style={{ textTransform: "capitalize" }}>{category}</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", marginBottom: "20px" }}>
                {itemsByCategory[category].map(item => {
                  const outOfStock = Number(item.stock) <= 0;
                  return (
                    <div key={item.id} style={{ border: "1px solid #ccc", padding: "10px", width: "180px", display: "flex", flexDirection: "column", gap: "8px", position: "relative", opacity: outOfStock ? 0.6 : 1 }}>
                      {outOfStock && ( <span style={{ position: "absolute", top: "8px", right: "8px", background: "#c0392b", color: "#fff", fontSize: "11px", fontWeight: "bold", padding: "3px 6px", borderRadius: "4px", zIndex: 1 }}>OUT OF STOCK</span> )}
                      {item.image ? ( <img src={item.image.startsWith("http") ? item.image : `${API_URL}/${item.image}`} alt={item.name} style={{ width: "100%", height: "120px", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} /> ) : ( <div style={{ width: "100%", height: "120px", background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#888" }}>No image</div> )}
                      <label style={{ fontSize: "12px", color: "#2874f0", cursor: "pointer" }}>Change image<input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const file = e.target.files[0]; if (file) { updateItem(category, item.id, item.name, item.price, item.stock, item.subcategory, item.quantity, file); e.target.value = ""; } }} /></label>
                      <input defaultValue={item.name} placeholder="Item Name" onBlur={(e) => updateItem(category, item.id, e.target.value, item.price, item.stock, item.subcategory, item.quantity, undefined)} />
                      <label style={{ fontSize: "12px", color: "#555" }}>Subcategory<select defaultValue={item.subcategory || "Fresh vegetables"} onChange={(e) => updateItem(category, item.id, item.name, item.price, item.stock, e.target.value, item.quantity, undefined)} style={{ width: "100%", padding: "4px" }}>{SUBCATEGORY_OPTIONS.map(sub => (<option key={sub} value={sub}>{sub}</option>))}</select></label>
                      <label style={{ fontSize: "12px", color: "#555" }}>Quantity<input type="text" placeholder="e.g. 500 grms, 1 kg" defaultValue={item.quantity} onBlur={(e) => updateItem(category, item.id, item.name, item.price, item.stock, item.subcategory, e.target.value, undefined)} style={{ width: "100%", padding: "4px", boxSizing: "border-box" }} /></label>
                      <label style={{ fontSize: "12px", color: "#555" }}>Price<input type="number" defaultValue={item.price} onBlur={(e) => updateItem(category, item.id, item.name, e.target.value, item.stock, item.subcategory, item.quantity, undefined)} /></label>
                      <label style={{ fontSize: "12px", color: "#555" }}>Stock<input type="number" min="0" defaultValue={item.stock} onBlur={(e) => updateItem(category, item.id, item.name, item.price, e.target.value, item.subcategory, item.quantity, undefined)} /></label>
                      <button onClick={() => deleteItem(category, item.id)} style={{ background: "#c0392b", color: "white", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer", marginTop: "5px", fontSize: "12px" }}>Delete Item</button>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={(e) => submitNewItem(category, e)} style={{ border: "1px dashed #999", padding: "12px", width: "220px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <strong style={{ fontSize: "13px" }}>Add new {category.slice(0, -1)}</strong>
                <input placeholder="Name" value={newItemForms[category].name} onChange={(e) => handleFormChange(category, "name", e.target.value)} />
                <select value={newItemForms[category].subcategory} onChange={(e) => handleFormChange(category, "subcategory", e.target.value)} style={{ padding: "4px" }}>{SUBCATEGORY_OPTIONS.map(sub => (<option key={sub} value={sub}>{sub}</option>))}</select>
                <input type="text" placeholder="Quantity (e.g. 500 grms)" value={newItemForms[category].quantity} onChange={(e) => handleFormChange(category, "quantity", e.target.value)} />
                <input type="number" placeholder="Price" value={newItemForms[category].price} onChange={(e) => handleFormChange(category, "price", e.target.value)} />
                <input type="number" min="0" placeholder="Stock" value={newItemForms[category].stock} onChange={(e) => handleFormChange(category, "stock", e.target.value)} />
                <input type="file" accept="image/*" onChange={(e) => handleFormChange(category, "image", e.target.files[0])} />
                <button type="submit" disabled={adding[category]}>{adding[category] ? "Adding..." : "Add item"}</button>
              </form>
            </div>
          ))}
        </div>
      )}

      {view === "ads" && (
        <div>
          <h2>Manage Ad Banners</h2>
          <form onSubmit={submitNewAd} style={{ border: "1px dashed #999", padding: "20px", marginBottom: "30px", maxWidth: "400px", borderRadius: "8px", background: "#f9f9f9" }}>
            <h3 style={{ margin: "0 0 15px 0", fontSize: "16px" }}>Upload New Ad Banner</h3>
            <input type="file" accept="image/*" onChange={(e) => setNewAdImage(e.target.files[0])} style={{ marginBottom: "15px", display: "block" }} />
            <button type="submit" disabled={uploadingAd} style={{ background: "#2874f0", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>{uploadingAd ? "Uploading..." : "Upload Ad"}</button>
          </form>
          <h3 style={{ borderBottom: "1px solid #ddd", paddingBottom: "10px", marginBottom: "20px" }}>Current Active Ads</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
            {ads.length === 0 ? <p>No ads currently active.</p> : null}
            {ads.map(ad => (
              <div key={ad.id} style={{ border: "1px solid #ccc", padding: "10px", borderRadius: "8px", width: "300px", background: "#fff" }}>
                <img src={ad.image.startsWith("http") ? ad.image : `${API_URL}/${ad.image}`} alt="Ad Banner" style={{ width: "100%", height: "150px", objectFit: "cover", borderRadius: "4px", marginBottom: "10px" }} />
                <button onClick={() => deleteAd(ad.id)} style={{ width: "100%", background: "#c0392b", color: "white", border: "none", padding: "8px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Delete Ad</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "garland" && (
        <div style={garlandStyles.page}>
          <div style={garlandStyles.header}>
            <h2 style={garlandStyles.title}>Garland Requests</h2>
            <div style={garlandStyles.tabs}>
              <button style={garlandFilter === "pending" ? garlandStyles.tabActive : garlandStyles.tab} onClick={() => setGarlandFilter("pending")}>Pending</button>
              <button style={garlandFilter === "all" ? garlandStyles.tabActive : garlandStyles.tab} onClick={() => setGarlandFilter("all")}>All</button>
            </div>
          </div>
          {garlandLoading ? ( <p style={garlandStyles.emptyText}>Loading...</p> ) : garlandRequests.length === 0 ? ( <p style={garlandStyles.emptyText}>No requests.</p> ) : (
            <div style={garlandStyles.grid}>
              {garlandRequests.map((req) => {
                const badge = badgeColor(req.approval_status);
                return (
                  <div key={req.id} style={garlandStyles.card}>
                    <img src={req.reference_image && req.reference_image.startsWith("http") ? req.reference_image : `${API_URL}/uploads/${req.reference_image}`} alt="Reference" style={garlandStyles.image} />
                    <div style={garlandStyles.cardBody}>
                      <div style={{ ...garlandStyles.badge, backgroundColor: badge.bg, color: badge.color }}>{req.approval_status || "pending"}</div>
                      <p style={garlandStyles.row}><strong>Customer ID:</strong> {req.user_id}</p>
                      <p style={garlandStyles.row}><strong>Needed by:</strong> {formatDate(req.needed_by)}</p>
                      <hr style={{ margin: "10px 0", border: "0.5px solid #eee" }} />
                      <p style={garlandStyles.row}><strong>Name:</strong> {req.name || "—"}</p>
                      <p style={garlandStyles.row}><strong>Email:</strong> {req.email || "—"}</p>
                      <p style={garlandStyles.row}><strong>Phone Number:</strong> {req.phone_number ? `+91 ${req.phone_number}` : "—"}</p>
                      <p style={garlandStyles.row}><strong>Whatsapp Number:</strong> {req.alt_phone_num ? `+91 ${req.alt_phone_num}` : "—"}</p>
                      <hr style={{ margin: "10px 0", border: "0.5px solid #eee" }} />
                      <p style={garlandStyles.row}><strong>Delivery Address:</strong></p>
                      <p style={{ ...garlandStyles.row, marginTop: "-4px" }}>
                        {[req.building_name, req.street, req.landmark, req.city_or_village, req.state].filter(Boolean).join(", ")}
                        {req.pin_code ? ` - ${req.pin_code}` : ""}
                        {![req.building_name, req.street, req.landmark, req.city_or_village, req.state, req.pin_code].some(Boolean) && "—"}
                      </p>
                      {req.notes && <p style={garlandStyles.notes}>{req.notes}</p>}

                      {req.approval_status === "pending" && (
                        <div style={garlandStyles.actions}>
                          <button style={garlandStyles.approveBtn} disabled={garlandActingOn === req.id} onClick={() => reviewGarlandRequest(req.id, "approved")}>{garlandActingOn === req.id ? "..." : "Approve"}</button>
                          <button style={garlandStyles.rejectBtn} disabled={garlandActingOn === req.id} onClick={() => reviewGarlandRequest(req.id, "rejected")}>{garlandActingOn === req.id ? "..." : "Reject"}</button>
                        </div>
                      )}

                      <div style={{ marginTop: "10px" }}>
                        <button style={{ padding: "10px", width: "100%", border: "none", borderRadius: "8px", background: "#333", color: "#fff", fontWeight: "bold", cursor: "pointer", opacity: garlandActingOn === req.id ? 0.7 : 1 }} disabled={garlandActingOn === req.id} onClick={() => deleteGarlandRequest(req.id)}>
                          {garlandActingOn === req.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === "grocery" && (
        <div style={garlandStyles.page}>
          <div style={garlandStyles.header}>
            <h2 style={garlandStyles.title}>Grocery Orders</h2>
            <div style={garlandStyles.tabs}>
              <button style={groceryFilter === "pending" ? garlandStyles.tabActive : garlandStyles.tab} onClick={() => setGroceryFilter("pending")}>Pending</button>
              <button style={groceryFilter === "all" ? garlandStyles.tabActive : garlandStyles.tab} onClick={() => setGroceryFilter("all")}>All</button>
            </div>
          </div>
          {groceryLoading ? ( <p style={garlandStyles.emptyText}>Loading...</p> ) : groceryRequests.length === 0 ? ( <p style={garlandStyles.emptyText}>No grocery orders found.</p> ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {groceryRequests.map((req) => {
                const badge = badgeColor(req.status);
                let orderData = null;
                try {
                  if (req.notes && req.notes.startsWith("{")) {
                    orderData = JSON.parse(req.notes);
                  }
                } catch (e) {}

                return (
                  <div key={req.id} style={{ ...garlandStyles.card, borderTop: `4px solid ${badge.color}` }}>
                    <div style={garlandStyles.cardBody}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                        <h3 style={{ margin: 0, fontSize: "16px" }}>Order #{req.id}</h3>
                        <div style={{ ...garlandStyles.badge, backgroundColor: badge.bg, color: badge.color, margin: 0 }}>
                          {req.status || "pending"}
                        </div>
                      </div>
                      {orderData ? (
                        <>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginBottom: "15px" }}>
                            <div style={{ flex: 1, minWidth: "200px" }}>
                              <p style={garlandStyles.row}><strong>Customer:</strong> {orderData.contact.fullName}</p>
                              <p style={garlandStyles.row}><strong>Mobile Number:</strong> +91 {orderData.contact.phone}</p>
                              <p style={garlandStyles.row}><strong>Whatsapp Number:</strong> +91 {orderData.contact.altPhone}</p>
                              <p style={garlandStyles.row}><strong>Needed By:</strong> {req.delivery_date ? formatDate(req.delivery_date) : (orderData.deliveryDate || "—")}{(req.delivery_slot || orderData.deliverySlot) ? `, ${req.delivery_slot || orderData.deliverySlot}` : ""}</p>
                            </div>
                            <div style={{ flex: 1, minWidth: "200px" }}>
                              <p style={garlandStyles.row}><strong>Address:</strong><br/>{req.drop_address}</p>
                            </div>
                          </div>
                          <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "8px" }}>
                            <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#555" }}>Ordered Items</h4>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
                              {orderData.items.map((item, index) => (
                                <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px", background: "#fff", padding: "8px", borderRadius: "8px", border: "1px solid #eee", width: "fit-content" }}>
                                  <img src={item.image && item.image.startsWith("http") ? item.image : `${API_URL}/${item.image}`} alt={item.name} style={{ width: "50px", height: "50px", borderRadius: "6px", objectFit: "cover" }} />
                                  <div>
                                    <p style={{ margin: 0, fontWeight: "bold", fontSize: "13px" }}>{item.name}</p>
                                    <p style={{ margin: 0, color: "#666", fontSize: "12px" }}>Qty: {item.quantity} • ₹{item.price}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <p style={{ ...garlandStyles.notes, whiteSpace: "pre-wrap" }}>{req.notes}</p>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #eee" }}>
                        <p style={{ margin: 0, fontWeight: "bold", fontSize: "16px" }}>Total: ₹{req.total_price}</p>
                        <div style={garlandStyles.actions}>
                          {(!req.status || req.status === "pending") && (
                            <>
                              <button style={{ ...garlandStyles.approveBtn, background: "#2874f0", opacity: groceryActingOn === req.id ? 0.7 : 1 }} disabled={groceryActingOn === req.id} onClick={() => updateGroceryStatus(req.id, "transit")}>
                                {groceryActingOn === req.id ? "Updating..." : "Mark Transit"}
                              </button>
                              <button style={{ ...garlandStyles.rejectBtn, opacity: groceryActingOn === req.id ? 0.7 : 1 }} disabled={groceryActingOn === req.id} onClick={() => { if(window.confirm("Are you sure you want to reject this grocery order?")) updateGroceryStatus(req.id, "rejected"); }}>
                                {groceryActingOn === req.id ? "Updating..." : "Reject"}
                              </button>
                            </>
                          )}
                          {req.status === "transit" && (
                            <button style={{ ...garlandStyles.approveBtn, opacity: groceryActingOn === req.id ? 0.7 : 1 }} disabled={groceryActingOn === req.id} onClick={() => updateGroceryStatus(req.id, "done")}>
                              {groceryActingOn === req.id ? "Updating..." : "Mark Done"}
                            </button>
                          )}
                          <button style={{ padding: "10px", border: "none", borderRadius: "8px", background: "#333", color: "#fff", fontWeight: "bold", cursor: "pointer", opacity: groceryActingOn === req.id ? 0.7 : 1 }} disabled={groceryActingOn === req.id} onClick={() => deleteGroceryOrder(req.id)}>
                            {groceryActingOn === req.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === "courier" && (
        <div style={garlandStyles.page}>
          <div style={garlandStyles.header}>
            <h2 style={garlandStyles.title}>Courier Requests</h2>
            <div style={garlandStyles.tabs}>
              <button style={courierFilter === "pending" ? garlandStyles.tabActive : garlandStyles.tab} onClick={() => setCourierFilter("pending")}>Pending</button>
              <button style={courierFilter === "all" ? garlandStyles.tabActive : garlandStyles.tab} onClick={() => setCourierFilter("all")}>All</button>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", borderLeft: "4px solid #8ec5fc" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", color: "#333" }}>Update Customer Routes & Clear Ticks</h3>
            <p style={{ margin: "0 0 15px 0", fontSize: "13px", color: "#666" }}>Updating a route automatically empties the user progress tracker for that specific route.</p>
            
            {courierRoutes.map(route => (
              <form 
                key={route.id}
                style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap", marginBottom: "15px" }}
                onSubmit={(e) => updateCourierRoute(e, route.id)}
              >
                <div style={{fontWeight: "bold", width: "70px"}}>Route {route.id}:</div>
                <input name="routeFrom" defaultValue={route.route_from || route.from} placeholder="From (e.g. Hyderabad)" required style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", flex: 1, minWidth: "150px" }} />
                <span style={{ fontWeight: "bold", color: "#555" }}>TO</span>
                <input name="routeTo" defaultValue={route.route_to || route.to} placeholder="To (e.g. Bidar)" required style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", flex: 1, minWidth: "150px" }} />
                <button type="submit" style={{ padding: "10px 20px", background: "#2874f0", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Save Route {route.id}</button>
              </form>
            ))}
          </div>

          {courierLoading ? ( <p style={garlandStyles.emptyText}>Loading...</p> ) : courierRequests.length === 0 ? ( <p style={garlandStyles.emptyText}>No courier requests found.</p> ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {courierRequests.map((req) => {
                const badge = badgeColor(req.status || req.approval_status);
                return (
                  <div key={req.id} style={{ ...garlandStyles.card, borderTop: `4px solid ${badge.color}` }}>
                    <div style={garlandStyles.cardBody}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                        <h3 style={{ margin: 0, fontSize: "16px" }}>Request #{req.id} <span style={{fontSize: "12px", color: "#666"}}>(Route {req.route_id || 1})</span></h3>
                        <div style={{ ...garlandStyles.badge, backgroundColor: badge.bg, color: badge.color, margin: 0 }}>
                          {req.status || "pending"}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginBottom: "15px" }}>
                        <div style={{ flex: 1, minWidth: "200px" }}>
                          <p style={garlandStyles.row}><strong>Customer ID:</strong> {req.user_id}</p>
                          <p style={garlandStyles.row}><strong>Needed By:</strong> {formatDate(req.needed_by)}</p>
                          <p style={garlandStyles.row}><strong>Name:</strong> {req.name || "—"}</p>
                          <p style={garlandStyles.row}><strong>Email:</strong> {req.email || "—"}</p>
                          <p style={garlandStyles.row}><strong>Phone Number:</strong> {req.phone_number ? `+91 ${req.phone_number}` : "—"}</p>
                          <p style={garlandStyles.row}><strong>Whatsapp Number:</strong> {req.alt_phone_num ? `+91 ${req.alt_phone_num}` : "—"}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginBottom: "15px", background: "#f8f9fa", padding: "10px", borderRadius: "8px" }}>
                        <div style={{ flex: 1, minWidth: "200px" }}>
                          <p style={{...garlandStyles.row, margin: 0}}><strong>Pickup Address:</strong><br/>{req.pickup_address}</p>
                        </div>
                        <div style={{ flex: 1, minWidth: "200px" }}>
                          <p style={{...garlandStyles.row, margin: 0}}><strong>Drop Address:</strong><br/>{req.drop_address}</p>
                        </div>
                        <div style={{ flex: 1, minWidth: "200px" }}>
                          <p style={{...garlandStyles.row, margin: 0}}>
                            <strong>Address on File:</strong><br/>
                            {[req.building_name, req.street, req.landmark, req.city_or_village, req.state].filter(Boolean).join(", ")}
                            {req.pin_code ? ` - ${req.pin_code}` : ""}
                            {![req.building_name, req.street, req.landmark, req.city_or_village, req.state, req.pin_code].some(Boolean) && "—"}
                          </p>
                        </div>
                      </div>
                      <p style={{ ...garlandStyles.notes, whiteSpace: "pre-wrap", background: "#fff9c4", padding: "10px", borderRadius: "8px", color: "#333" }}>
                        <strong>Package Notes & Details:</strong><br/>{req.notes}
                      </p>
                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #eee" }}>
                        <div style={garlandStyles.actions}>
                          {(!req.status || req.status === "pending") && (
                            <>
                              <button style={{ ...garlandStyles.approveBtn, opacity: courierActingOn === req.id ? 0.7 : 1 }} disabled={courierActingOn === req.id} onClick={() => reviewCourierRequest(req.id, "approved")}>
                                {courierActingOn === req.id ? "Updating..." : "Accept"}
                              </button>
                              <button style={{ ...garlandStyles.rejectBtn, opacity: courierActingOn === req.id ? 0.7 : 1 }} disabled={courierActingOn === req.id} onClick={() => reviewCourierRequest(req.id, "rejected")}>
                                {courierActingOn === req.id ? "Updating..." : "Reject"}
                              </button>
                            </>
                          )}
                          <button style={{ padding: "10px", border: "none", borderRadius: "8px", background: "#333", color: "#fff", fontWeight: "bold", cursor: "pointer", opacity: courierActingOn === req.id ? 0.7 : 1 }} disabled={courierActingOn === req.id} onClick={() => deleteCourierRequest(req.id)}>
                            {courierActingOn === req.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const dashboardStyles = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  mainTabs: { display: "flex", gap: "10px", marginBottom: "24px", borderBottom: "1px solid #ddd", paddingBottom: "12px", overflowX: "auto" },
  mainTab: { padding: "8px 20px", border: "1px solid #ddd", background: "#fff", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", color: "#555", whiteSpace: "nowrap" },
  mainTabActive: { padding: "8px 20px", border: "1px solid #2874f0", background: "#2874f0", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", color: "#fff", whiteSpace: "nowrap" },
};

const garlandStyles = {
  page: { padding: "0", maxWidth: "1200px", margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" },
  title: { margin: 0, color: "#111" },
  tabs: { display: "flex", gap: "8px" },
  tab: { padding: "8px 18px", border: "1px solid #ddd", background: "#fff", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", color: "#555" },
  tabActive: { padding: "8px 18px", border: "1px solid #2874f0", background: "#2874f0", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", color: "#fff" },
  emptyText: { textAlign: "center", color: "#888", marginTop: "40px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px" },
  card: { background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" },
  image: { width: "100%", height: "180px", objectFit: "cover" },
  cardBody: { padding: "14px" },
  badge: { display: "inline-block", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", textTransform: "capitalize", marginBottom: "10px" },
  row: { fontSize: "14px", margin: "6px 0", color: "#333" },
  notes: { fontSize: "13px", color: "#666", marginTop: "8px", fontStyle: "italic" },
  actions: { display: "flex", gap: "10px", marginTop: "14px" },
  approveBtn: { flex: 1, padding: "10px", border: "none", borderRadius: "8px", background: "#0c831f", color: "#fff", fontWeight: "bold", cursor: "pointer" },
  rejectBtn: { flex: 1, padding: "10px", border: "none", borderRadius: "8px", background: "#e53935", color: "#fff", fontWeight: "bold", cursor: "pointer" },
};