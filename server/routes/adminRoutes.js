const express = require("express");
const { listRequests, reviewRequest } = require("../controllers/requestController");
const { listAllPackages, setPackageActive, createPackage } = require("../controllers/packageController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get("/requests", listRequests);
router.get("/packages", listAllPackages);
router.post("/packages", createPackage);
router.patch("/packages/:id/active", setPackageActive);
router.patch("/requests/:id", reviewRequest);

module.exports = router;
