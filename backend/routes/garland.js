const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const axios = require("axios");
const { uploadToCloudinary } = require("../config/cloudinary");

// ✅ Correctly importing the middleware files
const requireAdmin = require("../middleware/requireAdmin");
const requireUser = require("../middleware/requireUser");

// TEMPORARY storage for multer
const tempDir = path.join(__dirname, "..", "temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `garland-${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

router.post("/", requireUser, upload.single("reference_image"), async (req, res) => {
  const { 
    needed_by, notes, 
    name, email, phone_number, alt_phone_num, 
    building_name, landmark, street, pin_code, city_or_village, state 
  } = req.body;
  const user_id = req.userEmail;

  if (!req.file) return res.status(400).json({ success: false, message: "Please attach a reference photo" });
  if (!needed_by) return res.status(400).json({ success: false, message: "Please specify when it's needed by" });

  try {
    const result = await uploadToCloudinary(req.file.path, "garlands");
    
    if (!result) {
      return res.status(500).json({ success: false, message: "Failed to upload image to Cloudinary" });
    }

    const imageUrl = result.secure_url;

    const sql = `INSERT INTO garland_orders
      (user_id, reference_image, needed_by, notes, name, email, phone_number, alt_phone_num, building_name, landmark, street, pin_code, city_or_village, state, approval_status, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', NOW())`;

    await db.query(sql, [
      user_id, 
      imageUrl,
      needed_by, 
      notes || null,
      name || null, 
      email || null, 
      phone_number || null, 
      alt_phone_num || null, 
      building_name || null, 
      landmark || null, 
      street || null, 
      pin_code || null, 
      city_or_village || null, 
      state || null
    ]);

    try {
      const formattedDate = new Date(needed_by).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      const fullAddress = `${building_name || ""}, ${street || ""}, ${landmark ? landmark + ", " : ""}${city_or_village || ""}${state ? ", " + state : ""}${pin_code ? " - " + pin_code : ""}`;

      const htmlContent = `
        <div style="font-family: sans-serif; color: #222; max-width: 600px;">
          <h2 style="color: #0c831f;">New Custom Garland Order! 🌸</h2>
          <table width="100%" style="border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding:6px 0;"><strong>Needed By:</strong></td><td>${formattedDate}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Reference Image:</strong></td><td><a href="${imageUrl}">${imageUrl}</a></td></tr>
          </table>
          <h4 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Contact Details:</h4>
          <p><strong>Name:</strong> ${name || "-"}</p>
          <p><strong>Email:</strong> ${email || "-"}</p>
          <p><strong>Phone:</strong> +91 ${phone_number || "-"}</p>
          <p><strong>Alt Phone:</strong> +91 ${alt_phone_num || "-"}</p>
          <p><strong>Customer Account:</strong> +${user_id}</p>
          <h4 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Delivery Address:</h4>
          <p>${fullAddress}</p>
          <h4 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Notes:</h4>
          <p>${notes || "-"}</p>
        </div>
      `;

      const brevoPayload = {
        sender: { name: "Garland Orders App", email: "shiperbox@gmail.com" },
        to: [{ email: "shiperbox@gmail.com", name: "Admin" }],
        subject: "New Custom Garland Order",
        htmlContent: htmlContent,
      };

      await axios.post("https://api.brevo.com/v3/smtp/email", brevoPayload, {
        headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" }
      });
    } catch (emailErr) {
      console.error("Brevo email failed to send:", emailErr.response?.data || emailErr.message);
    }

    res.json({ success: true, message: "Order placed successfully" });
  } catch (err) {
    console.error("Garland order error:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    fs.unlink(req.file.path, (unlinkErr) => {
      if (unlinkErr && unlinkErr.code !== "ENOENT") {
        console.error("Failed to remove temp upload file:", unlinkErr.message);
      }
    });
  }
});

router.get("/mine/:user_id", requireUser, async (req, res) => {
  try {
    const [data] = await db.query(
      `SELECT id, reference_image, needed_by, notes, approval_status, status, id AS order_id
       FROM garland_orders WHERE user_id = ? ORDER BY id DESC`,
      [req.userEmail]
    );
    res.json({ success: true, requests: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Review Routes
router.get("/pending", requireAdmin, async (req, res) => {
  try {
    const [data] = await db.query(`SELECT * FROM garland_orders WHERE approval_status = 'pending' ORDER BY id DESC`);
    res.json({ success: true, requests: data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get("/all", requireAdmin, async (req, res) => {
  try {
    const [data] = await db.query(`SELECT * FROM garland_orders ORDER BY id DESC`);
    res.json({ success: true, requests: data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put("/:id/review", requireAdmin, async (req, res) => {
  const { decision } = req.body;
  if (!["approved", "rejected"].includes(decision)) return res.status(400).json({ success: false, message: "Decision must be 'approved' or 'rejected'" });

  try {
    const [result] = await db.query(`UPDATE garland_orders SET approval_status = ? WHERE id = ?`, [decision, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Request not found" });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const [result] = await db.query(`DELETE FROM garland_orders WHERE id = ?`, [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Request not found" });
    res.json({ success: true, message: "Request deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;