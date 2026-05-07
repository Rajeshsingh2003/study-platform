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

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");

  const token = localStorage.getItem("token");
  let userName = "Student";
  if (token) {
    try { const d = jwtDecode(token); userName = d.name; } catch {}
  }

  

  const fetchMyNotes = useCallback(async () => {
    try {
      const res = await axios.get("/api/my-notes", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(res.data.data || res.data);
    } catch {}
  }, [token]);
  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchMyNotes();
  }, [fetchMyNotes, navigate, token]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await axios.delete(`/api/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Note deleted");
      fetchMyNotes();
    } catch {
      showToast("Could not delete", "error");
    }
  };

  const filtered = notes.filter(n =>
    n.title?.toLowerCase().includes(search.toLowerCase())
  );

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
            <div className="avatar">{getInitials(userName)}</div>
            <span>{userName}</span>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="page-hero">
          <h1>My <span>Notes</span></h1>
          <p>All notes you've uploaded to StudyVault</p>
        </div>

        <div className="stats-strip" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[
            { n: notes.length, label: "Notes Uploaded" },
            { n: notes.reduce((a,n)=>a+(n.likes?.length||0),0), label: "Total Likes Received" },
            { n: notes.length * 10, label: "Points Earned" }
          ].map((s,i) => (
            <div key={i} className="glass stat-card">
              <div className="stat-number">{s.n}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Search your notes..."
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="notes-grid">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <h3>No notes yet</h3>
              <p>Go to the main hub and upload your first note!</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate("/")}>
                Go to Hub →
              </button>
            </div>
          ) : (
            filtered.map((note, i) => (
              <div key={note._id} className="glass glass-hover note-card" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="note-subject-tag">{note.subject}</div>
                <div className="note-title">{note.title}</div>
                <div className="note-meta">
                  ☆ {note.likes?.length || 0} likes · {new Date(note.createdAt).toLocaleDateString()}
                </div>
                <div className="note-actions">
                  <a
                    className="download-btn"
                    href={`/uploads/${note.file}`}
                    target="_blank" rel="noreferrer"
                  >
                    ↓ Download
                  </a>
                  <button
                    className="btn btn-danger"
                    style={{ padding: "6px 12px", fontSize: 13 }}
                    onClick={() => handleDelete(note._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <Chatbot />
      <ToastContainer />
    </div>
  );
}