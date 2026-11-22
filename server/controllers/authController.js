const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function register(req, res) {
  try {
    const { name, email, password, studentClass } = req.body;
    if (!name || !email || !password || !studentClass) {
      return res.status(400).json({ message: "name, email, password, studentClass are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanClass = String(studentClass).trim();

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      studentClass: cleanClass
    });

    return res.status(201).json({ message: "Account created", userId: user._id });
  } catch (err) {
    return res.status(500).json({ message: "Registration failed", error: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: "Invalid email or password" });

    const secret = process.env.JWT_SECRET || "dev_jwt_secret_student_ai_app_key_2026";
    const token = jwt.sign(
      { id: user._id, role: user.role, studentClass: user.studentClass },
      secret,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, studentClass: user.studentClass }
    });
  } catch (err) {
    return res.status(500).json({ message: "Login failed", error: err.message });
  }
}

module.exports = { register, login };
