const mongoose = require("mongoose");
const AccessRequest = require("../models/AccessRequest");
const Package = require("../models/Package");
const License = require("../models/License");
const { generateLicenseToken } = require("../utils/generateLicense");

// Student: ask for access to a package
async function createRequest(req, res) {
  try {
    const { packageId, note, deviceId } = req.body;
    if (!packageId || !deviceId) {
      return res.status(400).json({ message: "packageId and deviceId are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(packageId)) {
      return res.status(400).json({ message: "Invalid package ID format" });
    }

    const pkg = await Package.findById(packageId);
    if (!pkg || !pkg.isActive) return res.status(404).json({ message: "Package not found" });

    const existingPending = await AccessRequest.findOne({
      user: req.user.id,
      package: packageId,
      status: "pending"
    });
    if (existingPending) {
      return res.status(409).json({ message: "You already have a pending request for this package" });
    }

    const existingActiveLicense = await License.findOne({
      user: req.user.id,
      package: packageId,
      revoked: false,
      expiresAt: { $gt: new Date() }
    });
    if (existingActiveLicense) {
      return res.status(409).json({ message: "You already have an active license for this package" });
    }

    const request = await AccessRequest.create({
      user: req.user.id,
      package: packageId,
      note: note || "",
      // deviceId is carried through to the approval step so the license binds to it
      deviceIdHint: deviceId
    });

    return res.status(201).json({ message: "Request submitted, waiting for admin approval", request });
  } catch (err) {
    return res.status(500).json({ message: "Failed to submit request", error: err.message });
  }
}

// Student: check status of their own requests
async function myRequests(req, res) {
  try {
    const requests = await AccessRequest.find({ user: req.user.id })
      .populate("package", "title studentClass subject")
      .sort({ createdAt: -1 });
    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch requests", error: err.message });
  }
}

// Admin: view pending queue
async function listRequests(req, res) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const requests = await AccessRequest.find(filter)
      .populate("user", "name email studentClass")
      .populate("package", "title studentClass subject")
      .sort({ createdAt: 1 });

    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch requests", error: err.message });
  }
}

// Admin: approve or reject. Approval issues or renews a device-bound license.
async function reviewRequest(req, res) {
  try {
    const { decision, deviceId } = req.body; // decision: "approved" | "rejected"
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ message: "decision must be 'approved' or 'rejected'" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid request ID format" });
    }

    const request = await AccessRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") {
      return res.status(409).json({ message: `Request already ${request.status}` });
    }

    let license = null;
    if (decision === "approved") {
      const boundDeviceId = deviceId || request.deviceIdHint;
      if (!boundDeviceId) {
        return res.status(400).json({ message: "Cannot approve request: device ID is missing" });
      }

      const { token, expiresAt } = generateLicenseToken({
        userId: request.user,
        packageId: request.package,
        deviceId: boundDeviceId
      });

      license = await License.findOneAndUpdate(
        { user: request.user, package: request.package },
        {
          deviceId: boundDeviceId,
          token,
          expiresAt,
          issuedAt: new Date(),
          lastValidatedAt: new Date(),
          revoked: false
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    request.status = decision;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    await request.save();

    return res.json({ message: `Request ${decision}`, request, license });
  } catch (err) {
    return res.status(500).json({ message: "Failed to review request", error: err.message });
  }
}

module.exports = { createRequest, myRequests, listRequests, reviewRequest };
