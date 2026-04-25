import { useState } from "react";

function Dashboard() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);

  // Dummy data (we will connect backend later)
  const groups = [
    { _id: "1", name: "Sem 3 CSE" },
    { _id: "2", name: "Sem 5 IT" }
  ];

  const channels = [
    { _id: "c1", name: "general" },
    { _id: "c2", name: "notes" }
  ];

  return (
    <div style={{ display: "flex", height: "100vh" }}>

      {/* 🟣 LEFT: GROUPS */}
      <div style={{ width: "20%", background: "#2f3136", color: "white", padding: "10px" }}>
        <h3>Groups</h3>

        {groups.map((g) => (
          <div
            key={g._id}
            style={{ cursor: "pointer", marginBottom: "10px" }}
            onClick={() => setSelectedGroup(g)}
          >
            {g.name}
          </div>
        ))}
      </div>

      {/* 🔵 MIDDLE: CHANNELS */}
      <div style={{ width: "20%", background: "#36393f", color: "white", padding: "10px" }}>
        <h3>Channels</h3>

        {channels.map((c) => (
          <div
            key={c._id}
            style={{ cursor: "pointer", marginBottom: "10px" }}
            onClick={() => setSelectedChannel(c)}
          >
            # {c.name}
          </div>
        ))}
      </div>

      {/* 🟢 RIGHT: CHAT */}
      <div style={{ width: "60%", background: "#40444b", color: "white", padding: "10px" }}>
        <h3>Chat Area</h3>

        {selectedGroup && selectedChannel ? (
          <p>
            Chatting in <b>{selectedGroup.name}</b> / #{selectedChannel.name}
          </p>
        ) : (
          <p>Select a group and channel</p>
        )}
      </div>

    </div>
  );
}

export default Dashboard;