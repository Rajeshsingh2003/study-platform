import { useState, useEffect,useCallback} from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function Groups() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  let userName = "User", userRole = "student",  userSem = "";
  if (token) {
    try {
      const d = jwtDecode(token);
      userName = d.name;
      userRole = d.role;
      userSem = d.semester;
    } catch {}
  }

  const [groups, setGroups] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSem, setNewGroupSem] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("groups"); // groups | requests
  const [creating, setCreating] = useState(false);

  

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/groups/all", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(res.data.groups || []);
    } catch {}
    setLoading(false);
  }, [token]);

  const fetchPendingRequests = useCallback(async () => {
    try {
      const res = await axios.get("/api/groups/pending-requests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingRequests(res.data || []);
    } catch {}
  }, [token]);

  useEffect(() => {
  fetchGroups();

  if (userRole === "teacher") {
    fetchPendingRequests();
  }
}, [userRole, fetchGroups, fetchPendingRequests]);

  const createGroup = async () => {
    if (!newGroupName.trim() || !newGroupSem.trim()) {
      alert("Enter group name and semester");
      return;
    }
    setCreating(true);
    try {
      await axios.post(
        "/api/groups",
        { name: newGroupName, semester: newGroupSem },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewGroupName(""); setNewGroupSem("");
      fetchGroups();
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to create group");
    }
    setCreating(false);
  };

  const handleApprove = async (groupId, requestUserId) => {
    try {
      await axios.post(
        `/api/groups/${groupId}/approve/${requestUserId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPendingRequests();
      fetchGroups();
    } catch {}
  };

  const handleReject = async (groupId, requestUserId) => {
    try {
      await axios.post(
        `/api/groups/${groupId}/reject/${requestUserId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPendingRequests();
    } catch {}
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("Delete this group and all its messages?")) return;
    try {
      await axios.delete(`/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGroups();
    } catch {}
  };

  return (
    <div style={{ minHeight: "100vh", background: "#08080f", fontFamily: "'Inter', sans-serif", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 4px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 15px rgba(99,102,241,0.3); } 50% { box-shadow: 0 0 30px rgba(99,102,241,0.6); } }
        .group-card { animation: fadeUp 0.3s ease both; transition: all 0.2s; border: 1px solid rgba(255,255,255,0.06); }
        .group-card:hover { border-color: rgba(99,102,241,0.3); transform: translateY(-2px); }
        .tab-btn { background: none; border: none; cursor: pointer; padding: 10px 22px; border-radius: 8px; font-size: 14px; font-weight: 600; font-family: inherit; transition: all 0.18s; }
        .tab-btn.active { background: rgba(99,102,241,0.2); color: #a5b4fc; }
        .tab-btn:not(.active) { color: #4a5068; }
        .tab-btn:not(.active):hover { color: #94a3b8; background: rgba(255,255,255,0.05); }
        .input-field { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 11px 14px; color: #e2e8f0; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.2s; width: 100%; }
        .input-field:focus { border-color: rgba(99,102,241,0.5); }
        .input-field::placeholder { color: #3a3a55; }
        .approve-btn { background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #10b981; padding: 7px 16px; border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; transition: all 0.2s; }
        .approve-btn:hover { background: rgba(16,185,129,0.25); transform: scale(1.02); }
        .reject-btn { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #ef4444; padding: 7px 16px; border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; transition: all 0.2s; }
        .reject-btn:hover { background: rgba(239,68,68,0.22); }
        .create-btn { background: linear-gradient(135deg,#6366f1,#8b5cf6); border: none; color: white; padding: 11px 24px; border-radius: 10px; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .create-btn:hover:not(:disabled) { transform: scale(1.03); box-shadow: 0 4px 20px rgba(99,102,241,0.5); }
        .create-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .enter-btn { background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.25); color: #a5b4fc; padding: 7px 14px; border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; transition: all 0.2s; }
        .enter-btn:hover { background: rgba(99,102,241,0.25); }
        .delete-btn { background: none; border: none; color: #4a5068; cursor: pointer; font-size: 16px; padding: 4px; transition: color 0.2s; }
        .delete-btn:hover { color: #ef4444; }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(8,8,15,0.9)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#4a5068", cursor: "pointer", fontSize: 13, padding: "6px 12px", borderRadius: 7, transition: "all 0.2s", fontFamily: "inherit" }}>
            ← Hub
          </button>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 800, background: "linear-gradient(135deg,#6366f1,#a5b4fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ✦ StudyVault Groups
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white" }}>
            {getInitials(userName)}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#c7d2fe" }}>{userName}</div>
            <div style={{ fontSize: 11, color: "#4a5068" }}>{userRole} · Sem {userSem}</div>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "36px 24px" }}>

        {/* HEADER */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 8, background: "linear-gradient(135deg,#e2e8f0,#94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Semester Groups
          </h1>
          <p style={{ color: "#4a5068", fontSize: 15 }}>
            {userRole === "teacher" ? "Manage groups, approve student requests, and oversee discussions." : "Join your semester group to collaborate with classmates."}
          </p>
        </div>

        {/* TEACHER: CREATE GROUP */}
        {userRole === "teacher" && (
          <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 16, padding: "24px 28px", marginBottom: 28 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#a5b4fc" }}>
              ➕ Create New Group
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <input
                className="input-field"
                placeholder="Group name (e.g. CSE-A Sem 5)"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                style={{ flex: 2, minWidth: 200 }}
              />
              <input
                className="input-field"
                placeholder="Semester (e.g. 5)"
                value={newGroupSem}
                onChange={e => setNewGroupSem(e.target.value)}
                style={{ flex: 1, minWidth: 120 }}
                type="number"
                min="1" max="8"
              />
              <button className="create-btn" onClick={createGroup} disabled={creating}>
                {creating ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        )}

        {/* TABS (teacher only) */}
        {userRole === "teacher" && (
          <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4, width: "fit-content" }}>
            <button className={`tab-btn ${activeTab === "groups" ? "active" : ""}`} onClick={() => setActiveTab("groups")}>
              📚 All Groups
            </button>
            <button className={`tab-btn ${activeTab === "requests" ? "active" : ""}`} onClick={() => setActiveTab("requests")}>
              📬 Requests
              {pendingRequests.length > 0 && (
                <span style={{ marginLeft: 8, background: "#ef4444", color: "white", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>
                  {pendingRequests.reduce((a, g) => a + g.pendingRequests.length, 0)}
                </span>
              )}
            </button>
          </div>
        )}

        {/* REQUESTS TAB (teacher) */}
        {userRole === "teacher" && activeTab === "requests" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pendingRequests.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#4a5068" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 16, color: "#64748b" }}>No pending requests</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>All caught up!</div>
              </div>
            ) : (
              pendingRequests.map(group =>
                group.pendingRequests.map(req => (
                  <div
                    key={`${group._id}-${req._id}`}
                    className="group-card"
                    style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16 }}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#0f766e,#0891b2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0 }}>
                      {getInitials(req.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: "#e2e8f0" }}>{req.name}</div>
                      <div style={{ fontSize: 12, color: "#4a5068" }}>
                        {req.email} · Sem {req.semester} · Wants to join <span style={{ color: "#a5b4fc" }}>{group.name}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="approve-btn" onClick={() => handleApprove(group._id, req._id)}>✓ Approve</button>
                      <button className="reject-btn" onClick={() => handleReject(group._id, req._id)}>✕ Reject</button>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        )}

        {/* GROUPS TAB */}
        {(userRole !== "teacher" || activeTab === "groups") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px", color: "#4a5068" }}>
                <div style={{ fontSize: 32, marginBottom: 12, animation: "pulse 1.5s infinite" }}>⏳</div>
                Loading groups...
              </div>
            ) : groups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px", color: "#4a5068" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 16 }}>No groups created yet</div>
                {userRole === "teacher" && <div style={{ fontSize: 13, marginTop: 6 }}>Create the first group above!</div>}
              </div>
            ) : (
              groups.map((g, i) => {
                const memberStatus = g.memberStatus; // 'approved' | 'pending' | 'rejected' | null
                const isMember = memberStatus === "approved";
                return (
                  <div
                    key={g._id}
                    className="group-card"
                    style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, animationDelay: `${i * 0.06}s` }}
                  >
                    {/* Semester badge */}
                    <div style={{
                      width: 50, height: 50, borderRadius: 12, flexShrink: 0,
                      background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))",
                      border: "2px solid rgba(99,102,241,0.3)",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
                    }}>
                      <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 700, letterSpacing: "0.05em" }}>SEM</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#a5b4fc", fontFamily: "'Space Grotesk', sans-serif" }}>{g.semester}</div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#e2e8f0", marginBottom: 4 }}>
                        {g.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#4a5068", display: "flex", gap: 12 }}>
                        <span>👥 {g.memberCount || 0} members</span>
                        <span>💬 {g.messageCount || 0} messages</span>
                      </div>
                    </div>

                    {/* Status / action */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {userRole === "teacher" ? (
                        <>
                          <button className="enter-btn" onClick={() => navigate(`/chat/${g._id}`)}>
                            Open Chat →
                          </button>
                          <button className="delete-btn" onClick={() => handleDeleteGroup(g._id)} title="Delete group">🗑</button>
                        </>
                      ) : isMember ? (
                        <button className="enter-btn" onClick={() => navigate(`/chat/${g._id}`)}>
                          💬 Enter Chat →
                        </button>
                      ) : memberStatus === "pending" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f59e0b", fontSize: 13, fontWeight: 600 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                          Pending Approval
                        </div>
                      ) : memberStatus === "rejected" ? (
                        <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600 }}>✕ Rejected</div>
                      ) : (
                        <button
                          className="create-btn"
                          style={{ padding: "8px 18px", fontSize: 13 }}
                          onClick={async () => {
                            try {
                              await axios.post(`/api/groups/${g._id}/join`, {}, { headers: { Authorization: `Bearer ${token}` } });
                              fetchGroups();
                            } catch (err) { alert(err.response?.data?.msg || "Failed"); }
                          }}
                        >
                          Request to Join
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}