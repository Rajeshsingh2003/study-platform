import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import "../styles.css";
const API_URL = process.env.REACT_APP_API_URL;
export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", semester: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [domainWarning, setDomainWarning] = useState("");

  const checkDomain = async (email) => {
    if (!email.includes("@")) return;
    try {
      const res = await api.post(`${API_URL}/api/auth/check-domain`, { email });
      if (!res.data.allowed) {
        setDomainWarning(`Only these domains are allowed: ${res.data.domains.join(", ")}`);
      } else {
        setDomainWarning("");
      }
    } catch {}
  };

  const handleSignup = async () => {
    if (!form.name || !form.email || !form.password) { setError("Please fill in all fields"); return; }
    if (form.role === "student" && !form.semester) { setError("Please enter your semester"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (domainWarning) { setError(domainWarning); return; }

    setLoading(true); setError("");
    try {
  await api.post("/api/auth/signup", form);

  await api.post("/api/auth/login", {
    email: form.email,
    password: form.password,
  });

  navigate("/");
} catch (err) {
  setError(err.response?.data?.msg || "Signup failed");
} finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-bg" />
      <div className="auth-page">
        <div className="glass auth-card">
          <div className="auth-logo">✦ StudyVault</div>
          <div className="auth-tagline">Join thousands of students & teachers</div>

          <div className="auth-form">
            <div className="field-group">
              <label className="field-label">Full Name</label>
              <input className="field-input" placeholder="Arjun Sharma" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="field-group">
              <label className="field-label">Email Address</label>
              <input
                className="field-input"
                type="email"
                placeholder="you@college.edu"
                value={form.email}
                onChange={e => { setForm({ ...form, email: e.target.value }); checkDomain(e.target.value); }}
              />
              {domainWarning && <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 5 }}>⚠️ {domainWarning}</div>}
            </div>

            <div className="field-group">
              <label className="field-label">Password</label>
              <input className="field-input" type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>

            <div className="field-group">
              <label className="field-label">I am a...</label>
              <div className="role-selector">
                {[{ value: "student", icon: "🎓", label: "Student" }, { value: "teacher", icon: "🏫", label: "Teacher" }].map(r => (
                  <div key={r.value} className={`role-option ${form.role === r.value ? "selected" : ""}`} onClick={() => setForm({ ...form, role: r.value })}>
                    <span className="role-icon">{r.icon}</span>{r.label}
                  </div>
                ))}
              </div>
            </div>

            {form.role === "student" && (
              <div className="field-group">
                <label className="field-label">Semester</label>
                <input className="field-input" type="number" placeholder="Enter semester (e.g. 3)" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} />
              </div>
            )}

            {error && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>
                ✕ {error}
              </div>
            )}

            <button className="auth-btn" onClick={handleSignup} disabled={loading}>
              {loading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><div className="spinner" /> Creating account...</span>
                : "Create Account →"
              }
            </button>
          </div>

          <div className="auth-switch">
            Already have an account?{" "}
            <span onClick={() => navigate("/login")}>Sign in</span>
          </div>
        </div>
      </div>
    </div>
  );
}