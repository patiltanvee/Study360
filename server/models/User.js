const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    studentClass: { type: String, required: true }, // e.g. "8", "10", "12-science"
    role: { type: String, enum: ["student", "admin"], default: "student" },
    deviceId: { type: String, default: null } // set on first app activation
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
