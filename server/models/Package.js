const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // e.g. "Class 10 Science - Full Course"
    studentClass: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, default: "" },
    version: { type: Number, default: 1 },
    price: { type: Number, default: 0 }, // 0 = free package
    bundleKey: { type: String, required: true }, // storage key/path for the encrypted zip (content + flashcards + tests + embeddings)
    sizeMB: { type: Number, default: 0 },
    bundleSha256: { type: String, default: "" }, // integrity check printed by the package builder
    embeddingModel: { type: String, default: "Xenova/all-MiniLM-L6-v2" }, // device must embed queries with the SAME model
    // AES-256 key (hex) printed by the package builder. Never returned in catalog queries;
    // only handed to a student whose license for this package is active.
    encryptionKey: { type: String, select: false, default: "" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Package", packageSchema);
