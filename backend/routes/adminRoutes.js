const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const requireAdmin = require("../middleware/adminAuth"); 
const { uploadBufferToCloudinary } = require("../config/cloudinary");

const ALLOWED_CATEGORIES = ["vegetables", "flowers"];

router.use(requireAdmin);

// USE MEMORY STORAGE FOR RENDER COMPATIBILITY
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype);
    cb(ok ? null : new Error("Only image files are allowed"), ok);
  },
});

// Update item with Cloudinary (Memory Buffer)
router.put("/update-item/:category/:id", upload.single("image"), async (req, res) => {
  try {
    const { category, id } = req.params;
    const { name, price, stock, subcategory, quantity } = req.body;

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }
    if (!name || price === undefined || price === null || isNaN(Number(price))) {
      return res.status(400).json({ success: false, message: "Valid name and price required" });
    }
    if (stock === undefined || stock === null || isNaN(Number(stock)) || Number(stock) < 0) {
      return res.status(400).json({ success: false, message: "Valid stock quantity required" });
    }

    const finalSubcategory = subcategory || "Fresh vegetables";
    const finalQuantity = quantity || "";

    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, `products/${category}`);
      if (!result) return res.status(500).json({ success: false, message: "Failed to upload to Cloudinary" });

      const newImageUrl = result.secure_url;

      const [updateResult] = await db.execute(
        `UPDATE ${category} SET name = ?, price = ?, stock = ?, image = ?, subcategory = ?, quantity = ? WHERE id = ?`,
        [name, Number(price), Number(stock), newImageUrl, finalSubcategory, finalQuantity, id]
      );

      if (updateResult.affectedRows === 0) return res.status(404).json({ success: false, message: "Item not found" });
      return res.json({ success: true, message: "Updated successfully", image: newImageUrl });
    }

    const [result] = await db.execute(
      `UPDATE ${category} SET name = ?, price = ?, stock = ?, subcategory = ?, quantity = ? WHERE id = ?`,
      [name, Number(price), Number(stock), finalSubcategory, finalQuantity, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Item not found" });
    res.json({ success: true, message: "Updated successfully" });
  } catch (err) {
    console.error("Admin update-item error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Add a new item with Cloudinary (Memory Buffer)
router.post("/add-item/:category", upload.single("image"), async (req, res) => {
  try {
    const { category } = req.params;
    const { name, price, stock, subcategory, quantity } = req.body;

    if (!ALLOWED_CATEGORIES.includes(category)) return res.status(400).json({ success: false, message: "Invalid category" });
    if (!name || price === undefined || price === null || isNaN(Number(price))) return res.status(400).json({ success: false, message: "Valid name and price required" });
    if (stock === undefined || stock === null || isNaN(Number(stock)) || Number(stock) < 0) return res.status(400).json({ success: false, message: "Valid stock quantity required" });
    if (!req.file) return res.status(400).json({ success: false, message: "Image is required" });

    const result = await uploadBufferToCloudinary(req.file.buffer, `products/${category}`);
    if (!result) return res.status(500).json({ success: false, message: "Failed to upload to Cloudinary" });

    const imageUrl = result.secure_url;
    const finalSubcategory = subcategory || "Fresh vegetables";
    const finalQuantity = quantity || "";

    const [dbResult] = await db.execute(
      `INSERT INTO ${category} (name, price, stock, image, subcategory, quantity) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, Number(price), Number(stock), imageUrl, finalSubcategory, finalQuantity]
    );

    res.json({
      success: true,
      message: "Item added",
      item: { id: dbResult.insertId, name, price: Number(price), stock: Number(stock), image: imageUrl, subcategory: finalSubcategory, quantity: finalQuantity },
    });
  } catch (err) {
    console.error("Admin add-item error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/delete-item/:category/:id", async (req, res) => {
  try {
    const { category, id } = req.params;
    if (!ALLOWED_CATEGORIES.includes(category)) return res.status(400).json({ success: false, message: "Invalid category" });

    const [result] = await db.execute(`DELETE FROM ${category} WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Item not found" });
    res.json({ success: true, message: "Item deleted successfully" });
  } catch (err) {
    console.error("Admin delete-item error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Add a new Ad Banner
router.post("/add-ad", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Image is required" });

    const result = await uploadBufferToCloudinary(req.file.buffer, "ads");
    if (!result) return res.status(500).json({ success: false, message: "Failed to upload to Cloudinary" });

    const imageUrl = result.secure_url;
    const [dbResult] = await db.execute(`INSERT INTO ads (image) VALUES (?)`, [imageUrl]);

    res.json({ success: true, message: "Ad added successfully", ad: { id: dbResult.insertId, image: imageUrl } });
  } catch (err) {
    console.error("Admin add-ad error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/delete-ad/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute(`DELETE FROM ads WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Ad not found" });
    res.json({ success: true, message: "Ad deleted successfully" });
  } catch (err) {
    console.error("Admin delete-ad error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Grocery Admin Routes
const VALID_GROCERY_STATUSES = ["pending", "transit", "done", "rejected"];

router.get("/grocery/:filter", async (req, res) => {
  const { filter } = req.params;
  try {
    let query = "SELECT * FROM cart_orders";
    if (filter === "pending") query += " WHERE status = 'pending'";
    query += " ORDER BY id DESC";

    const [requests] = await db.query(query);
    res.json({ success: true, requests });
  } catch (err) {
    console.error("Admin grocery fetch error:", err.message);
    res.status(500).json({ success: false, message: "Database error: " + err.message });
  }
});

router.put("/grocery/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_GROCERY_STATUSES.includes(status)) return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_GROCERY_STATUSES.join(", ")}` });

  try {
    const [result] = await db.query("UPDATE cart_orders SET status = ? WHERE id = ?", [status, id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, message: "Status updated successfully" });
  } catch (err) {
    console.error("Admin grocery status update error:", err.message);
    res.status(500).json({ success: false, message: "Database error: " + err.message });
  }
});

router.delete("/grocery/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("DELETE FROM cart_orders WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Grocery order not found" });
    res.json({ success: true, message: "Grocery order deleted successfully" });
  } catch (err) {
    console.error("Admin grocery delete error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;