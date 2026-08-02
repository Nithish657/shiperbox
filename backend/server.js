require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const multer = require("multer");

// Render sits behind a reverse proxy - without this, req.ip (and therefore
// express-rate-limit) sees Render's proxy IP instead of the real client,
// which makes every rate limiter in this app useless.
app.set("trust proxy", 1);

app.use(helmet({
  // Your /uploads static images (category tiles) are deliberately loaded
  // cross-origin - the frontend runs on a different origin (Netlify, or
  // localhost:3000 in dev) than this backend. Helmet's default
  // Cross-Origin-Resource-Policy: same-origin silently blocks that kind
  // of cross-origin <img> load, which is why the category tile images
  // were showing as blank space instead of loading.
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ==========================================
// CORS
// ==========================================
// Set FRONTEND_URL in your .env to a comma-separated list of the exact
// origins allowed to call this API, e.g.:
//   FRONTEND_URL=https://your-app.netlify.app,https://www.yourdomain.com
// If FRONTEND_URL is not set, all origins are allowed (fine for local
// dev, NOT recommended once this is live on Render).
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn("⚠️  FRONTEND_URL is not set - CORS is currently open to ALL origins.");
}

app.use(
  cors({
    origin: (origin, callback) => {
      // requests with no Origin header (server-to-server, curl, health checks) are allowed
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    // ✅ ADDED: This explicitly allows the browser to send your Admin Token
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Cap request body size - a small, sane default that stops obvious payload-flood abuse.
app.use(express.json({ limit: "2mb" }));

// Keep this for backwards compatibility (if you still have uploads folder)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("Backend is successfully running on Render!");
});

// ==========================================
// TEST / DIAGNOSTIC ROUTES - DEV ONLY
// ==========================================
// These were previously public with no auth check at all - anyone could
// use /test-upload to push arbitrary files into your Cloudinary account.
// They now only exist outside production.
if (process.env.NODE_ENV !== "production") {
  app.get("/test-cloudinary", async (req, res) => {
    try {
      const { cloudinary } = require("./config/cloudinary");
      const result = await cloudinary.api.ping();
      res.json({ success: true, message: "Cloudinary connected!", result });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  const testUpload = multer({ dest: "temp/" });
  app.post("/test-upload", testUpload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
      const { uploadToCloudinary } = require("./config/cloudinary");
      const result = await uploadToCloudinary(req.file.path, "test");
      if (result) {
        res.json({ success: true, message: "Upload successful!", url: result.secure_url });
      } else {
        res.status(500).json({ success: false, message: "Upload failed" });
      }
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}

// ==========================================
// ROUTES
// ==========================================
app.use("/auth", require("./routes/auth"));
app.use("/items", require("./routes/items"));
app.use("/ads", require("./routes/ads"));
app.use("/cart", require("./routes/cart"));
app.use("/orders", require("./routes/orders"));
app.use("/search", require("./routes/search"));
app.use("/garland", require("./routes/garland"));
app.use("/address", require("./routes/address"));

// Admin routes
app.use("/admin", require("./routes/adminAuth"));
app.use("/admin", require("./routes/adminRoutes"));
app.use("/admin/courier", require("./routes/adminCourier"));

// User courier routes
app.use("/courier", require("./routes/courier"));

// 404 - anything that didn't match a route above
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Not found" });
});

// ==========================================
// CENTRAL ERROR HANDLER - must be the LAST app.use()
// ==========================================
// Catches: multer errors (bad file type, oversized file), the CORS
// rejection above, and anything else passed to next(err) anywhere in the
// app. Without this, Express's default handler returns an HTML page with
// a full stack trace, which is both ugly and a security leak in production.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ success: false, message: "Not allowed by CORS" });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "File too large (max 5MB)" });
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Server error" : err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));