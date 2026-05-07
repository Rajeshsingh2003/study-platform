import { useState, useEffect, useRef, useCallback  } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const SUBJECTS = ["All", "OS", "DBMS", "CN", "Math", "Physics", "Chemistry", "English", "Other"];

function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function StarRating({ avg, count, onRate, userRating }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span
          key={s}
          onClick={() => onRate && onRate(s)}
          style={{ cursor: onRate ? "pointer" : "default", fontSize: 14, color: s <= Math.round(userRating || avg) ? "#f59e0b" : "#2a2a3a", transition: "color 0.15s" }}
        >
          ★
        </span>
      ))}
      <span style={{ fontSize: 12, color: "#4a5068" }}>{avg ? `${avg} (${count})` : "No ratings"}</span>
    </div>
  );
}

export default function Books() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  let currentUserId = null, userName = "User", userRole = "student";
  if (token) {
    try { const d = jwtDecode(token); currentUserId = d.id; userName = d.name; userRole = d.role; } catch {}
  }

  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", subject: "Other", description: "" });
  const [file, setFile] = useState(null);
  const [userRatings, setUserRatings] = useState({});
  const [toast, setToast] = useState("");
  const fileRef = useRef(null);

  const fetchBooks = useCallback(async () => {
  try {
    const res = await axios.get("/api/books", {
      headers: { Authorization: `Bearer ${token}` }
    });

    setBooks(res.data || []);
  } catch {}
}, [token]);

