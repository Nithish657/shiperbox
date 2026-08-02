import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../api";

export default function AdminCourierReview() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actingOn, setActingOn] = useState(null);
  
  const [activeRoutes, setActiveRoutes] = useState([]);
  const [updatingRoute, setUpdatingRoute] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const timestamp = new Date().getTime();
      const res = await axios.get(`${API_URL}/admin/courier/${filter}?t=${timestamp}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
      });
      
      if (res.data.success) {
        setRequests(res.data.requests);
        if (res.data.routes) setActiveRoutes(res.data.routes); 
      }
    } catch (err) {
      console.error("Failed to load courier requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, [filter]);

  const handleUpdateRoute = async (e, id) => {
    e.preventDefault();
    const from = e.target.routeFrom.value;
    const to = e.target.routeTo.value;
    const stops = e.target.stops.value; // Grabbing stops from the input

    if (!from || !to) return alert("Please enter both 'From' and 'To' locations.");
    if (!window.confirm(`Updating Route ${id} will permanently set this new address and clear all filled ticks for this route. Continue?`)) return;

    setUpdatingRoute(true);
    try {
      const res = await axios.put(`${API_URL}/admin/courier/update-route`, 
        { id, route_from: from, route_to: to, stops }, // Included stops in payload
        { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } }
      );
      if (res.data.success) {
        alert(`Route ${id} updated successfully! Tracker reset to 0.`);
        await loadRequests(); 
      }
    } catch (err) { alert(err.response?.data?.message || "Failed to update route"); } 
    finally { setUpdatingRoute(false); }
  };

  const review = async (id, decision) => {
    setActingOn(id);
    try {
      const res = await axios.put(`${API_URL}/admin/courier/${id}/review`, { decision }, { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } });
      if (res.data.success) await loadRequests();
    } catch (err) { alert(err.response?.data?.message || "Failed to update request"); } 
    finally { setActingOn(null); }
  };

  const deleteRequest = async (id) => {
    if (!window.confirm("Permanently delete this request? This cannot be undone.")) return;
    setActingOn(id);
    try {
      const res = await axios.delete(`${API_URL}/admin/courier/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } });
      if (res.data.success) await loadRequests();
    } catch (err) { alert(err.response?.data?.message || "Failed to delete request"); } 
    finally { setActingOn(null); }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString() : "—");

  const statusColor = (status) => {
    if (status === "approved") return { bg: "#dff8e6", color: "#0c831f" };
    if (status === "rejected" || status === "deleted") return { bg: "#fde8e8", color: "#e53935" };
    if (status === "completed") return { bg: "#e0f2fe", color: "#0284c7" }; 
    return { bg: "#fff4e0", color: "#b8860b" };
  };

  return (
    <div style={styles.page}>
      
      <div style={styles.routeManager}>
        <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>Universally Fixed Courier Addresses</h3>
        
        {activeRoutes.map(route => (
          <form key={route.id} style={styles.routeInputs} onSubmit={(e) => handleUpdateRoute(e, route.id)}>
             <div style={{fontWeight: "bold", width: "70px"}}>Route {route.id}:</div>
            
            <input name="routeFrom" style={styles.input} placeholder="From (e.g., Hyd)" defaultValue={route.route_from || route.from} />
            
            {/* Added input for intermediate stops */}
            <input name="stops" style={{...styles.input, minWidth: "150px"}} placeholder="Sub-places (e.g., Pune, Sangareddy)" defaultValue={route.stops || ""} />
            
            <span style={{ fontWeight: "bold", color: "#666" }}>➔</span>
            
            <input name="routeTo" style={styles.input} placeholder="To (e.g., Zhb)" defaultValue={route.route_to || route.to} />
            
            <button type="submit" style={styles.routeBtn} disabled={updatingRoute}>
              {updatingRoute ? "Updating..." : `Start New Trip (Route ${route.id})`}
            </button>
          </form>
        ))}

        <p style={{ fontSize: "12px", color: "#666", marginTop: "8px", marginBottom: 0 }}>
          * Setting a new trip locks in the address and automatically empties the user progress tracker for that route.
        </p>
      </div>

      <div style={styles.header}>
        <h2 style={styles.title}>Courier Requests</h2>
        <div style={styles.tabs}>
          <button style={filter === "pending" ? styles.tabActive : styles.tab} onClick={() => setFilter("pending")}>Pending</button>
          <button style={filter === "all" ? styles.tabActive : styles.tab} onClick={() => setFilter("all")}>All</button>
        </div>
      </div>

      {loading ? ( <p style={styles.emptyText}>Loading...</p> ) : requests.length === 0 ? ( <p style={styles.emptyText}>No {filter === "pending" ? "pending" : ""} requests.</p> ) : (
        <div style={styles.grid}>
          {requests.map((req) => {
            const badge = statusColor(req.status);
            return (
              <div key={req.id} style={styles.card}>
                <div style={styles.cardBody}>
                  <div style={{ ...styles.badge, background: badge.bg, color: badge.color }}>{req.status}</div>
                  <p style={styles.row}><strong>Customer ID:</strong> {req.user_id}</p>
                  <p style={styles.row}><strong>Route ID:</strong> {req.route_id || 1}</p>
                  <p style={styles.row}><strong>Needed by:</strong> {formatDate(req.needed_by)}</p>
                  <hr style={{ margin: "10px 0", border: "0.5px solid #eee" }} />
                  <p style={styles.row}><strong>Pickup:</strong> {req.pickup_address}</p>
                  <p style={styles.row}><strong>Drop:</strong> {req.drop_address}</p>
                  {req.notes && <p style={styles.notes}>Notes: {req.notes}</p>}

                  {req.status === "pending" && (
                    <div style={styles.actions}>
                      <button style={styles.approveBtn} disabled={actingOn === req.id} onClick={() => review(req.id, "approved")}>{actingOn === req.id ? "Updating..." : "Accept"}</button>
                      <button style={styles.rejectBtn} disabled={actingOn === req.id} onClick={() => review(req.id, "rejected")}>{actingOn === req.id ? "Updating..." : "Reject"}</button>
                    </div>
                  )}

                  {(req.status === "approved" || req.status === "rejected" || req.status === "completed") && (
                    <div style={styles.actions}>
                      <button style={styles.deleteBtn} disabled={actingOn === req.id} onClick={() => deleteRequest(req.id)}>{actingOn === req.id ? "Deleting..." : "Delete"}</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: "10px", width: "100%" },
  routeManager: { background: "#f8fafc", border: "1px solid #e2e8f0", padding: "20px", borderRadius: "12px", marginBottom: "30px" },
  routeInputs: { display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap", marginBottom: "15px" },
  input: { padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", flex: 1, minWidth: "200px" },
  routeBtn: { padding: "10px 20px", background: "#0f172a", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" },
  title: { margin: 0, color: "#111" },
  tabs: { display: "flex", gap: "8px" },
  tab: { padding: "8px 18px", border: "1px solid #ddd", background: "#fff", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", color: "#555" },
  tabActive: { padding: "8px 18px", border: "1px solid #2874f0", background: "#2874f0", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", color: "#fff" },
  emptyText: { textAlign: "center", color: "#888", marginTop: "40px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" },
  card: { background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" },
  cardBody: { padding: "14px" },
  badge: { display: "inline-block", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", textTransform: "capitalize", marginBottom: "10px" },
  row: { fontSize: "14px", margin: "6px 0", color: "#333" },
  notes: { fontSize: "13px", color: "#666", marginTop: "8px", fontStyle: "italic", background: "#f9f9f9", padding: "8px", borderRadius: "4px" },
  actions: { display: "flex", gap: "10px", marginTop: "14px" },
  approveBtn: { flex: 1, padding: "10px", border: "none", borderRadius: "8px", background: "#0c831f", color: "#fff", fontWeight: "bold", cursor: "pointer" },
  rejectBtn: { flex: 1, padding: "10px", border: "none", borderRadius: "8px", background: "#e53935", color: "#fff", fontWeight: "bold", cursor: "pointer" },
  deleteBtn: { flex: 1, padding: "10px", border: "none", borderRadius: "8px", background: "#555", color: "#fff", fontWeight: "bold", cursor: "pointer" },
};