const express = require("express");
const router = express.Router();
const db = require("../db");
const Fuse = require("fuse.js"); // Requires npm install fuse.js

router.get("/", async (req, res) => {
  let query = req.query.q;
  if (!query) return res.json({ success: true, items: [] });

  query = query.toString().trim();

  // Fetch ALL items into memory to perform a fuzzy search across the catalog
  const sql = `
    SELECT id, name, price, image, quantity AS unit, 'vegetables' AS category FROM vegetables 
    UNION
    SELECT id, name, price, image, quantity AS unit, 'flowers' AS category FROM flowers
  `;

  try {
    const [data] = await db.query(sql);

    // Configure Fuse.js for fuzzy matching (typo tolerance)
    const fuse = new Fuse(data, {
      keys: ["name"],
      threshold: 0.4, // 0.0 is an exact match, 1.0 matches anything. 0.4 allows for typical typos (e.g., "potata" -> "potato")
      distance: 100,
      ignoreLocation: true,
    });

    // Run the search
    const results = fuse.search(query);
    
    // Fuse returns an array of objects like { item: {...}, score: ... }. 
    // We just want to extract the actual items to send to the frontend.
    const matchedItems = results.map(result => result.item);

    res.json({ success: true, items: matchedItems });
  } catch (err) {
    console.error("Search error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;