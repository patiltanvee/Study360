import { useEffect, useState } from "react";
import api from "../api/axios";
import { getDeviceId } from "../api/deviceId";
import PackageCard from "../components/PackageCard";

export default function PackageCatalog() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    api.get("/packages")
      .then((res) => setPackages(res.data))
      .catch((err) => {
        setIsError(true);
        setMessage(err.response?.data?.message || "Could not load packages.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleRequest(pkg) {
    setRequestingId(pkg._id);
    setMessage("");
    setIsError(false);
    try {
      await api.post("/requests", { packageId: pkg._id, deviceId: getDeviceId() });
      setIsError(false);
      setMessage(`Requested "${pkg.title}". Check request status once an admin reviews it.`);
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || "Could not submit the request.");
    } finally {
      setRequestingId(null);
    }
  }

  if (loading) return <div className="shell ui"><p className="meta">Loading packages...</p></div>;

  return (
    <div className="shell">
      <h1>Study packages</h1>
      {message && (
        <p className={isError ? "error-text" : "meta"} style={{ marginBottom: 16 }}>
          {message}
        </p>
      )}
      {packages.length === 0 ? (
        <div className="empty">No packages published yet. Check back soon.</div>
      ) : (
        packages.map((pkg) => (
          <PackageCard key={pkg._id} pkg={pkg} onRequest={handleRequest} requesting={requestingId === pkg._id} />
        ))
      )}
    </div>
  );
}
