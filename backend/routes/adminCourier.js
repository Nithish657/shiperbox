const express = require("express");
const router = express.Router();
const db = require("../db");
const requireAdmin = require("../middleware/adminAuth");

router.use(requireAdmin);

const VALID_DECISIONS = ["approved", "rejected"];

router.get("/:filter", async (req, res) => {
  const { filter } = req.params;
  try {
    let query = "SELECT * FROM courier_orders";
    if (filter === "pending") query += " WHERE status = 'pending'";
    query += " ORDER BY id DESC";

    const [requests] = await db.query(query);
    const [routes] = await db.query("SELECT * FROM courier_route WHERE id IN (1, 2)");

    res.json({ success: true, requests, routes });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error: " + err.message });
  }
});

router.put("/update-route", async (req, res) => {
  const { id, route_from, route_to, stops } = req.body;
  if (!id || !route_from || !route_to) return res.status(400).json({ success: false, message: "Route ID and addresses are required" });

  try {
    // Updated query to handle saving stops
    await db.query("UPDATE courier_route SET route_from = ?, route_to = ?, stops = ? WHERE id = ?", [route_from, route_to, stops || '', id]);
    await db.query("UPDATE courier_orders SET status = 'completed' WHERE status = 'approved' AND route_id = ?", [id]);

    res.json({ success: true, message: `Route ${id} updated and its tracker reset to 0!` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/:id/review", async (req, res) => {
  const { id } = req.params;
  const { decision } = req.body;

  if (!VALID_DECISIONS.includes(decision)) return res.status(400).json({ success: false, message: `Invalid decision` });

  try {
    const [result] = await db.query("UPDATE courier_orders SET status = ? WHERE id = ?", [decision, id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, message: `Request updated to ${decision}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM courier_orders WHERE id = ?", [id]);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;