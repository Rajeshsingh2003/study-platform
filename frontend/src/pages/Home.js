import "../styles.css";
import { useEffect, useState, useRef, useCallback  } from "react";
import api from "../api";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import Chatbot from "../components/Chatbot";
import { useToast } from "../hooks/useToast";
import { useCounter } from "../hooks/useCounter";
import AcademicCalendar from "../components/AcademicCalendar";

const SUBJECTS = ["All", "OS", "DBMS", "CN", "Math", "Other"];
const rankColors = [
  "#FFD700",
  "#C0C0C0",
  "#CD7F32",
  "#8B5CF6",
  "#3B82F6"
];
function getSubjectClass(subject) {
  if (!subject) return "subj-Other";
  const map = { OS: "subj-OS", DBMS: "subj-DBMS", CN: "subj-CN", Math: "subj-Math" };
  return map[subject] || "subj-Other";
}

function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function Home() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const fileInputRef = useRef(null);

  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("OS");
  const [showProfile, setShowProfile] = useState(false);
  const [view, setView] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);

  const token = localStorage.getItem("token");

  
  let currentUserId = null,
    userRole = null,
    userName = "User",
    userSem = "";
  if (token) {
    try {
      const d = jwtDecode(token);
      currentUserId = d.id;
      userRole = d.role;
      userName = d.name;
      userSem = d.semester;
    } catch {}
  }

  // Redirect if not logged in
  useEffect(() => {
  if (!token) navigate("/login");
}, [navigate, token]);

  
  

  const fetchNotes = useCallback(async () => {
    try {
      const url = view === "my"
        ? "/api/my-notes"
        : "/api/notes";
      const res = await api.get(url, {
        headers: view === "my" ? { Authorization: `Bearer ${token}` } : {}
      });
      setNotes(res.data.data || res.data);
    } catch {}
  }, [view, token]);
  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await api.get("/api/leaderboard");
      setLeaderboard(res.data || []);
    } catch {}
  }, []);
  useEffect(() => {
  fetchLeaderboard(); // first load

  const interval = setInterval(() => {
    fetchLeaderboard();   // refresh every 3 sec
  }, 3000);

  return () => clearInterval(interval);
}, [fetchLeaderboard]);
  const handleUpload = async () => {
    if (!file) { showToast("Please select a file first", "error"); return; }
    if (!title.trim()) { showToast("Please enter a title", "error"); return; }
    setUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("subject", subject);
      await api.post("/api/upload", formData, {
        
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded * 100) / e.total));
          
        }
      });
      showToast("Note uploaded successfully!");
      setFile(null); setTitle(""); setSubject("OS"); setUploadProgress(0);
      fetchNotes();
      await fetchLeaderboard();
    } catch {
      showToast("Upload failed. Try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (id) => {
    if (!token) { showToast("Login to like notes", "error"); return; }
    try {
      await api.post(`/api/notes/${id}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotes();
      await fetchLeaderboard();   // ⭐ ADD THIS
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await api.delete(`/api/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Note deleted");
      fetchNotes();
    } catch {
      showToast("Could not delete note", "error");
    }
  };

  const filteredNotes = (Array.isArray(notes) ? notes : []).filter(note => {
  const matchSearch = note.title
    ?.toLowerCase()
    .includes(search.toLowerCase());

  const matchSubject =
    subjectFilter === "All" ||
    note.subject === subjectFilter;

  return matchSearch && matchSubject;
});

  // Animated counters
  const notesCount = useCounter(Array.isArray(notes) ? notes.length : 0);
  const likesCount = useCounter(
  (Array.isArray(notes) ? notes : []).reduce(
    (a, n) => a + (n.likes?.length || 0),
    0
  )
);
  const uploadsCount = useCounter(
  (Array.isArray(notes) ? notes : []).filter(
    n => n.user?._id === currentUserId
  ).length
);
  

  return (
    <div className="page-wrapper">
      <h3 style={{ color: "white" }}>Welcome {userName}</h3>
<p style={{ color: "white" }}>Semester: {userSem}</p>
      <div className="page-bg" />

      {/* NAVBAR */}
      <nav className="navbar">
        
        <div className="navbar-logo">✦ StudyVault</div>
        <div className="navbar-right">
         <button
      className="btn btn-secondary"
      style={{ fontSize: 13 }}
      onClick={() => navigate("/groups")}
    >
      💬 Groups Chat
    </button>
    <button className="btn btn-secondary" style={{fontSize:13}} onClick={() => navigate("/books")}>
  📚 Library
</button>
<AcademicCalendar />


          {userRole === "teacher" && (
            <button className="btn btn-secondary" style={{fontSize:13}} onClick={() => navigate("/teacher")}>
              🏫 Teacher Panel
            </button>
          )}
          <div className="profile-badge" onClick={() => setShowProfile(s => !s)}>
            <div className="avatar">{getInitials(userName)}</div>
            <span>{userName}</span>
            <span style={{fontSize:10,color:'var(--text-muted)'}}>▾</span>

            {showProfile && (
              <div className="profile-dropdown" onClick={e => e.stopPropagation()}>
                <div className="dropdown-name">{userName}</div>
                <div className="dropdown-role">{userRole}</div>
                <div className="dropdown-pts">⭐ {leaderboard.find(u => u._id === currentUserId)?.points || 0} points earned</div>
                <button className="btn btn-logout" onClick={() => {
                  localStorage.removeItem("token");
                  navigate("/login");
                }}>Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="container">
        {/* HERO */}
        <div className="page-hero">
          <h1>Your Academic <span>Knowledge Hub</span></h1>
          <p>Share notes, discover resources, and learn together</p>
        </div>

        {/* STATS */}
        <div className="stats-strip">
          {[
            { number: notesCount, label: "Total Notes" },
            { number: likesCount, label: "Total Likes" },
            { number: uploadsCount, label: "Your Uploads" },
            { number: leaderboard.length, label: "Contributors" },
          ].map((s, i) => (
            <div key={i} className="glass stat-card">
              <div className="stat-number">{s.number}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="dashboard-layout">
          <div>
            {/* UPLOAD PANEL */}
            {token && (
              <div className="glass upload-panel">
                <h3>📤 Upload a Note</h3>
                <div className="upload-fields">
                  <div className="field-group">
                    <label className="field-label">Title</label>
                    <input
                      className="field-input"
                      placeholder="e.g. OS Process Management"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Subject</label>
                    <select
                      className="field-input field-select"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                    >
                      {["OS","DBMS","CN","Math","Other"].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    <label className="field-label">File</label>
                    <div className="file-drop" onClick={() => fileInputRef.current?.click()}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={e => setFile(e.target.files[0])}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                      />
                      {file ? (
                        <div className="file-selected">✓ {file.name}</div>
                      ) : (
                        <span>📎 Choose file</span>
                      )}
                    </div>
                  </div>
                </div>

                {uploading && (
                  <div className="upload-progress">
                    <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}

                <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleUpload}
                    disabled={uploading}
                  >
                    {uploading
                      ? <><div className="spinner" /> Uploading {uploadProgress}%</>
                      : "Upload Note"
                    }
                  </button>
                  {file && (
                    <button className="btn btn-secondary" onClick={() => setFile(null)}>
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TOOLBAR */}
            <div className="toolbar">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input
                  className="search-input"
                  placeholder="Search notes by title..."
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="filter-select"
                onChange={e => setSubjectFilter(e.target.value)}
              >
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {token && (
                <div className="tab-group">
                  <button className={`tab-btn ${view === "all" ? "active" : ""}`} onClick={() => setView("all")}>
                    All Notes
                  </button>
                  <button className={`tab-btn ${view === "my" ? "active" : ""}`} onClick={() => setView("my")}>
                    My Notes
                  </button>
                </div>
              )}
            </div>

            {/* NOTES GRID */}
            <div className="notes-grid">
              {filteredNotes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <h3>No notes found</h3>
                  <p>Try a different search or be the first to upload!</p>
                </div>
              ) : (
                filteredNotes.map((note, i) => (
                  <div
                    key={note._id}
                    className="glass glass-hover note-card"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className={`note-subject-tag ${getSubjectClass(note.subject)}`}>
                      {note.subject || "General"}
                    </div>
                    <div className="note-title">{note.title}</div>
                    <div className="note-meta">
                      By {note.user?.name || "Anonymous"} · {new Date(note.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </div>
                    <div className="note-actions">
                      <button
                        className={`like-btn ${note.likes?.includes(currentUserId) ? "liked" : ""}`}
                        onClick={() => handleLike(note._id)}
                      >
                        {note.likes?.includes(currentUserId) ? "★" : "☆"} {note.likes?.length || 0}
                      </button>
                      <a
                        className="download-btn"
                        href={`http://localhost:5000/uploads/${note.file}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        ↓ Download
                      </a>
                      {(note.user?._id === currentUserId || userRole === "teacher") && (
                        <button
                          className="btn btn-danger"
                          style={{ padding: "6px 12px", fontSize: 13 }}
                          onClick={() => handleDelete(note._id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          

          {/* SIDEBAR */}
          <div>
            <div className="glass sidebar-card leaderboard">
              <div className="leaderboard-title">🏆 Top Contributors</div>
              {leaderboard.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No contributors yet. Upload to rank up!</p>
              ) : (
                (Array.isArray(leaderboard) ? leaderboard : []).slice(0, 8).map((user, i) => (
                  <div key={user._id} className="leaderboard-row">
                    <div className={`leaderboard-rank ${rankColors[i] || ""}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
                    </div>
                    <div className="avatar" style={{ width: 26, height: 26, fontSize: 11 }}>
                      {getInitials(user.name)}
                    </div>
                    <div className="leaderboard-name">{user.name}</div>
                    <div className="leaderboard-pts">⭐ {user.points}</div>
                  </div>
                ))
              )}
            </div>

            <div className="glass sidebar-card" style={{ marginTop: 20 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, marginBottom: 12 }}>
                📊 Subjects
              </div>
              {["OS","DBMS","CN","Math","Other"].map(s => {
                const cnt = notes.filter(n => n.subject === s).length;
                return (
                  <div key={s} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span>{s}</span>
                      <span style={{ color: "var(--text-muted)" }}>{cnt} notes</span>
                    </div>
                    <div style={{ height: 4, background: "var(--border)", borderRadius: 2 }}>
                      <div style={{
                        height: "100%",
                        width: notes.length ? `${(cnt / notes.length) * 100}%` : "0%",
                        background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                        borderRadius: 2,
                        transition: "width 1s ease"
                      }} />
                    </div>
                  </div>
               );
              })}
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
      <Chatbot />
      
    </div>
  );
}