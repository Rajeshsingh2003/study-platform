const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: {
    type: String,
    enum: ["student", "teacher"],
    default: "student"
  },
  points: {
    type: Number,
    default: 0
  },
  semester: {
  type: String,
  required: false,
  default: ""
}
});

module.exports = mongoose.model("User", userSchema);