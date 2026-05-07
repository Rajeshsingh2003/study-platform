import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const token = localStorage.getItem("token");

  // ✅ fetch users
  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  // ✅ delete user
  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;

    try {
      await axios.delete(
        `/api/admin/users/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      fetchUsers(); // refresh list
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>👨‍🎓 Users</h2>

      {users.map((u) => (
        <div key={u._id} style={{ marginBottom: 10 }}>
          {u.name} ({u.email})

          <button
            onClick={() => deleteUser(u._id)}
            style={{ marginLeft: 10, color: "red" }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}