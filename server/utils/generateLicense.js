const jwt = require("jsonwebtoken");

/**
 * Creates a signed, device-bound license token.
 * The client stores this and validates it LOCALLY (offline) to unlock a package.
 * It is only re-checked against the server occasionally (see LICENSE_VALIDITY_DAYS),
 * not on every app open.
 */
function generateLicenseToken({ userId, packageId, deviceId }) {
  const validityDays = Number(process.env.LICENSE_VALIDITY_DAYS || 30);
  const expiresIn = `${validityDays}d`;
  const secret = process.env.LICENSE_SECRET || "dev_license_secret_student_ai_app_key_2026";

  const token = jwt.sign(
    { userId: String(userId), packageId: String(packageId), deviceId },
    secret,
    { expiresIn }
  );

  const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
  return { token, expiresAt };
}

module.exports = { generateLicenseToken };
