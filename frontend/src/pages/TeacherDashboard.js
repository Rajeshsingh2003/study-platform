import { useEffect, useState, useCallback  } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../styles.css";
import Chatbot from "../components/Chatbot";
import { useToast } from "../hooks/useToast";

function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const token = localStorage.getItem("token");
  let userName = "Teacher", userRole = null;
  if (token) {
    try { const d = jwtDecode(token); userName = d.name; userRole = d.role; } catch {}
  }

  

  const fetchAllNotes = useCallback(async () => {
    try {
      const res = await axios.get("/api/notes", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(res.data.data || res.data);
    } catch {}
  }, [token]);

  useEffect(() => {
    if (!token || userRole !== "teacher") { navigate("/"); return; }
    fetchAllNotes();
  }, [fetchAllNotes, navigate, token, userRole]);
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this student's note?")) return;
    try {
      await axios.delete(`/api/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Note removed");
      fetchAllNotes();
    } catch {
      showToast("Delete failed", "error");
    }
  };

  // Stats
  const uniqueStudents = [...new Set(notes.map(n => n.user?._id))].filter(Boolean).length;
  const totalLikes = notes.reduce((a, n) => a + (n.likes?.length || 0), 0);

  // Subject breakdown
  const subjects = ["OS","DBMS","CN","Math","Other"];
  const subjectCounts = subjects.map(s => ({
    name: s, count: notes.filter(n => n.subject === s).length
  }));

  let filtered = notes.filter(n => {
    const ms = n.title?.toLowerCase().includes(search.toLowerCase());
    const mf = subjectFilter === "All" || n.subject === subjectFilter;
    return ms && mf;
  });

  if (sortBy === "newest") filtered = [...filtered].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sortBy === "oldest") filtered = [...filtered].sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (sortBy === "likes") filtered = [...filtered].sort((a,b) => (b.likes?.length||0) - (a.likes?.length||0));

  return (
    <div className="page-wrapper">
      <div className="page-bg" />
      <nav className="navbar">
        <div className="navbar-logo">✦ StudyVault</div>
        <div className="navbar-right">
          <button className="btn btn-secondary" style={{fontSize:13}} onClick={() => navigate("/")}>
            ← Back to Hub
          </button>
          <div className="profile-badge" style={{cursor:"default"}}>
            <div className="avatar" style={{background:"linear-gradient(135deg,#f59e0b,#ef4444)"}}>
              {getInitials(userName)}
            </div>
            <span>{userName}</span>
            <span style={{fontSize:11,color:"var(--accent3)"}}>Teacher</span>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="page-hero">
          <h1>Teacher <span>Control Panel</span></h1>
          <p>Manage all student notes and monitor platform activity</p>
        </div>

        {/* STATS */}
        <div className="stats-strip">
          {[
            { n: notes.length, label: "Total Notes" },
            { n: uniqueStudents, label: "Active Students" },
            { n: totalLikes, label: "Total Likes" },
            { n: subjects.filter(s => notes.some(n => n.subject === s)).length, label: "Subjects Active" }
          ].map((s, i) => (
            <div key={i} className="glass stat-card">
              <div className="stat-number">{s.n}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="dashboard-layout">
          <div>
            {/* TOOLBAR */}
            <div className="toolbar">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input
                  className="search-input"
                  placeholder="Search all notes..."
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select className="filter-select" onChange={e => setSubjectFilter(e.target.value)}>
                {["All","OS","DBMS","CN","Math","Other"].map(s =>
                  <option key={s} value={s}>{s}</option>
                )}
              </select>
              <select className="filter-select" onChange={e => setSortBy(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="likes">Most Liked</option>
              </select>
            </div>

            {/* NOTES TABLE */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <h3>No notes found</h3>
                </div>
              ) : (
                filtered.map((note, i) => (
                  <div
                    key={note._id}
                    className="glass glass-hover"
                    style={{
                      padding: "18px 22px",
                      borderRadius: "var(--radius-sm)",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      animationDelay: `${i * 0.04}s`,
                      animation: "cardIn 0.3s ease both"
                    }}
                  >
                    <div className="avatar" style={{ width: 38, height: 38, fontSize: 14, flexShrink: 0 }}>
                      {getInitials(note.user?.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{note.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        By {note.user?.name || "Unknown"} · {new Date(note.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`note-subject-tag`} style={{ flexShrink: 0 }}>{note.subject}</div>
                    <div style={{ fontSize: 13, color: "var(--accent3)", flexShrink: 0 }}>
                      ☆ {note.likes?.length || 0}
                    </div>
                    <a
                      className="download-btn"
                      href={`http://localhost:5000/uploads/${note.file}`}
                      target="_blank" rel="noreferrer"
                      style={{ flexShrink: 0 }}
                    >
                      ↓
                    </a>
                    <button
                      className="btn btn-danger"
                      style={{ padding: "6px 14px", fontSize: 13, flexShrink: 0 }}
                      onClick={() => handleDelete(note._id)}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <div>
            <div className="glass sidebar-card">
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 16 }}>
                📊 Subject Breakdown
              </div>
              {subjectCounts.map(s => (
                <div key={s.name} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                    <span>{s.name}</span>
                    <span style={{ color: "var(--text-muted)" }}>{s.count}</span>
                  </div>
                  <div style={{ height: 5, background: "var(--border)", borderRadius: 3 }}>
                    <div style={{
                      height: "100%",
                      width: notes.length ? `${(s.count / notes.length) * 100}%` : "0%",
                      background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                      borderRadius: 3,
                      transition: "width 1.2s ease"
                    }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="glass sidebar-card" style={{ marginTop: 20 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 12 }}>
                🌟 Most Liked
              </div>
              {[...notes]
                .sort((a,b) => (b.likes?.length||0) - (a.likes?.length||0))
                .slice(0, 5)
                .map((note, i) => (
                  <div key={note._id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 0",
                    borderBottom: i < 4 ? "1px solid var(--border)" : "none",
                    fontSize: 13
                  }}>
                    <span style={{ color: "var(--gold)", fontWeight: 700 }}>#{i+1}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {note.title}
                    </span>
                    <span style={{ color: "var(--accent3)" }}>☆ {note.likes?.length || 0}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <Chatbot />
      <ToastContainer />
    </div>
  );
}