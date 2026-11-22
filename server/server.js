require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const packageRoutes = require("./routes/packageRoutes");
const requestRoutes = require("./routes/requestRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { getMyLicenses, revalidate } = require("./controllers/licenseController");
const { authenticate } = require("./middleware/auth");

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbStatus = dbStates[mongoose.connection.readyState] || "unknown";
  res.json({
    status: mongoose.connection.readyState === 1 ? "ok" : "degraded",
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Database readiness check middleware for API data routes
app.use("/api", (req, res, next) => {
  if (req.path === "/health") return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database is not connected. Please ensure MongoDB is running or configure MONGO_URI in server/.env.",
      database: ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] || "unknown"
    });
  }
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/admin", adminRoutes);

// Direct license aliases
app.get("/api/licenses/mine", authenticate, getMyLicenses);
app.post("/api/licenses/:packageId/revalidate", authenticate, revalidate);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
