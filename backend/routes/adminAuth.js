const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const db = require("../db");
require("dotenv").config();

// Any number of admin accounts can exist in the `admins` table (id, email,
// password, role) and each logs in with their OWN email + password.
// But no matter which admin logs in, the OTP is always sent to this ONE
// fixed, constant address - never to the admin's own email.
const MAIN_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim();

// In-memory store for pending OTPs, keyed by admin id, so concurrent
// logins by different admins don't clash with each other.
// { [adminId]: { otp, adminEmail, adminRole, expiresAt } }
const pendingAdminOtps = {};
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateOtp() {
  // crypto.randomInt is cryptographically strong, unlike Math.random()
  return crypto.randomInt(100000, 1000000).toString();
}

// Periodically purge expired/abandoned OTP entries so this object can't
// grow forever if admins request an OTP and never complete verification.
setInterval(() => {
  const now = Date.now();
  for (const id of Object.keys(pendingAdminOtps)) {
    if (pendingAdminOtps[id].expiresAt < now) delete pendingAdminOtps[id];
  }
}, 5 * 60 * 1000).unref();

// Rate limiting: brute-forcing admin credentials or OTPs is the single
// highest-value attack surface in this app, so both steps are limited.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many OTP attempts. Please try again in 15 minutes." },
});

// STEP 1: verify the submitted email + password against the admins table
// (any admin account may pass this check). On success, email a fresh OTP
// to the fixed MAIN_ADMIN_EMAIL - always that one constant address.
router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password required" });
  }

  if (!MAIN_ADMIN_EMAIL) {
    console.error("ADMIN_EMAIL (the fixed OTP recipient) is not set in .env");
    return res.status(500).json({ success: false, message: "Admin login is not configured" });
  }

  const submittedEmail = email.trim().toLowerCase();

  try {
    const [rows] = await db.execute(
      "SELECT id, email, password, role FROM admins WHERE LOWER(email) = ? LIMIT 1",
      [submittedEmail]
    );

    const adminRow = rows[0];

    // Always run bcrypt.compare even when no row was found, using a dummy
    // hash, so a nonexistent email doesn't return faster than a wrong
    // password would (avoids leaking which emails exist via timing).
    const hashToCheck = adminRow ? adminRow.password : "$2a$10$invalidsaltinvalidsaltinvalidsaltuXG";
    const match = await bcrypt.compare(password, hashToCheck);

    if (!adminRow || !match || adminRow.role !== "admin") {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const otp = generateOtp();
    pendingAdminOtps[adminRow.id] = {
      otp,
      adminEmail: adminRow.email,
      adminRole: adminRow.role,
      expiresAt: Date.now() + OTP_TTL_MS,
    };

    console.log(`\n🔑 [ADMIN LOGIN OTP] Login attempt by: ${adminRow.email} | OTP sent to main admin\n`);

    try {
      // Sent via Brevo's HTTP API instead of raw SMTP (nodemailer)
      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: { name: "ShiperBox Admin", email: process.env.EMAIL_USER },
          to: [{ email: MAIN_ADMIN_EMAIL, name: "Admin" }], // always this ONE constant address
          subject: "Admin Login OTP",
          htmlContent: `
            <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
              <h2>Admin Login Verification</h2>
              <p>An admin login attempt was made using the account: <strong>${adminRow.email}</strong></p>
              <p>Your one-time password (OTP) is:</p>
              <h1 style="color: #2874f0; letter-spacing: 5px;">${otp}</h1>
              <p>This code is valid for the next 10 minutes. If this wasn't expected, you can safely ignore this email.</p>
            </div>
          `,
        },
        {
          headers: {
            "api-key": process.env.BREVO_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        }
      );
    } catch (emailErr) {
      console.error("Admin OTP email failed:", emailErr.response?.data || emailErr.message);
      delete pendingAdminOtps[adminRow.id];
      return res.status(500).json({ success: false, message: "Failed to send OTP email. Please try again." });
    }

    res.json({
      success: true,
      otpRequired: true,
      adminId: adminRow.id,
      message: "OTP sent to the main admin's email",
    });
  } catch (err) {
    console.error("Admin login error:", err.message);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

// STEP 2: verify the OTP that was emailed to the main admin, then issue
// the login token for whichever admin account actually logged in.
router.post("/verify-otp", verifyLimiter, (req, res) => {
  const { adminId, otp } = req.body;

  if (!adminId || !otp) {
    return res.status(400).json({ success: false, message: "adminId and otp are required" });
  }

  const pending = pendingAdminOtps[adminId];

  if (!pending) {
    return res.status(400).json({ success: false, message: "No OTP request found. Please log in again." });
  }

  if (Date.now() > pending.expiresAt) {
    delete pendingAdminOtps[adminId];
    return res.status(400).json({ success: false, message: "OTP expired. Please log in again." });
  }

  if (pending.otp !== otp.toString().trim()) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  // Correct and unexpired - consume it (one-time use) and issue the token
  delete pendingAdminOtps[adminId];

  if (!process.env.ADMIN_JWT_SECRET) {
    console.error("ADMIN_JWT_SECRET is not set in .env");
    return res.status(500).json({ success: false, message: "Admin login is not configured" });
  }

  // Token now expires after 7 days instead of lasting forever - a leaked
  // token has a limited window instead of being valid indefinitely.
  const token = jwt.sign(
    { role: pending.adminRole, email: pending.adminEmail, id: Number(adminId) },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ success: true, token });
});

module.exports = router;