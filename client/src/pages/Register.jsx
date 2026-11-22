import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", studentClass: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === "admin" ? "/admin" : "/", { replace: true });
    }
  }, [user, navigate]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password || !form.studentClass) {
      setError("All fields are required.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/register", form);
      setDone(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="shell ui">
      <h1 style={{ fontFamily: "inherit" }}>Create an account</h1>
      {done ? (
        <p className="meta">Account created. Taking you to sign in...</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: 340, marginTop: 20 }}>
          {error && <p className="error-text">{error}</p>}
          <label>Full name</label>
          <input value={form.name} onChange={(e) => update("name", e.target.value)} />
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          <label>Password</label>
          <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} />
          <label>Class</label>
          <input placeholder="e.g. 10" value={form.studentClass} onChange={(e) => update("studentClass", e.target.value)} />
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>
      )}
      <p className="meta" style={{ marginTop: 16 }}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
