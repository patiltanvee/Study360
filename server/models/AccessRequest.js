const mongoose = require("mongoose");

const accessRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "Package", required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    note: { type: String, default: "" }, // student's message, e.g. payment reference
    deviceIdHint: { type: String, default: null }, // device that asked, used to bind the license on approval
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// A student shouldn't spam duplicate pending requests for the same package
accessRequestSchema.index({ user: 1, package: 1, status: 1 });

module.exports = mongoose.model("AccessRequest", accessRequestSchema);
