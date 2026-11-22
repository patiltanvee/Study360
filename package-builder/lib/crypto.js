const crypto = require("crypto");

const MAGIC = Buffer.from("BNDL1");

function newKey() {
  return crypto.randomBytes(32);
}

function encrypt(plain, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]);
}

function decrypt(blob, key) {
  if (!blob.subarray(0, 5).equals(MAGIC)) throw new Error("Not a bandhu bundle");
  const iv = blob.subarray(5, 17);
  const tag = blob.subarray(17, 33);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(33)), decipher.final()]);
}

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

module.exports = { newKey, encrypt, decrypt, sha256 };
