const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, default: "Unknown" },
  subject: { type: String, default: "General" },
  description: { type: String, default: "" },
  file: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ratings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    value: { type: Number, min: 1, max: 5 }
  }],
  downloads: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Book", bookSchema);