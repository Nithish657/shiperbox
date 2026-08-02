const jwt = require("jsonwebtoken");
require("dotenv").config();

// Verifies the Bearer token issued by POST /auth/verify-otp and attaches
// the authenticated user's email as req.userEmail.
//
// Every route that reads or writes a specific user's data (cart, orders,
// addresses, garland requests, courier requests) MUST use this middleware
// and then use req.userEmail - never req.body.user_id or req.params.user_id -
// as the identity to query/filter by. Trusting a client-supplied user_id
// lets anyone read or modify anyone else's data just by changing a value
// in their browser; this middleware is what actually prevents that.
function requireUser(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Please log in first" });
  }

  if (!process.env.USER_JWT_SECRET) {
    console.error("USER_JWT_SECRET is not set in .env");
    return res.status(500).json({ success: false, message: "Login is not configured" });
  }

  try {
    const payload = jwt.verify(token, process.env.USER_JWT_SECRET);
    req.userEmail = payload.email;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Your session has expired. Please log in again." });
  }
}

module.exports = requireUser;
