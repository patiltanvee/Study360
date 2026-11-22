import { useEffect, useState } from "react";
import api from "../api/axios";
import { Link } from "react-router-dom";

// This is the landing page once a student has at least one approved package.
// The AI assistant, tests, and flashcards are intentionally NOT built here yet -
// they run against the locally downloaded bundle and don't call this API at all
// once the package is on the device. See README for the offline runtime plan.
export default function StudentDashboard() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/requests/licenses/mine")
      .then((res) => setLicenses(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load your library."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="shell ui"><p className="meta">Loading your library...</p></div>;

  return (
    <div className="shell">
      <h1>Your library</h1>
      {error && <p className="error-text">{error}</p>}
      {licenses.length === 0 ? (
        <div className="empty">
          No approved packages yet. <Link to="/packages">Browse packages</Link> and request access.
        </div>
      ) : (
        licenses.map((lic) => (
          <div className="card ui" key={lic._id}>
            <h3>{lic.package?.title || "Study Package"}</h3>
            <p className="meta">Class {lic.package?.studentClass || "?"} · {lic.package?.subject || ""} · v{lic.package?.version || 1}</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>
              Ready to download in the desktop app for fully offline use (AI assistant, tests, flashcards).
            </p>
            {lic.expiresAt && (
              <p className="meta" style={{ marginTop: 6, fontSize: 12 }}>
                License valid until: {new Date(lic.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
