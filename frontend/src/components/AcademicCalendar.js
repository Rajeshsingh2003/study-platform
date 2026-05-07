import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";



const EVENT_TYPES = {
  exam: { color: "#ef4444", icon: "📝", label: "Exam" },
  holiday: { color: "#10b981", icon: "🏖️", label: "Holiday" },
  assignment: { color: "#f59e0b", icon: "📋", label: "Assignment" },
  event: { color: "#6366f1", icon: "🎉", label: "Event" },
  deadline: { color: "#ec4899", icon: "⏰", label: "Deadline" },
  lecture: { color: "#0891b2", icon: "🎓", label: "Lecture" }
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AcademicCalendar() {
  const token = localStorage.getItem("token");
  let userRole = "student";
  if (token) { try { userRole = jwtDecode(token).role; } catch {} }

  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [view, setView] = useState("upcoming"); // upcoming | calendar | add
  const [form, setForm] = useState({ title: "", date: "", type: "exam", description: "" });
  const [adding, setAdding] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const dropRef = useRef(null);

  const fetchEvents = useCallback(async () => {
  try {
    const res = await axios.get("/api/calendar", {
      headers: { Authorization: `Bearer ${token}` }
    });
    setEvents(res.data || []);
  } catch {}
}, [token]);

useEffect(() => {
  if (open) fetchEvents();
}, [open, fetchEvents]);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  

  const handleAdd = async () => {
    if (!form.title || !form.date) return;
    setAdding(true);
    try {
      await axios.post("/api/calendar", form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setForm({ title: "", date: "", type: "exam", description: "" });
      setView("upcoming");
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.msg || "Failed");
    }
    setAdding(false);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/calendar/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEvents();
    } catch {}
  };

  const today = new Date();
  const upcoming = events
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 8);

  // Calendar grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const getEventsForDay = (day) => {
    return events.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && d.getDate() === day;
    });
  };

  // Upcoming count badge
  const upcomingCount = events.filter(e => {
    const diff = (new Date(e.date) - today) / 86400000;
    return diff >= 0 && diff <= 7;
  }).length;

  return (
    <div style={{ position: "relative" }} ref={dropRef}>
      <style>{`
        @keyframes dropIn { from { opacity:0;transform:translateY(-8px) scale(0.97); } to { opacity:1;transform:translateY(0) scale(1); } }
        .cal-tab { background:none; border:none; cursor:pointer; padding:7px 14px; border-radius:8px; font-size:13px; font-weight:600; font-family:inherit; transition:all 0.15s; }
        .cal-tab.active { background:rgba(99,102,241,0.2); color:#a5b4fc; }
        .cal-tab:not(.active) { color:#4a5068; }
        .cal-tab:not(.active):hover { color:#94a3b8; background:rgba(255,255,255,0.05); }
        .cal-input { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09); border-radius:9px; padding:9px 12px; color:#e2e8f0; font-size:13px; font-family:inherit; outline:none; width:100%; transition:border-color 0.2s; }
        .cal-input:focus { border-color:rgba(99,102,241,0.5); }
        .cal-input::placeholder { color:#3a3a55; }
        .cal-day { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:6px; font-size:12px; cursor:default; position:relative; }
        .cal-day.today { background:rgba(99,102,241,0.25); color:#a5b4fc; font-weight:700; }
        .cal-day.has-event::after { content:''; position:absolute; bottom:2px; left:50%; transform:translateX(-50%); width:4px; height:4px; border-radius:50%; background:#6366f1; }
      `}</style>

      {/* Trigger button */}
      <button
        onClick={() => setOpen(s => !s)}
        style={{
          background: open ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${open ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.1)"}`,
          color: open ? "#a5b4fc" : "#94a3b8",
          padding: "7px 14px", borderRadius: 9, cursor: "pointer",
          font: "600 13px 'DM Sans', sans-serif",
          display: "flex", alignItems: "center", gap: 7,
          transition: "all 0.2s", position: "relative"
        }}
      >
        📅 Calendar
        {upcomingCount > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "white", fontSize: 10, fontWeight: 700, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {upcomingCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0, width: 340,
          background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
          zIndex: 9999, overflow: "hidden", animation: "dropIn 0.25s ease"
        }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, padding: "12px 12px 0", background: "rgba(0,0,0,0.2)" }}>
            {["upcoming", "calendar", ...(userRole === "teacher" ? ["add"] : [])].map(t => (
              <button key={t} className={`cal-tab ${view === t ? "active" : ""}`} onClick={() => setView(t)}>
                {t === "upcoming" ? "📅 Upcoming" : t === "calendar" ? "🗓 Calendar" : "➕ Add"}
              </button>
            ))}
          </div>

          <div style={{ padding: "14px 16px", maxHeight: 400, overflowY: "auto" }}>
            {/* UPCOMING EVENTS */}
            {view === "upcoming" && (
              <div>
                {upcoming.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 0", color: "#4a5068" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                    <div style={{ fontSize: 14 }}>No upcoming events!</div>
                  </div>
                ) : (
                  upcoming.map(ev => {
                    const t = EVENT_TYPES[ev.type] || EVENT_TYPES.event;
                    const d = new Date(ev.date);
                    const diff = Math.ceil((d - today) / 86400000);
                    return (
                      <div key={ev._id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${t.color}18`, border: `1px solid ${t.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                          {t.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#e2e8f0", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ev.title}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                            <span style={{ color: t.color, fontWeight: 600 }}>{t.label}</span>
                            <span style={{ color: "#4a5068" }}>{d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                            <span style={{ color: diff <= 3 ? "#ef4444" : diff <= 7 ? "#f59e0b" : "#4a5068", fontWeight: 600 }}>
                              {diff === 0 ? "Today!" : diff === 1 ? "Tomorrow" : `${diff}d`}
                            </span>
                          </div>
                        </div>
                        {userRole === "teacher" && (
                          <button onClick={() => handleDelete(ev._id)} style={{ background: "none", border: "none", color: "#3a3a55", cursor: "pointer", fontSize: 14, padding: "2px 4px", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = "#ef4444"} onMouseLeave={e => e.target.style.color = "#3a3a55"}>
                            🗑
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* CALENDAR VIEW */}
            {view === "calendar" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); }} style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 18 }}>‹</button>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{MONTHS[currentMonth]} {currentYear}</div>
                  <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); }} style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 18 }}>›</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                    <div key={d} style={{ fontSize: 10, fontWeight: 700, color: "#3a3a55", padding: "4px 0" }}>{d}</div>
                  ))}
                  {calendarDays.map((day, i) => {
                    const isToday = day && new Date().getDate() === day && new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear;
                    const dayEvents = day ? getEventsForDay(day) : [];
                    return (
                      <div
                        key={i}
                        className={`cal-day ${isToday ? "today" : ""} ${dayEvents.length ? "has-event" : ""}`}
                        title={dayEvents.map(e => e.title).join(", ")}
                        style={{ color: day ? (isToday ? "#a5b4fc" : "#94a3b8") : "transparent" }}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {Object.entries(EVENT_TYPES).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#4a5068" }}>
                      <span>{v.icon}</span>{v.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ADD EVENT (teacher only) */}
            {view === "add" && userRole === "teacher" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#4a5068", display: "block", marginBottom: 5, fontWeight: 600 }}>EVENT TITLE</label>
                  <input className="cal-input" placeholder="e.g. Mid-Term Exam" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#4a5068", display: "block", marginBottom: 5, fontWeight: 600 }}>DATE</label>
                    <input className="cal-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#4a5068", display: "block", marginBottom: 5, fontWeight: 600 }}>TYPE</label>
                    <select className="cal-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      {Object.entries(EVENT_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v.icon} {v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#4a5068", display: "block", marginBottom: 5, fontWeight: 600 }}>DESCRIPTION (OPTIONAL)</label>
                  <input className="cal-input" placeholder="Details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <button
                  onClick={handleAdd}
                  disabled={adding || !form.title || !form.date}
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "11px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (!form.title || !form.date) ? 0.5 : 1 }}
                >
                  {adding ? "Adding..." : "Add Event ✓"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}