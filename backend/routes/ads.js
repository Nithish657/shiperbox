const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const [result] = await db.query("SELECT * FROM ads");

    // Cloudinary URLs are already full URLs, no modification needed
    const ads = result.map(ad => ({
      ...ad,
      image: ad.image || null
    }));

    res.json({ success: true, ads });
  } catch (err) {
    console.error("Ads fetch error:", err.message);
    res.json({ success: false, ads: [] });
  }
});

module.exports = router;