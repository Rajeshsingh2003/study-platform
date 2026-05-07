require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const app = express();

// ================== MIDDLEWARE ==================
app.use(express.json());
app.use(cors());

// ================== MODELS ==================
const User = require("./models/user");
const Note = require("./models/note");
const Message = require("./models/Message");

const Group = require("./models/Group");
// ================== ROUTES ==================
const authRoutes = require("./routes/auth");
const notesRoutes = require("./routes/notes");
const groupRoutes = require("./routes/group");
const authMiddleware = require("./middleware/auth");

app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/groups", groupRoutes);

// ================== STATIC ==================
app.use("/uploads", express.static("uploads"));

// ================== DATABASE ==================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

app.get("/", (req, res) => res.send("API Running"));

// ================== FILE UPLOAD (Notes + Chat files) ==================
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "uploads")),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// Upload note
app.post("/api/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { title, subject } = req.body;
    const newNote = new Note({ title, subject, file: req.file.filename, user: req.user.id });
    await newNote.save();
    const user = await User.findById(req.user.id);
    if (user) { user.points = (user.points || 0) + 10; await user.save(); }
    res.json({ msg: "Uploaded", note: newNote });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Upload error" });
  }
});

// Upload chat file/image
app.post("/api/upload-chat-file", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No file" });
    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    const fileType = req.file.mimetype.startsWith("image/") ? "image" : "file";
    res.json({ url: fileUrl, filename: req.file.originalname, type: fileType, mimetype: req.file.mimetype });
  } catch (err) {
    res.status(500).json({ msg: "Upload error" });
  }
});

// ================== NOTES ==================
app.get("/api/notes", async (req, res) => {
  const notes = await Note.find().populate("user", "name").sort({ createdAt: -1 });
  res.json(notes);
});

app.get("/api/my-notes", authMiddleware, async (req, res) => {
  const notes = await Note.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(notes);
});

app.delete("/api/notes/:id", authMiddleware, async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ msg: "Not found" });
  const isOwner = note.user.toString() === req.user.id;
  const isTeacher = req.user.role === "teacher";
  if (!isOwner && !isTeacher) return res.status(403).json({ msg: "Not allowed" });
  await note.deleteOne();
  res.json({ msg: "Deleted" });
});

// ================== BOOKS ==================
const Book = require("./models/Book");

app.post("/api/books/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { title, author, subject, description } = req.body;
    if (!req.file) return res.status(400).json({ msg: "No file" });
    const coverFile = req.body.cover || null;
    const newBook = new Book({
      title, author, subject, description,
      file: req.file.filename,
      uploadedBy: req.user.id
    });
    await newBook.save();
    const user = await User.findById(req.user.id);
    if (user) { user.points = (user.points || 0) + 15; await user.save(); }
    res.json({ msg: "Book uploaded", book: newBook });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Upload error" });
  }
});

app.get("/api/books", async (req, res) => {
  try {
    const books = await Book.find().populate("uploadedBy", "name").sort({ createdAt: -1 });
    res.json(books);
  } catch { res.json([]); }
});

app.delete("/api/books/:id", authMiddleware, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ msg: "Not found" });
    const isOwner = book.uploadedBy.toString() === req.user.id;
    const isTeacher = req.user.role === "teacher";
    if (!isOwner && !isTeacher) return res.status(403).json({ msg: "Not allowed" });
    await book.deleteOne();
    res.json({ msg: "Deleted" });
  } catch { res.status(500).json({ msg: "Error" }); }
});

// Book rating
app.post("/api/books/:id/rate", authMiddleware, async (req, res) => {
  try {
    const { rating } = req.body;
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ msg: "Not found" });
    const existing = book.ratings.find(r => r.user.toString() === req.user.id);
    if (existing) { existing.value = rating; }
    else { book.ratings.push({ user: req.user.id, value: rating }); }
    await book.save();
    const avg = book.ratings.reduce((a, r) => a + r.value, 0) / book.ratings.length;
    res.json({ avg: avg.toFixed(1), count: book.ratings.length });
  } catch { res.status(500).json({ msg: "Error" }); }
});

// ================== LIKE ==================
app.post("/api/notes/:id/like", authMiddleware, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ msg: "Not found" });
    const userId = req.user.id;
    if (!note.likes) note.likes = [];
    const index = note.likes.indexOf(userId);
    if (index === -1) {
      note.likes.push(userId);
      const owner = await User.findById(note.user);
      if (owner) { owner.points = (owner.points || 0) + 2; await owner.save(); }
    } else {
      note.likes.splice(index, 1);
    }
    await note.save();
    res.json({ msg: "Updated", likes: note.likes.length });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// ================== LEADERBOARD ==================
app.get("/api/leaderboard", async (req, res) => {
  try {
    const users = await User.find({ role: "student" }).sort({ points: -1 }).limit(10).select("name points");
    res.json(users);
  } catch { res.json([]); }
});

// ================== ADMIN: Delete User ==================
app.delete("/api/admin/users/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "teacher") return res.status(403).json({ msg: "Not allowed" });
    await User.findByIdAndDelete(req.params.id);
    await Note.deleteMany({ user: req.params.id });
    res.json({ msg: "User and their data deleted" });
  } catch { res.status(500).json({ msg: "Error" }); }
});

app.get("/api/admin/users", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "teacher") return res.status(403).json({ msg: "Not allowed" });
    const users = await User.find({ role: "student" }).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch { res.json([]); }
});

// ================== DELETE CHAT MESSAGES (teacher) ==================
app.delete("/api/groups/:groupId/messages/:messageId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "teacher") return res.status(403).json({ msg: "Not allowed" });
    await Message.findByIdAndDelete(req.params.messageId);
    res.json({ msg: "Message deleted" });
  } catch { res.status(500).json({ msg: "Error" }); }
});

