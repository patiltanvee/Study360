const express = require("express");
const { createRequest, myRequests } = require("../controllers/requestController");
const { getMyLicenses, revalidate } = require("../controllers/licenseController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticate, createRequest);
router.get("/mine", authenticate, myRequests);

router.get("/licenses/mine", authenticate, getMyLicenses);
router.post("/licenses/:packageId/revalidate", authenticate, revalidate);

module.exports = router;
