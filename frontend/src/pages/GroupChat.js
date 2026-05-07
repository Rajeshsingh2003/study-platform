import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Single persistent socket — created ONCE, never inside component body
const socket = io("", { autoConnect: true });

const CHANNELS = [
  { id: "general", icon: "💬", label: "general" },
  { id: "notes", icon: "📝", label: "notes" },
  { id: "doubt", icon: "❓", label: "doubts" },
  { id: "resources", icon: "📚", label: "resources" },
  { id: "announcement", icon: "📢", label: "announcements" },
];

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const diff = Math.floor((today - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function FileMessage({ fileUrl, fileName, fileType }) {
  if (fileType === "image") {
    return (
      <div style={{ marginTop: 6 }}>
        <img
          src={fileUrl}
          alt={fileName}
          style={{ maxWidth: 260, maxHeight: 200, borderRadius: 10, display: "block", cursor: "pointer" }}
          onClick={() => window.open(fileUrl, "_blank")}
          onError={e => { e.target.style.display = "none"; }}
        />
        <div style={{ fontSize: 11, color: "#6366f1", marginTop: 4 }}>📷 {fileName}</div>
      </div>
    );
  }
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, marginTop: 6,
        background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
        borderRadius: 8, padding: "8px 12px", color: "#a5b4fc", textDecoration: "none",
        fontSize: 13, fontWeight: 600, transition: "all 0.2s"
      }}
    >
      📎 {fileName || "Download file"}
    </a>
  );
}

