const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const jwt = require("jsonwebtoken");


// ✅ Signup Route
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role,semester} = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      semester
    });

    await user.save();

    res.json({ msg: "User registered successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server error" });
  }
});


// ✅ Login Route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }
  console.log(user);
    const token = jwt.sign(
  { 
    id: user._id, 
    role: user.role, 
    name: user.name,
    semester: user.semester  // ✅ ADD THIS
  },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);

    res.json({
      msg: "Login successful",
      token
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;