import { useEffect, useState } from "react";
import api from "../api/axios";

export default function AdminPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/requests", { params: { status: "pending" } });
      setRequests(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function decide(id, decision) {
    setActingId(id);
    setError("");
    try {
      await api.patch(`/admin/requests/${id}`, { decision });
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${decision} request.`);
    } finally {
      setActingId(null);
    }
  }

  if (loading) return <div className="shell ui"><p className="meta">Loading queue...</p></div>;

  return (
    <div className="shell">
      <h1>Pending access requests</h1>
      {error && <p className="error-text">{error}</p>}
      {requests.length === 0 ? (
        <div className="empty">Nothing waiting for review.</div>
      ) : (
        requests.map((r) => (
          <div className="card ui" key={r._id}>
            <h3>{r.user?.name || "Unknown"} <span className="meta">({r.user?.email || "No email"})</span></h3>
            <p className="meta">Requesting: {r.package?.title || "Package"} · Class {r.package?.studentClass || "?"}</p>
            {r.note && <p style={{ fontSize: 14 }}>Note: {r.note}</p>}
            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <button className="primary" disabled={actingId === r._id} onClick={() => decide(r._id, "approved")}>
                {actingId === r._id ? "Updating..." : "Approve"}
              </button>
              <button className="ghost" disabled={actingId === r._id} onClick={() => decide(r._id, "rejected")}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
