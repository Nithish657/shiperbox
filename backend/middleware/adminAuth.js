const jwt = require("jsonwebtoken");
require("dotenv").config();

// Verifies the Bearer token sent by AdminDashboard.jsx / AdminLogin.jsx.
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Missing admin token" });
  }

  if (!process.env.ADMIN_JWT_SECRET) {
    console.error("ADMIN_JWT_SECRET is not set in .env");
    return res.status(500).json({ success: false, message: "Admin auth is not configured" });
  }

  try {
    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    
    if (payload.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    
    req.admin = payload;
    next();
  } catch (err) {
    console.error("Admin Token Error:", err.message);
    return res.status(401).json({ success: false, message: "Invalid or expired admin token" });
  }
}

module.exports = requireAdmin;