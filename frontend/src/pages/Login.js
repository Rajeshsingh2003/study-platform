import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles.css";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError("Please fill in all fields"); return; }
    setLoading(true); setError("");
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", form);
      localStorage.setItem("token", res.data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.msg || "Invalid credentials. Please try again.");
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
          <div className="auth-tagline">Your academic knowledge hub</div>

          <div className="auth-form">
            <div className="field-group">
              <label className="field-label">Email Address</label>
              <input
                className="field-input"
                type="email"
                placeholder="you@college.edu"
                onChange={e => setForm({ ...form, email: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                autoFocus
              />
            </div>

            <div className="field-group">
              <label className="field-label">Password</label>
              <input
                className="field-input"
                type="password"
                placeholder="••••••••"
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
              <div style={{ textAlign: "right", marginTop: 6 }}>
                <span
                  onClick={() => navigate("/forgot-password")}
                  style={{ fontSize: 12, color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}
                >
                  Forgot password?
                </span>
              </div>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>
                ✕ {error}
              </div>
            )}

            <button className="auth-btn" onClick={handleLogin} disabled={loading}>
              {loading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><div className="spinner" /> Signing in...</span>
                : "Sign In →"
              }
            </button>
          </div>

          <div className="auth-switch">
            Don't have an account?{" "}
            <span onClick={() => navigate("/register")}>Create one</span>
          </div>
        </div>
      </div>
    </div>
  );
}