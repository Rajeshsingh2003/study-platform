const express = require("express");
const router = express.Router();
const Note = require("../models/note");
const authMiddleware = require("../middleware/auth");

// 📥 Upload Note
router.post("/upload", authMiddleware, async (req, res) => {
  res.json({ msg: "Move upload logic here later" });
});

// 📄 Get Notes (with search + filter)
router.get("/", async (req, res) => {
  try {
    const { search, subject } = req.query;

    let query = {};

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    if (subject) {
      query.subject = subject;
    }

    const notes = await Note.find(query)
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.json(notes);

  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;