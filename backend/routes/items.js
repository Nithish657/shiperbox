const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/:category", async (req, res) => {
  const category = req.params.category;
  if (category !== 'vegetables' && category !== 'flowers') {
    return res.status(400).json({ success: false, message: "Invalid category" });
  }

  try {
    const [data] = await db.query(`SELECT * FROM ${category}`);
    res.json({ success: true, items: data });
  } catch (err) {
    console.error(`❌ DB Error in ${category}:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;