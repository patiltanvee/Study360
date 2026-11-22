export default function PackageCard({ pkg, onRequest, requesting }) {
  return (
    <div className="card ui">
      <h3>{pkg.title}</h3>
      <p className="meta">Class {pkg.studentClass} · {pkg.subject} · {pkg.sizeMB ? `${pkg.sizeMB} MB` : "size unknown"}</p>
      {pkg.description && <p style={{ fontSize: 14, margin: "8px 0" }}>{pkg.description}</p>}
      <button className="primary" disabled={requesting} onClick={() => onRequest(pkg)}>
        {requesting ? "Requesting..." : "Request access"}
      </button>
    </div>
  );
}
