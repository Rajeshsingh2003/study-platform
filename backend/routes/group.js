const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const User = require("../models/user");
const Message = require("../models/Message");
const auth = require("../middleware/auth");

// ── GET ALL GROUPS (with membership status for current user) ──
router.get("/all", auth, async (req, res) => {
  try {
    const allGroups = await Group.find().lean();

    const membershipMap = {};
    const groupsWithStatus = allGroups.map(g => {
      const userId = req.user.id;
      let status = null;

      if (g.members.map(m => m.toString()).includes(userId)) {
        status = "approved";
      } else if ((g.pendingRequests || []).map(p => p.toString()).includes(userId)) {
        status = "pending";
      } else if ((g.rejectedUsers || []).map(r => r.toString()).includes(userId)) {
        status = "rejected";
      }

      membershipMap[g._id.toString()] = status;

      return {
        ...g,
        memberStatus: status,
        memberCount: g.members.length,
        messageCount: g.messageCount || 0
      };
    });

    res.json({ groups: groupsWithStatus, membershipMap });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ── CREATE GROUP (teacher only) ──
router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ msg: "Only teachers can create groups" });
    }

    const { name, semester } = req.body;
    if (!name || !semester) return res.status(400).json({ msg: "Name and semester required" });

    const group = new Group({
      name,
      semester: String(semester),
      members: [req.user.id], // teacher is auto-member
      pendingRequests: [],
      rejectedUsers: [],
      createdBy: req.user.id
    });

    await group.save();
    res.json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ── REQUEST TO JOIN ──
router.post("/:groupId/join", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: "Group not found" });

    const userId = req.user.id;

    // Already a member
    if (group.members.map(m => m.toString()).includes(userId)) {
      return res.status(400).json({ msg: "Already a member" });
    }

    // Already pending
    if ((group.pendingRequests || []).map(p => p.toString()).includes(userId)) {
      return res.status(400).json({ msg: "Request already pending" });
    }

    // Teacher: auto approve
    if (req.user.role === "teacher") {
      group.members.push(userId);
      await group.save();
      return res.json({ msg: "Joined as teacher" });
    }

    // Remove from rejected if re-requesting
    group.rejectedUsers = (group.rejectedUsers || []).filter(r => r.toString() !== userId);

    group.pendingRequests = group.pendingRequests || [];
    group.pendingRequests.push(userId);
    await group.save();

    res.json({ msg: "Join request sent. Waiting for approval." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ── APPROVE REQUEST (teacher only) ──
router.post("/:groupId/approve/:userId", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ msg: "Only teachers can approve" });
    }

    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: "Group not found" });

    const targetUserId = req.params.userId;

    // Remove from pending
    group.pendingRequests = (group.pendingRequests || []).filter(
      p => p.toString() !== targetUserId
    );

    // Add to members
    if (!group.members.map(m => m.toString()).includes(targetUserId)) {
      group.members.push(targetUserId);
    }

    await group.save();
    res.json({ msg: "User approved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ── REJECT REQUEST (teacher only) ──
router.post("/:groupId/reject/:userId", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ msg: "Only teachers can reject" });
    }

    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: "Group not found" });

    const targetUserId = req.params.userId;

    group.pendingRequests = (group.pendingRequests || []).filter(
      p => p.toString() !== targetUserId
    );

    group.rejectedUsers = group.rejectedUsers || [];
    if (!group.rejectedUsers.map(r => r.toString()).includes(targetUserId)) {
      group.rejectedUsers.push(targetUserId);
    }

    await group.save();
    res.json({ msg: "Request rejected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ── GET PENDING REQUESTS (teacher sees all groups' pending) ──
router.get("/pending-requests", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ msg: "Teachers only" });
    }

    const groups = await Group.find({ pendingRequests: { $exists: true, $not: { $size: 0 } } })
      .populate("pendingRequests", "name email semester role")
      .lean();

    const result = groups
      .filter(g => g.pendingRequests && g.pendingRequests.length > 0)
      .map(g => ({
        _id: g._id,
        name: g.name,
        semester: g.semester,
        pendingRequests: g.pendingRequests
      }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ── GET MESSAGES for a group+channel ──
router.get("/:groupId/messages", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: "Group not found" });

    const userId = req.user.id;
    const isMember = group.members.map(m => m.toString()).includes(userId);
    const isTeacher = req.user.role === "teacher";

    if (!isMember && !isTeacher) {
      return res.status(403).json({ msg: "Not a member" });
    }

    const channelId = req.query.channel || "general";
    const messages = await Message.find({
      group: req.params.groupId,
      channelId
    }).sort({ createdAt: 1 }).limit(100).lean();

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ── POST MESSAGE (persist to DB) ──
router.post("/:groupId/messages", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: "Group not found" });

    const userId = req.user.id;
    const isMember = group.members.map(m => m.toString()).includes(userId);
    const isTeacher = req.user.role === "teacher";

    if (!isMember && !isTeacher) {
      return res.status(403).json({ msg: "Not a member" });
    }

    const { channelId, text } = req.body;
    if (!text?.trim()) return res.status(400).json({ msg: "Message cannot be empty" });

    const msg = new Message({
      group: req.params.groupId,
      channelId: channelId || "general",
      sender: req.user.name,
      senderId: userId,
      text
    });

    await msg.save();
    res.json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ── GET MEMBERS of a group ──
router.get("/:groupId/members", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate("members", "name email role semester");
    if (!group) return res.status(404).json({ msg: "Not found" });

    const userId = req.user.id;
    const isMember = group.members.map(m => m._id.toString()).includes(userId);
    const isTeacher = req.user.role === "teacher";

    if (!isMember && !isTeacher) return res.status(403).json({ msg: "Not a member" });

    res.json(group.members);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// ── DELETE GROUP (teacher only) ──
router.delete("/:groupId", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher") return res.status(403).json({ msg: "Teachers only" });

    await Group.findByIdAndDelete(req.params.groupId);
    await Message.deleteMany({ group: req.params.groupId });
    res.json({ msg: "Group deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;