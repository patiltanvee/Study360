const express = require("express");
const { listPackages, createPackage } = require("../controllers/packageController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, listPackages);
router.post("/", authenticate, requireAdmin, createPackage);

module.exports = router;
