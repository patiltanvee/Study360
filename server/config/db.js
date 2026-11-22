const mongoose = require("mongoose");

let isConnecting = false;

async function connectDB(retries = 3, delay = 3000) {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/student-ai-app";

  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (isConnecting) {
    return;
  }

  isConnecting = true;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Connecting to MongoDB (attempt ${attempt}/${retries})...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 4000,
        connectTimeoutMS: 10000,
      });
      console.log("MongoDB connected successfully");
      isConnecting = false;
      return;
    } catch (err) {
      console.error(`MongoDB connection failed (attempt ${attempt}/${retries}):`, err.message);
      if (attempt < retries) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  isConnecting = false;
  console.warn(
    "\n⚠️  WARNING: Could not connect to MongoDB." +
    "\n   Make sure MongoDB is running locally on port 27017 (e.g. mongod.exe or service)," +
    "\n   or provide a MongoDB Atlas cloud URI in server/.env:" +
    "\n   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/student-ai-app\n"
  );
}

// Event listeners for connection monitoring
mongoose.connection.on("connected", () => {
  console.log("MongoDB event: connected");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB event error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB event: disconnected");
});

module.exports = connectDB;
