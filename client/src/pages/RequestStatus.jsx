import { useEffect, useState } from "react";
import api from "../api/axios";

const pillClass = { pending: "status-pending", approved: "status-approved", rejected: "status-rejected" };

export default function RequestStatus() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/requests/mine")
      .then((res) => setRequests(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load requests."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="shell ui"><p className="meta">Loading...</p></div>;

  return (
    <div className="shell">
      <h1>Your requests</h1>
      {error && <p className="error-text">{error}</p>}
      {requests.length === 0 ? (
        <div className="empty">You haven't requested any packages yet.</div>
      ) : (
        requests.map((r) => (
          <div className="card ui" key={r._id}>
            <h3>{r.package?.title || "Package unavailable"}</h3>
            <p className="meta">Class {r.package?.studentClass || "?"} · {r.package?.subject || ""}</p>
            <span className={`status-pill ${pillClass[r.status] || "status-pending"}`}>{r.status}</span>
            {r.note && <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 6 }}>Note: {r.note}</p>}
            {r.status === "approved" && (
              <p className="meta" style={{ marginTop: 10 }}>
                Access granted. Open the desktop app and it will download the package for offline use.
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