// ================== ACADEMIC CALENDAR ==================
const AcademicEvent = require("./models/AcademicEvent");

app.get("/api/calendar", authMiddleware, async (req, res) => {
  try {
    const events = await AcademicEvent.find().sort({ date: 1 });
    res.json(events);
  } catch { res.json([]); }
});

app.post("/api/calendar", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "teacher") return res.status(403).json({ msg: "Only teachers can add events" });
    const { title, date, type, description } = req.body;
    const event = new AcademicEvent({ title, date, type, description, createdBy: req.user.id });
    await event.save();
    res.json(event);
  } catch { res.status(500).json({ msg: "Error" }); }
});

app.delete("/api/admin/users/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ msg: "Not allowed" });
    }

    const userId = req.params.id;

    // ✅ delete user
    await User.findByIdAndDelete(userId);

    // ✅ delete user's notes
    await Note.deleteMany({ user: userId });

    // ✅ 🔥 ADD THESE (VERY IMPORTANT)
    await Message.deleteMany({ senderId: userId });
    await Group.updateMany({}, { $pull: { members: userId } });

    res.json({ msg: "User and all data deleted" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Error deleting user" });
  }
});

// ================== PASSWORD RESET VIA EMAIL ==================
const resetTokens = new Map(); // token -> { userId, expires }

// Allowed email domains
const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || "college.edu,university.ac.in,gmail.com").split(",");

function isAllowedEmail(email) {
  const domain = email.split("@")[1];
  return ALLOWED_DOMAINS.some(d => domain === d || domain.endsWith("." + d));
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "Email required" });
    if (!isAllowedEmail(email)) return res.status(400).json({ msg: "Only institutional email domains are allowed" });
    const user = await User.findOne({ email });
    if (!user) return res.json({ msg: "If this email exists, a reset link has been sent." });
    const token = crypto.randomBytes(32).toString("hex");
    resetTokens.set(token, { userId: user._id.toString(), expires: Date.now() + 3600000 });
    const resetUrl = `http://localhost:3000/reset-password?token=${token}`;
    await transporter.sendMail({
      from: `"StudyVault" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "StudyVault - Password Reset",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a15; color: #e2e8f0; padding: 40px; border-radius: 16px;">
          <div style="font-size: 28px; font-weight: 800; background: linear-gradient(135deg,#6366f1,#a5b4fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 24px;">✦ StudyVault</div>
          <h2 style="color: #e2e8f0; margin-bottom: 12px;">Password Reset Request</h2>
          <p style="color: #94a3b8; line-height: 1.7;">Hello ${user.name},<br/>Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; background: linear-gradient(135deg,#6366f1,#8b5cf6); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700;">Reset Password →</a>
          <p style="color: #4a5068; font-size: 13px;">If you didn't request this, please ignore this email.</p>
        </div>
      `
    });
    res.json({ msg: "If this email exists, a reset link has been sent." });
  } catch (err) {
    console.log("Email error:", err);
    res.status(500).json({ msg: "Failed to send email" });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    const record = resetTokens.get(token);
    if (!record || Date.now() > record.expires) return res.status(400).json({ msg: "Invalid or expired token" });
    if (password.length < 6) return res.status(400).json({ msg: "Password must be at least 6 characters" });
    const bcrypt = require("bcryptjs");
    const hashed = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(record.userId, { password: hashed });
    resetTokens.delete(token);
    res.json({ msg: "Password reset successfully" });
  } catch { res.status(500).json({ msg: "Error" }); }
});

// Check allowed domain
app.post("/api/auth/check-domain", (req, res) => {
  const { email } = req.body;
  res.json({ allowed: isAllowedEmail(email), domains: ALLOWED_DOMAINS });
});

// ================== SOCKET ==================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost",
    methods: ["GET", "POST"]
  }
});

// Persist messages in DB
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("joinGroup", (roomId) => {
    Object.keys(socket.rooms).forEach(r => {
      if (r !== socket.id) socket.leave(r);
    });
    socket.join(roomId);
    const count = io.sockets.adapter.rooms.get(roomId)?.size || 1;
    io.to(roomId).emit("onlineCount", count);
  });

  socket.on("sendMessage", async ({ groupId, channelId, text, message, sender, senderId, fileUrl, fileName, fileType }) => {
    const roomId = `${groupId}-${channelId || "general"}`;
    const msgText = text || message || "";

    try {
      // Save to DB
      const savedMsg = new Message({
        group: groupId,
        channelId: channelId || "general",
        sender,
        senderId,
        text: msgText,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null
      });
      await savedMsg.save();

      if (senderId) {
        const user = await User.findById(senderId);
        if (user) { user.points = (user.points || 0) + 1; await user.save(); }
      }

      io.to(roomId).emit("receiveMessage", {
        _id: savedMsg._id,
        text: msgText,
        sender,
        senderId,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        createdAt: savedMsg.createdAt.toISOString()
      });
    } catch (err) {
      console.log("Message error:", err);
    }
  });

  socket.on("typing", ({ groupId, channelId, name }) => {
    const roomId = `${groupId}-${channelId || "general"}`;
    socket.to(roomId).emit("userTyping", { name, channelId });
  });

  socket.on("deleteMessage", async ({ messageId, groupId, channelId, userRole }) => {
    if (userRole !== "teacher") return;
    try {
      await Message.findByIdAndDelete(messageId);
      const roomId = `${groupId}-${channelId || "general"}`;
      io.to(roomId).emit("messageDeleted", { messageId });
    } catch {}
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("🚀 Server running on port 5000"));