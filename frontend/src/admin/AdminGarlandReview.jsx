import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../api";

export default function AdminGarlandReview() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); 
  const [actingOn, setActingOn] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const endpoint = filter === "pending" ? "/garland/pending" : "/garland/all";
      const res = await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
      });
      if (res.data.success) setRequests(res.data.requests);
    } catch (err) {
      console.error("Failed to load garland requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, [filter]);

  const review = async (id, decision) => {
    setActingOn(id);
    try {
      const res = await axios.put(
        `${API_URL}/garland/${id}/review`,
        { decision },
        { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } }
      );
      if (res.data.success) await loadRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update request");
    } finally {
      setActingOn(null);
    }
  };

  const deleteRequest = async (id) => {
    if (!window.confirm("Permanently delete this request? This cannot be undone.")) return;
    setActingOn(id);
    try {
      const res = await axios.delete(`${API_URL}/garland/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
      });
      if (res.data.success) await loadRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete request");
    } finally {
      setActingOn(null);
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString() : "—");

  const statusColor = (status) => {
    if (status === "approved") return { bg: "#dff8e6", color: "#0c831f" };
    if (status === "rejected") return { bg: "#fde8e8", color: "#e53935" };
    return { bg: "#fff4e0", color: "#b8860b" };
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>Garland Requests</h2>
        <div style={styles.tabs}>
          <button style={filter === "pending" ? styles.tabActive : styles.tab} onClick={() => setFilter("pending")}>
            Pending
          </button>
          <button style={filter === "all" ? styles.tabActive : styles.tab} onClick={() => setFilter("all")}>
            All
          </button>
        </div>
      </div>

      {loading ? (
        <p style={styles.emptyText}>Loading...</p>
      ) : requests.length === 0 ? (
        <p style={styles.emptyText}>No {filter === "pending" ? "pending" : ""} requests.</p>
      ) : (
        <div style={styles.grid}>
          {requests.map((req) => {
            const badge = statusColor(req.approval_status);
            return (
              <div key={req.id} style={styles.card}>
                {req.reference_image && (
                  <img src={req.reference_image} alt="Reference" style={styles.image} />
                )}
                <div style={styles.cardBody}>
                  <div style={{ ...styles.badge, background: badge.bg, color: badge.color }}>
                    {req.approval_status}
                  </div>
                  <p style={styles.row}><strong>Customer:</strong> {req.user_id}</p>
                  <p style={styles.row}><strong>Needed by:</strong> {formatDate(req.needed_by)}</p>
                  {req.notes && <p style={styles.notes}>Notes: {req.notes}</p>}

                  {req.approval_status === "pending" && (
                    <div style={styles.actions}>
                      <button style={styles.approveBtn} disabled={actingOn === req.id} onClick={() => review(req.id, "approved")}>
                        {actingOn === req.id ? "Updating..." : "Approve"}
                      </button>
                      <button style={styles.rejectBtn} disabled={actingOn === req.id} onClick={() => {
                          if (window.confirm("Are you sure you want to reject this garland request?")) review(req.id, "rejected");
                        }}>
                        {actingOn === req.id ? "Updating..." : "Reject"}
                      </button>
                    </div>
                  )}

                  {(req.approval_status === "approved" || req.approval_status === "rejected") && (
                    <div style={styles.actions}>
                      <button style={styles.deleteBtn} disabled={actingOn === req.id} onClick={() => deleteRequest(req.id)}>
                        {actingOn === req.id ? "Deleting..." : "Delete"}
                      </button>
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" },
  title: { margin: 0, color: "#111" },
  tabs: { display: "flex", gap: "8px" },
  tab: { padding: "8px 18px", border: "1px solid #ddd", background: "#fff", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", color: "#555" },
  tabActive: { padding: "8px 18px", border: "1px solid #2874f0", background: "#2874f0", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", color: "#fff" },
  emptyText: { textAlign: "center", color: "#888", marginTop: "40px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" },
  card: { background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" },
  image: { width: "100%", height: "180px", objectFit: "cover" },
  cardBody: { padding: "14px" },
  badge: { display: "inline-block", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", textTransform: "capitalize", marginBottom: "10px" },
  row: { fontSize: "14px", margin: "6px 0", color: "#333" },
  notes: { fontSize: "13px", color: "#666", marginTop: "8px", fontStyle: "italic", background: "#f9f9f9", padding: "8px", borderRadius: "4px" },
  actions: { display: "flex", gap: "10px", marginTop: "14px" },
  approveBtn: { flex: 1, padding: "10px", border: "none", borderRadius: "8px", background: "#0c831f", color: "#fff", fontWeight: "bold", cursor: "pointer" },
  rejectBtn: { flex: 1, padding: "10px", border: "none", borderRadius: "8px", background: "#e53935", color: "#fff", fontWeight: "bold", cursor: "pointer" },
  deleteBtn: { flex: 1, padding: "10px", border: "none", borderRadius: "8px", background: "#555", color: "#fff", fontWeight: "bold", cursor: "pointer" },
};