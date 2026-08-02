const express = require("express");
const router = express.Router();
const db = require("../db");
const requireUser = require("../middleware/requireUser");

// POST: Standard order dispatch
router.post("/dispatch", requireUser, async (req, res) => {
  const { zone_name, total_bill, order_type } = req.body;
  const user_id = req.userEmail;

  const query = `INSERT INTO orders
    (user_id, order_type, drop_address, total_price, status)
    VALUES (?, ?, ?, ?, 'pending')`;

  try {
    const [result] = await db.query(query, [user_id, order_type || "bulk_veg", zone_name, total_bill]);
    res.json({ success: true, order_id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: "Dispatch failed: " + err.message });
  }
});

// Builds one unified delivery-address string regardless of which table the order came from
function buildAddress(order) {
  if (order.order_type === "cart") {
    return order.drop_address || null;
  }
  if (order.order_type === "courier") {
    const parts = [];
    if (order.pickup_address) parts.push(`Pickup: ${order.pickup_address}`);
    if (order.drop_address) parts.push(`Drop: ${order.drop_address}`);
    return parts.length ? parts.join(" | ") : null;
  }
  if (order.order_type === "garland") {
    const parts = [
      order.building_name,
      order.street,
      order.landmark,
      order.city_or_village,
      order.state,
      order.pin_code,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }
  // bulk_veg / orders table
  return order.drop_address || null;
}

// Parses the item list a cart order stored in its `notes` column at checkout time
// (cart.js checkout stores JSON.stringify({ contact, items }) in `notes`).
function extractCartItems(order) {
  if (order.order_type !== "cart" || !order.notes) return [];
  try {
    const parsed = JSON.parse(order.notes);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch (e) {
    // Older orders may have plain-text notes instead of JSON — no structured items available
    return [];
  }
}

// GET: Fetch a user's order history across all tables
router.get("/:user_id", requireUser, async (req, res) => {
  try {
    const userId = req.userEmail;

    const [cart] = await db.query(`SELECT *, 'cart' AS order_type FROM cart_orders WHERE user_id = ?`, [userId]);
    const [garland] = await db.query(`SELECT *, 'garland' AS order_type FROM garland_orders WHERE user_id = ?`, [userId]);
    const [courier] = await db.query(`SELECT *, 'courier' AS order_type FROM courier_orders WHERE user_id = ?`, [userId]);
    const [bulkVeg] = await db.query(`SELECT * FROM orders WHERE user_id = ?`, [userId]);

    // Combine and sort by newest first.
    // NOTE: 'id' is NOT comparable across tables — cart_orders, garland_orders,
    // courier_orders, and orders each have their own independent auto-increment
    // sequence, so sorting by id mixes up chronology across order types.
    // Sort by the actual timestamp instead.
    const data = [...cart, ...garland, ...courier, ...bulkVeg].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    const mappedOrders = data.map((order) => {
      let mapped = { ...order };

      if (mapped.approval_status === "rejected") {
        mapped.status = "rejected";
      } else if (mapped.order_type === "garland" && mapped.approval_status === "approved") {
        mapped.status = "approved";
      }

      mapped.address = buildAddress(mapped);
      mapped.items = extractCartItems(mapped);

      return mapped;
    });

    res.json({ success: true, orders: mappedOrders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;