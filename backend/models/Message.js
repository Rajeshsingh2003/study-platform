const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  channelId: { type: String, default: "general" },
  sender: { type: String, required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: { type: String, default: "" },
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  fileType: { type: String, enum: ["image", "file", null], default: null }
}, { timestamps: true });

messageSchema.index({ group: 1, channelId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);