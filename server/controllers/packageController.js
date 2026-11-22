const Package = require("../models/Package");

// Students only see lightweight metadata - the catalog they can browse offline once cached.
async function listPackages(req, res) {
  try {
    const filter = { isActive: true };
    if (req.query.studentClass) filter.studentClass = req.query.studentClass;

    const packages = await Package.find(filter)
      .select("title studentClass subject description price version sizeMB")
      .sort({ studentClass: 1, subject: 1 });

    return res.json(packages);
  } catch (err) {
    return res.status(500).json({ message: "Failed to list packages", error: err.message });
  }
}

// Admin only - publish a new package or a new version of one.
async function createPackage(req, res) {
  try {
    const { title, studentClass, subject, description, version, price, bundleKey, sizeMB, bundleSha256, embeddingModel, encryptionKey } = req.body;
    if (!title || !studentClass || !subject || !bundleKey) {
      return res.status(400).json({ message: "title, studentClass, subject, bundleKey are required" });
    }

    const pkg = await Package.create({
      title,
      studentClass,
      subject,
      description: description || "",
      version: version ? Number(version) : 1,
      price: price ? Number(price) : 0,
      bundleKey,
      sizeMB: sizeMB ? Number(sizeMB) : 0,
      bundleSha256: bundleSha256 || "",
      embeddingModel: embeddingModel || "Xenova/all-MiniLM-L6-v2",
      encryptionKey: encryptionKey || ""
    });

    const { encryptionKey: _hidden, ...safe } = pkg.toObject();
    return res.status(201).json(safe);
  } catch (err) {
    return res.status(500).json({ message: "Failed to create package", error: err.message });
  }
}

// Admin only - everything, including inactive packages (never the key).
async function listAllPackages(req, res) {
  try {
    const packages = await Package.find().sort({ createdAt: -1 });
    return res.json(packages);
  } catch (err) {
    return res.status(500).json({ message: "Failed to list packages", error: err.message });
  }
}

// Admin only - hide/show a package in the student catalog without deleting it.
async function setPackageActive(req, res) {
  try {
    const pkg = await Package.findByIdAndUpdate(req.params.id, { isActive: !!req.body.isActive }, { new: true });
    if (!pkg) return res.status(404).json({ message: "Package not found" });
    return res.json(pkg);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update package", error: err.message });
  }
}

module.exports = { listPackages, createPackage, listAllPackages, setPackageActive };
