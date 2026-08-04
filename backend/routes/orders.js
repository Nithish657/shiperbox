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
function extractCartItems(order) {
  if (order.order_type !== "cart" || !order.notes) return [];
  try {
    const parsed = JSON.parse(order.notes);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch (e) {
    return [];
  }
}

// GET: Fetch a user's order history across all tables
router.get("/:user_id", requireUser, async (req, res) => {
  try {
    const userId = req.userEmail;

    // Use Promise.all to fetch all orders concurrently for faster loading
    const [cartRes, garlandRes, courierRes, bulkVegRes] = await Promise.all([
      db.query(`SELECT *, 'cart' AS order_type FROM cart_orders WHERE user_id = ?`, [userId]),
      db.query(`SELECT *, 'garland' AS order_type FROM garland_orders WHERE user_id = ?`, [userId]),
      db.query(`SELECT *, 'courier' AS order_type FROM courier_orders WHERE user_id = ?`, [userId]),
      db.query(`SELECT * FROM orders WHERE user_id = ?`, [userId])
    ]);

    // Combine all orders and sort by newest first (handling potential missing timestamps gracefully)
    const data = [...cartRes[0], ...garlandRes[0], ...courierRes[0], ...bulkVegRes[0]].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
      return dateB - dateA;
    });

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