const express = require("express");
const router = express.Router();
const Channel = require("../models/channel");
const authMiddleware = require("../middleware/auth");

// CREATE CHANNEL
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ msg: "Only teachers allowed" });
    }

    const { name, groupId } = req.body;

    if (!name || !groupId) {
      return res.status(400).json({ msg: "Missing data" });
    }

    const channel = new Channel({
      name,
      group: groupId
    });

    await channel.save();

    res.json(channel);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Error creating channel" });
  }
});

// GET CHANNELS
router.get("/:groupId", async (req, res) => {
  try {
    const channels = await Channel.find({ group: req.params.groupId });
    res.json(channels);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching channels" });
  }
});

// DELETE CHANNEL
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ msg: "Only teachers allowed" });
    }

    await Channel.findByIdAndDelete(req.params.id);

    res.json({ msg: "Deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Error deleting channel" });
  }
});

module.exports = router;