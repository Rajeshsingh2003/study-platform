// ForgotPassword.js
import { useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email) { setError("Enter your email"); return; }
    setLoading(true); setError("");
    try {
      await axios.post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to send email");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#070712,#0d0d1f)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Syne:wght@800&display=swap'); * { box-sizing: border-box; }`}</style>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "48px 44px", width: "100%", maxWidth: 440 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, background: "linear-gradient(135deg,#6366f1,#a5b4fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>
          ✦ StudyVault
        </div>
        {sent ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "#e2e8f0", marginBottom: 10 }}>Check your email!</div>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7 }}>If that email exists in our system, a password reset link has been sent. Check your inbox and spam folder.</p>
            <button onClick={() => navigate("/login")} style={{ marginTop: 20, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Back to Login →
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Reset Password</div>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>Enter your institutional email and we'll send you a reset link.</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 7 }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="you@college.edu"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%" }}
              />
            </div>
            {error && <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171", marginBottom: 16 }}>✕ {error}</div>}
            <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "13px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Sending..." : "Send Reset Link →"}
            </button>
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#4a5068" }}>
              Remember it? <span onClick={() => navigate("/login")} style={{ color: "#6366f1", cursor: "pointer", fontWeight: 600 }}>Sign in</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ResetPassword.js


export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true); setError("");
    try {
      await axios.post("/api/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.msg || "Reset failed");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#070712,#0d0d1f)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Syne:wght@800&display=swap'); * { box-sizing: border-box; }`}</style>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "48px 44px", width: "100%", maxWidth: 440 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, background: "linear-gradient(135deg,#6366f1,#a5b4fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 24 }}>
          ✦ StudyVault
        </div>
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "#e2e8f0", marginBottom: 10 }}>Password Reset!</div>
            <p style={{ color: "#64748b", fontSize: 14 }}>Your password has been changed successfully.</p>
            <button onClick={() => navigate("/login")} style={{ marginTop: 20, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Sign In →
            </button>
          </div>
        ) : !token ? (
          <div style={{ color: "#ef4444", textAlign: "center" }}>Invalid or missing reset token. Please request a new one.</div>
        ) : (
          <>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "#e2e8f0", marginBottom: 24 }}>Set New Password</div>
            {["New Password", "Confirm Password"].map((label, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 7 }}>{label}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={i === 0 ? password : confirm}
                  onChange={e => i === 0 ? setPassword(e.target.value) : setConfirm(e.target.value)}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%" }}
                />
              </div>
            ))}
            {error && <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171", marginBottom: 16 }}>✕ {error}</div>}
            <button onClick={handleReset} disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "13px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Resetting..." : "Reset Password →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}