export default function GroupChat() {
  const navigate = useNavigate();


  const token = localStorage.getItem("token");
  let userName = "User", userRole = "student", userId = "", userSem = "";
  if (token) {
    try {
      const d = jwtDecode(token);
      userName = d.name; userRole = d.role; userId = d.id; userSem = d.semester;
    } catch {}
  }

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState("general");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [onlineCount, setOnlineCount] = useState(1);
  const [joinStatus, setJoinStatus] = useState(null);
  const [membershipMap, setMembershipMap] = useState({});
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);
  const currentRoomRef = useRef(null);

  // ── Socket listeners – set up once ──────────────────────────────────────
  useEffect(() => {
    const onReceive = (msg) => {
      setMessages(prev => {
        if (prev.some(m => m._id && m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    const onTyping = ({ name }) => {
      if (name === userName) return;
      setTypingUsers(prev => prev.includes(name) ? prev : [...prev, name]);
      setTimeout(() => setTypingUsers(prev => prev.filter(u => u !== name)), 3000);
    };

    const onOnline = (count) => setOnlineCount(count);

    const onMsgDeleted = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    };

    socket.on("receiveMessage", onReceive);
    socket.on("userTyping", onTyping);
    socket.on("onlineCount", onOnline);
    socket.on("messageDeleted", onMsgDeleted);

    return () => {
      socket.off("receiveMessage", onReceive);
      socket.off("userTyping", onTyping);
      socket.off("onlineCount", onOnline);
      socket.off("messageDeleted", onMsgDeleted);
    };
  }, [userName]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Fetch groups on mount ────────────────────────────────────────────────
  

  useEffect(() => {
    if (groups.length && !selectedGroup) {
      const first = groups.find(g => membershipMap[g._id] === "approved") || groups[0];
      if (first) setSelectedGroup(first);
    }
  }, [groups, membershipMap]);

  // ── Join room & fetch messages when group/channel changes ────────────────
  

  const fetchMessages = useCallback(async () => {
    if (!selectedGroup) return;
    try {
      const res = await axios.get(
        `/api/groups/${selectedGroup._id}/messages?channel=${selectedChannel}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(res.data || []);
    } catch {}
  }, [selectedGroup, selectedChannel, token]);

  const fetchMembers = useCallback(async () => {
    if (!selectedGroup) return;
    try {
      const res = await axios.get(
        `/api/groups/${selectedGroup._id}/members`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMembers(res.data || []);
    } catch {}
  }, [selectedGroup, token]);

  useEffect(() => {
    if (!selectedGroup) return;
    const status = membershipMap[selectedGroup._id] || null;
    setJoinStatus(status);
    if (status === "approved") {
      const roomId = `${selectedGroup._id}-${selectedChannel}`;
      if (currentRoomRef.current !== roomId) {
        socket.emit("joinGroup", roomId);
        currentRoomRef.current = roomId;
      }
      fetchMessages();
      fetchMembers();
    }
  }, [selectedGroup, selectedChannel, membershipMap, fetchMessages, fetchMembers]);

  const fetchGroups = useCallback(async () => {

    try {
      const res = await axios.get("/api/groups/all", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(res.data.groups || []);
      setMembershipMap(res.data.membershipMap || {});
    } catch {}
  }, [token]);

  useEffect(() => {
  fetchGroups();
}, [fetchGroups]);

  const handleJoinRequest = async (gId) => {
    try {
      await axios.post(`/api/groups/${gId}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembershipMap(prev => ({ ...prev, [gId]: "pending" }));
      setJoinStatus("pending");
    } catch (err) {
      alert(err.response?.data?.msg || "Request failed");
    }
  };

  const sendMessage = useCallback(() => {
    if (!message.trim() || !selectedGroup) return;
    socket.emit("sendMessage", {
      groupId: selectedGroup._id,
      channelId: selectedChannel,
      text: message,
      sender: userName,
      senderId: userId,
    });
    setMessage("");
  }, [message, selectedGroup, selectedChannel, userName, userId]);

  const handleFileUpload = async (file) => {
    if (!file || !selectedGroup) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post("/api/upload-chat-file", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      socket.emit("sendMessage", {
        groupId: selectedGroup._id,
        channelId: selectedChannel,
        text: "",
        sender: userName,
        senderId: userId,
        fileUrl: res.data.url,
        fileName: res.data.filename,
        fileType: res.data.type
      });
    } catch (err) {
      alert("File upload failed");
    }
    setUploadingFile(false);
  };

  const handleDeleteMessage = (msgId) => {
    if (!window.confirm("Delete this message?")) return;
    socket.emit("deleteMessage", {
      messageId: msgId,
      groupId: selectedGroup._id,
      channelId: selectedChannel,
      userRole
    });
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (!selectedGroup) return;
    socket.emit("typing", { groupId: selectedGroup._id, channelId: selectedChannel, name: userName });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {}, 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const currentChannelInfo = CHANNELS.find(c => c.id === selectedChannel);

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  messages.forEach((msg, idx) => {
    const dateStr = formatDate(msg.createdAt);
    if (dateStr !== lastDate) { grouped.push({ type: "divider", label: dateStr }); lastDate = dateStr; }
    grouped.push({ type: "msg", item: msg, idx });
  });

  return (
    <div style={{ display: "flex", height: "100vh", background: "#07070f", fontFamily: "'DM Sans', 'Inter', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 3px; }
        @keyframes fadeUp { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:translateY(0); } }
        @keyframes blink { 0%,100%{opacity:0.3} 50%{opacity:1} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        .group-item { cursor: pointer; padding: 10px 12px; border-radius: 10px; transition: all 0.15s; border: 1px solid transparent; margin-bottom: 4px; }
        .group-item:hover { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.15); }
        .group-item.active { background: rgba(99,102,241,0.18); border-color: rgba(99,102,241,0.35); }
        .channel-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; cursor: pointer; transition: all 0.15s; color: #4a5068; font-size: 13px; font-weight: 500; }
        .channel-item:hover { background: rgba(255,255,255,0.05); color: #94a3b8; }
        .channel-item.active { background: rgba(99,102,241,0.15); color: #a5b4fc; }
        .msg-input { flex: 1; background: none; border: none; color: #e2e8f0; font-size: 14px; font-family: inherit; outline: none; resize: none; line-height: 1.5; }
        .msg-input::placeholder { color: #3a3a55; }
        .send-btn:hover { transform: scale(1.05); }
        .join-btn { background: linear-gradient(135deg,#6366f1,#8b5cf6); border: none; color: white; padding: 12px 28px; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .join-btn:hover { transform: scale(1.03); box-shadow: 0 8px 24px rgba(99,102,241,0.45); }
        .attach-btn { background: none; border: none; color: #4a5068; cursor: pointer; font-size: 18px; padding: 4px; border-radius: 6px; transition: all 0.2s; }
        .attach-btn:hover { color: #6366f1; background: rgba(99,102,241,0.1); }
        .del-msg-btn { background: none; border: none; color: transparent; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 4px; transition: all 0.15s; }
        .msg-wrapper:hover .del-msg-btn { color: #ef4444 !important; background: rgba(239,68,68,0.1); }
        .msg-wrapper { position: relative; }
      `}</style>

      {/* ══ LEFT: GROUPS SIDEBAR ══ */}
      <div style={{ width: 68, background: "#050509", borderRight: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 8, flexShrink: 0 }}>
        <div onClick={() => navigate("/")} style={{ width: 40, height: 40, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", marginBottom: 8, boxShadow: "0 4px 16px rgba(99,102,241,0.4)" }} title="Home">
          ✦
        </div>
        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
        {groups.map(g => {
          const status = membershipMap[g._id];
          const isActive = selectedGroup?._id === g._id;
          return (
            <div
              key={g._id}
              onClick={() => setSelectedGroup(g)}
              title={g.name}
              style={{
                width: 42, height: 42, borderRadius: isActive ? 14 : "50%",
                background: isActive ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.07)",
                border: status === "pending" ? "2px solid #f59e0b" : status === "approved" ? "2px solid rgba(99,102,241,0.4)" : "2px solid transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: isActive ? "white" : "#64748b",
                cursor: "pointer", transition: "all 0.2s", flexShrink: 0
              }}
            >
              {g.semester}
            </div>
          );
        })}
      </div>

      {/* ══ CHANNELS + GROUP INFO ══ */}
      {selectedGroup && (
        <div style={{ width: 220, background: "#0a0a16", borderRight: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {/* Group header */}
          <div style={{ padding: "18px 14px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 800, color: "#e2e8f0", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedGroup.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: 11, color: "#4a5068" }}>{onlineCount} online</span>
            </div>
          </div>

          {/* Channels */}
          <div style={{ padding: "12px 8px", flex: 1, overflowY: "auto" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#2a2a3a", letterSpacing: "0.1em", padding: "0 6px", marginBottom: 6 }}>CHANNELS</div>
            {CHANNELS.map(ch => (
              <div
                key={ch.id}
                className={`channel-item ${selectedChannel === ch.id ? "active" : ""}`}
                onClick={() => setSelectedChannel(ch.id)}
              >
                <span style={{ fontSize: 14 }}>{ch.icon}</span>
                <span># {ch.label}</span>
              </div>
            ))}
          </div>

          {/* User info bottom */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0 }}>
              {getInitials(userName)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#c7d2fe", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
              <div style={{ fontSize: 10, color: "#4a5068" }}>{userRole}</div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MAIN CHAT AREA ══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {!selectedGroup ? (
          <EmptyState />
        ) : joinStatus !== "approved" ? (
          <JoinGate group={selectedGroup} status={joinStatus} onJoin={() => handleJoinRequest(selectedGroup._id)} userSem={userSem} userRole={userRole} />
        ) : (
          <>
            {/* Chat Header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 12, background: "rgba(10,10,22,0.7)", backdropFilter: "blur(10px)", flexShrink: 0 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{currentChannelInfo?.icon}</span>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "#e2e8f0", fontSize: 15 }}>
                    #{currentChannelInfo?.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#4a5068" }}>{selectedGroup.name}</div>
                </div>
              </div>
              <button
                onClick={() => setShowMembers(s => !s)}
                style={{ background: "none", border: "none", color: showMembers ? "#6366f1" : "#4a5068", cursor: "pointer", fontSize: 18, padding: "4px 8px", borderRadius: 7, transition: "all 0.2s" }}
              >
                👥
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 0 }}>
              {grouped.map((entry, idx) => {
                if (entry.type === "divider") {
                  return (
                    <div key={`div-${idx}`} style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                      <div style={{ fontSize: 11, color: "#3a3a55", fontWeight: 600 }}>{entry.label}</div>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                    </div>
                  );
                }
                const { item, idx: msgIdx } = entry;
                const isMine = item.sender === userName || item.senderId === userId;
                return (
                  <div
                    key={item._id || msgIdx}
                    className="msg-wrapper"
                    style={{
                      display: "flex",
                      flexDirection: isMine ? "row-reverse" : "row",
                      gap: 10, padding: "3px 4px", marginBottom: 4,
                      animation: "fadeUp 0.2s ease both",
                      animationDelay: `${Math.min(msgIdx * 0.015, 0.25)}s`
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: isMine ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "linear-gradient(135deg,#0f766e,#0891b2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white" }}>
                      {getInitials(item.sender)}
                    </div>
                    <div style={{ maxWidth: "65%", display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                      <div style={{ fontSize: 11, color: "#3a3a55", marginBottom: 3, display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontWeight: 600, color: isMine ? "#a5b4fc" : "#67e8f9" }}>{item.sender}</span>
                        <span>{formatTime(item.createdAt)}</span>
                        {userRole === "teacher" && item._id && (
                          <button className="del-msg-btn" onClick={() => handleDeleteMessage(item._id)} title="Delete message">🗑</button>
                        )}
                      </div>
                      <div style={{
                        background: isMine ? "linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.18))" : "rgba(255,255,255,0.06)",
                        border: isMine ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(255,255,255,0.05)",
                        padding: "8px 13px", borderRadius: isMine ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                        fontSize: 14, color: "#e2e8f0", lineHeight: 1.55, wordBreak: "break-word"
                      }}>
                        {item.text && <div>{item.text}</div>}
                        {item.fileUrl && <FileMessage fileUrl={item.fileUrl} fileName={item.fileName} fileType={item.fileType} />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {typingUsers.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", color: "#6366f1", fontSize: 12 }}>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#6366f1", animation: `blink 1s ease infinite`, animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                  <span>{typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "12px 20px 16px", flexShrink: 0 }}>
              <div style={{
                display: "flex", alignItems: "flex-end", gap: 10,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14, padding: "10px 14px"
              }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
                  onChange={e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); }}
                />
                <button className="attach-btn" onClick={() => fileInputRef.current?.click()} title="Attach file" disabled={uploadingFile}>
                  {uploadingFile ? "⏳" : "📎"}
                </button>
                <textarea
                  className="msg-input"
                  placeholder={`Message #${currentChannelInfo?.label}...`}
                  value={message}
                  onChange={handleTyping}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  style={{ height: 24, overflowY: "hidden", flex: 1 }}
                  onInput={e => {
                    e.target.style.height = "24px";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                    e.target.style.overflowY = e.target.scrollHeight > 120 ? "auto" : "hidden";
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  style={{
                    width: 34, height: 34, borderRadius: 9, border: "none",
                    background: message.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(99,102,241,0.15)",
                    color: "white", fontSize: 14, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "all 0.2s"
                  }}
                >
                  ➤
                </button>
              </div>
              <div style={{ fontSize: 10, color: "#2a2a35", marginTop: 4, textAlign: "center" }}>
                Enter to send · Shift+Enter for newline · 📎 to attach files
              </div>
            </div>
          </>
        )}
      </div>

      {/* ══ MEMBERS PANEL ══ */}
      {showMembers && joinStatus === "approved" && (
        <div style={{ width: 210, background: "#08080f", borderLeft: "1px solid rgba(255,255,255,0.04)", padding: "16px 12px", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: "#2a2a3a", letterSpacing: "0.1em", marginBottom: 14 }}>
            MEMBERS — {members.length}
          </div>
          {members.map(m => (
            <div key={m._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", marginBottom: 2 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: m.role === "teacher" ? "linear-gradient(135deg,#f59e0b,#ef4444)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white", flexShrink: 0 }}>
                {getInitials(m.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#c7d2fe", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                <div style={{ fontSize: 10, color: m.role === "teacher" ? "#f59e0b" : "#4a5068" }}>
                  {m.role === "teacher" ? "🏫 Teacher" : `Sem ${m.semester}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JoinGate({ group, status, onJoin, userSem, userRole }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24, padding: 40 }}>
      <div style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 20, padding: "48px 60px", textAlign: "center", maxWidth: 440, animation: "fadeUp 0.4s ease" }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>
          {status === "pending" ? "⏳" : status === "rejected" ? "🚫" : "🔒"}
        </div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: "#e2e8f0", marginBottom: 8 }}>{group.name}</div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
            SEMESTER {group.semester}
          </span>
        </div>
        <div style={{ fontSize: 14, color: "#4a5068", margin: "20px 0", lineHeight: 1.7 }}>
          {status === "pending" ? "Your request is awaiting teacher approval."
            : status === "rejected" ? "Your request was rejected. Contact your teacher."
            : "Send a join request to access this group."}
        </div>
        {!status && <button className="join-btn" onClick={onJoin}>Request to Join →</button>}
        {status === "pending" && (
          <div style={{ color: "#f59e0b", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1.5s infinite" }} />
            Pending Approval
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "#4a5068" }}>
      <div style={{ fontSize: 48 }}>📡</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, color: "#64748b" }}>Select a group to chat</div>
      <div style={{ fontSize: 13 }}>Pick a semester group from the left sidebar</div>
    </div>
  );
}