useEffect(() => {
  if (!token) {
    navigate("/login");
    return;
  }

  fetchBooks();
}, [fetchBooks, navigate, token]);

  

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleUpload = async () => {
    if (!file || !form.title.trim()) { showToastMsg("Please fill title and select a PDF"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      await axios.post("/api/books/upload", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToastMsg("📚 Book uploaded successfully! +15 points");
      setFile(null); setForm({ title: "", author: "", subject: "Other", description: "" });
      setShowUpload(false);
      fetchBooks();
    } catch (err) {
      showToastMsg(err.response?.data?.msg || "Upload failed");
    }
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this book?")) return;
    try {
      await axios.delete(`/api/books/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToastMsg("Book deleted");
      fetchBooks();
    } catch { showToastMsg("Delete failed"); }
  };

  const handleRate = async (bookId, rating) => {
    try {
      const res = await axios.post(`/api/books/${bookId}/rate`, { rating }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserRatings(prev => ({ ...prev, [bookId]: rating }));
      setBooks(prev => prev.map(b => b._id === bookId ? { ...b, avgRating: res.data.avg, ratingCount: res.data.count } : b));
    } catch {}
  };

  const filtered = books.filter(b => {
    const ms = b.title?.toLowerCase().includes(search.toLowerCase()) || b.author?.toLowerCase().includes(search.toLowerCase());
    const mf = subjectFilter === "All" || b.subject === subjectFilter;
    return ms && mf;
  });

  const subjectColors = { OS: "#6366f1", DBMS: "#8b5cf6", CN: "#0891b2", Math: "#10b981", Physics: "#f59e0b", Chemistry: "#ef4444", English: "#ec4899", Other: "#64748b" };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #070712 0%, #0d0d1f 50%, #070712 100%)", fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 4px; }
        @keyframes fadeUp { from { opacity:0;transform:translateY(14px); } to { opacity:1;transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0;transform:translateY(-12px); } to { opacity:1;transform:translateY(0); } }
        .book-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 22px; transition: all 0.25s; animation: fadeUp 0.35s ease both; cursor: default; }
        .book-card:hover { border-color: rgba(99,102,241,0.3); transform: translateY(-3px); box-shadow: 0 12px 40px rgba(99,102,241,0.12); }
        .field-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; padding: 10px 14px; color: #e2e8f0; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.2s; width: 100%; }
        .field-input:focus { border-color: rgba(99,102,241,0.5); }
        .field-input::placeholder { color: #3a3a55; }
        .btn-primary { background: linear-gradient(135deg,#6366f1,#8b5cf6); border: none; color: white; padding: 11px 24px; border-radius: 10px; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s; }
        .btn-primary:hover:not(:disabled) { transform: scale(1.03); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-sec { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; padding: 11px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.2s; }
        .btn-sec:hover { background: rgba(255,255,255,0.1); }
        .read-btn { display: inline-flex; align-items: center; gap: 6px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.25); color: #a5b4fc; padding: 7px 14px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; transition: all 0.2s; }
        .read-btn:hover { background: rgba(99,102,241,0.25); }
        .filter-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); color: #4a5068; padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .filter-btn.active { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.3); color: #a5b4fc; }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(7,7,18,0.9)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#4a5068", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            ← Hub
          </button>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, background: "linear-gradient(135deg,#6366f1,#a5b4fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            📚 StudyVault Library
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-primary" onClick={() => setShowUpload(s => !s)}>
            {showUpload ? "✕ Cancel" : "+ Upload Book"}
          </button>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white" }}>
            {getInitials(userName)}
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* HERO */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 42, fontWeight: 800, margin: 0, background: "linear-gradient(135deg,#e2e8f0,#6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Digital Library
          </h1>
          <p style={{ color: "#4a5068", fontSize: 16, marginTop: 10 }}>
            {books.length} books available · Read, download & rate
          </p>
        </div>

        {/* UPLOAD PANEL */}
        {showUpload && (
          <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 18, padding: 28, marginBottom: 32, animation: "slideIn 0.3s ease" }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 20, color: "#a5b4fc" }}>📤 Upload a Book</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6, fontWeight: 600 }}>Title *</label>
                <input className="field-input" placeholder="Book title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6, fontWeight: 600 }}>Author</label>
                <input className="field-input" placeholder="Author name" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6, fontWeight: 600 }}>Subject</label>
                <select className="field-input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                  {SUBJECTS.filter(s => s !== "All").map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6, fontWeight: 600 }}>Description</label>
                <input className="field-input" placeholder="Brief description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6, fontWeight: 600 }}>PDF File *</label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border: "2px dashed rgba(99,102,241,0.3)", borderRadius: 12, padding: "24px", textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}
              >
                <input ref={fileRef} type="file" style={{ display: "none" }} accept=".pdf,.epub,.djvu" onChange={e => setFile(e.target.files[0])} />
                {file ? (
                  <div style={{ color: "#10b981", fontWeight: 600 }}>✓ {file.name}</div>
                ) : (
                  <div style={{ color: "#4a5068" }}>📄 Click to select PDF / EPUB</div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button className="btn-primary" onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload Book 📚"}
              </button>
              <button className="btn-sec" onClick={() => setShowUpload(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* FILTERS */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <input
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 14px 9px 36px", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%" }}
              placeholder="Search by title or author..."
              onChange={e => setSearch(e.target.value)}
            />
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#4a5068" }}>🔍</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SUBJECTS.map(s => (
              <button key={s} className={`filter-btn ${subjectFilter === s ? "active" : ""}`} onClick={() => setSubjectFilter(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* STATS ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32 }}>
          {[
            { n: books.length, label: "Total Books", icon: "📚" },
            { n: [...new Set(books.map(b => b.subject))].length, label: "Subjects", icon: "🏷️" },
            { n: [...new Set(books.map(b => b.uploadedBy?._id))].length, label: "Contributors", icon: "👥" },
            { n: books.filter(b => b.uploadedBy?._id === currentUserId).length, label: "My Uploads", icon: "⬆️" }
          ].map((s, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 20px", animation: "fadeUp 0.3s ease both", animationDelay: `${i * 0.06}s` }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: "#e2e8f0" }}>{s.n}</div>
              <div style={{ fontSize: 12, color: "#4a5068", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* BOOKS GRID */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#4a5068" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 18, color: "#64748b" }}>No books found</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Be the first to upload one!</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
            {filtered.map((book, i) => {
              const avg = book.ratings?.length
                ? (book.ratings.reduce((a, r) => a + r.value, 0) / book.ratings.length).toFixed(1)
                : null;
              const myRating = userRatings[book._id] || book.ratings?.find(r => r.user === currentUserId)?.value;
              const isOwner = book.uploadedBy?._id === currentUserId;
              const color = subjectColors[book.subject] || "#64748b";
              return (
                <div key={book._id} className="book-card" style={{ animationDelay: `${i * 0.05}s` }}>
                  {/* Cover area */}
                  <div style={{ height: 100, borderRadius: 12, background: `linear-gradient(135deg, ${color}22, ${color}11)`, border: `1px solid ${color}33`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", right: -10, top: -10, width: 80, height: 80, borderRadius: "50%", background: `${color}15` }} />
                    <div style={{ fontSize: 40 }}>📖</div>
                    <div style={{ position: "absolute", top: 10, right: 12 }}>
                      <span style={{ background: `${color}30`, color, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, border: `1px solid ${color}40` }}>
                        {book.subject}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 4, lineHeight: 1.3 }}>
                    {book.title}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>
                    by {book.author || "Unknown"} · {book.uploadedBy?.name || "Anonymous"}
                  </div>
                  {book.description && (
                    <div style={{ fontSize: 12, color: "#4a5068", marginBottom: 10, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {book.description}
                    </div>
                  )}

                  <div style={{ marginBottom: 12 }}>
                    <StarRating avg={avg} count={book.ratings?.length || 0} onRate={(r) => handleRate(book._id, r)} userRating={myRating} />
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <a
                      className="read-btn"
                      href={`http://localhost:5000/uploads/${book.file}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📖 Read / Download
                    </a>
                    {(isOwner || userRole === "teacher") && (
                      <button
                        onClick={() => handleDelete(book._id)}
                        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600, transition: "all 0.2s" }}
                      >
                        🗑 Delete
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#2a2a3a", marginTop: 10 }}>
                    Uploaded {new Date(book.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "rgba(10,10,22,0.95)", border: "1px solid rgba(99,102,241,0.4)", color: "#e2e8f0", padding: "14px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 9999, animation: "fadeUp 0.3s ease", backdropFilter: "blur(10px)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}