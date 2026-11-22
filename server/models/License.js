const mongoose = require("mongoose");

const licenseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "Package", required: true },
    deviceId: { type: String, required: true },
    token: { type: String, required: true }, // signed JWT the client stores and validates locally
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    lastValidatedAt: { type: Date, default: Date.now },
    revoked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

licenseSchema.index({ user: 1, package: 1 });

module.exports = mongoose.model("License", licenseSchema);
