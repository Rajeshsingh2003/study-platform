const mongoose = require("mongoose");

const academicEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  type: {
    type: String,
    enum: ["exam", "holiday", "assignment", "event", "deadline", "lecture"],
    default: "event"
  },
  description: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

module.exports = mongoose.model("AcademicEvent", academicEventSchema);