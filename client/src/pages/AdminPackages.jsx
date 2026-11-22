import { useEffect, useState } from "react";
import api from "../api/axios";

const empty = {
  title: "", studentClass: "", subject: "", description: "", version: 1, price: 0,
  bundleKey: "", sizeMB: "", bundleSha256: "", encryptionKey: ""
};

export default function AdminPackages() {
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await api.get("/admin/packages");
      setPackages(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load packages.");
    }
  }
  useEffect(() => { load(); }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const required = ["title", "studentClass", "subject", "bundleKey", "encryptionKey"];
    if (required.some((k) => !String(form[k]).trim())) {
      setError("Title, class, subject, bundle path and encryption key are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/packages", {
        ...form,
        version: Number(form.version) || 1,
        price: Number(form.price) || 0,
        sizeMB: Number(form.sizeMB) || 0
      });
      setForm(empty);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create the package.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(pkg) {
    setError("");
    try {
      await api.patch(`/admin/packages/${pkg._id}/active`, { isActive: !pkg.isActive });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update package visibility.");
    }
  }

  return (
    <div className="shell">
      <h1>Packages</h1>

      <form className="card ui" onSubmit={handleSubmit}>
        <h3>Register a built package</h3>
        <p className="meta" style={{ marginBottom: 14 }}>
          Run the package builder first, then paste the values it prints.
        </p>
        {error && <p className="error-text">{error}</p>}

        <label>Title</label>
        <input value={form.title} onChange={(e) => update("title", e.target.value)} />
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Class</label>
            <input value={form.studentClass} onChange={(e) => update("studentClass", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Subject</label>
            <input value={form.subject} onChange={(e) => update("subject", e.target.value)} />
          </div>
          <div style={{ width: 90 }}>
            <label>Version</label>
            <input type="number" min="1" value={form.version} onChange={(e) => update("version", e.target.value)} />
          </div>
        </div>
        <label>Description</label>
        <input value={form.description} onChange={(e) => update("description", e.target.value)} />
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Price (0 = free)</label>
            <input type="number" value={form.price} onChange={(e) => update("price", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Size (MB)</label>
            <input type="number" value={form.sizeMB} onChange={(e) => update("sizeMB", e.target.value)} />
          </div>
        </div>
        <label>Bundle path / storage key</label>
        <input placeholder="bundles/class10-science-v1.bundle" value={form.bundleKey} onChange={(e) => update("bundleKey", e.target.value)} />
        <label>Bundle SHA-256</label>
        <input value={form.bundleSha256} onChange={(e) => update("bundleSha256", e.target.value)} />
        <label>Encryption key (hex, from the builder)</label>
        <input value={form.encryptionKey} onChange={(e) => update("encryptionKey", e.target.value)} />

        <button className="primary" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Create package"}
        </button>
      </form>

      {packages.length === 0 ? (
        <div className="empty">No packages yet.</div>
      ) : (
        packages.map((p) => (
          <div className="card ui" key={p._id}>
            <h3>{p.title} <span className="meta">v{p.version}</span></h3>
            <p className="meta">
              Class {p.studentClass} · {p.subject} · {p.sizeMB != null ? `${p.sizeMB} MB` : "? MB"} ·{" "}
              <span className={`status-pill ${p.isActive ? "status-approved" : "status-rejected"}`}>
                {p.isActive ? "visible" : "hidden"}
              </span>
            </p>
            <button className="ghost" style={{ marginTop: 10 }} onClick={() => toggleActive(p)}>
              {p.isActive ? "Hide from catalog" : "Show in catalog"}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
