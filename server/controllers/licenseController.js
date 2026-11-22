const License = require("../models/License");
const Package = require("../models/Package");
const { generateLicenseToken } = require("../utils/generateLicense");

// Student's device calls this once, right after approval, to get the license
// token + where to download the encrypted package bundle from.
// After this, the device does NOT need to call the server again to use the package.
async function getMyLicenses(req, res) {
  try {
    const licenses = await License.find({ user: req.user.id, revoked: false, expiresAt: { $gt: new Date() } })
      .populate({
        path: "package",
        select: "title studentClass subject bundleKey bundleSha256 embeddingModel sizeMB version +encryptionKey"
      });

    // Filter out any orphaned licenses whose package was deleted
    const validLicenses = licenses.filter((l) => l.package !== null);

    return res.json(validLicenses);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch licenses", error: err.message });
  }
}

// Periodic re-validation (e.g. every 30 days) - extends license validity and issues renewed token
// without requiring constant connectivity.
async function revalidate(req, res) {
  try {
    const license = await License.findOne({
      user: req.user.id,
      package: req.params.packageId,
      revoked: false
    });
    if (!license) return res.status(404).json({ message: "No active license found" });

    const { token, expiresAt } = generateLicenseToken({
      userId: req.user.id,
      packageId: req.params.packageId,
      deviceId: license.deviceId
    });

    license.token = token;
    license.expiresAt = expiresAt;
    license.lastValidatedAt = new Date();
    await license.save();

    return res.json({ message: "License revalidated", token, expiresAt: license.expiresAt });
  } catch (err) {
    return res.status(500).json({ message: "Failed to revalidate license", error: err.message });
  }
}

module.exports = { getMyLicenses, revalidate };
