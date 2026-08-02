const express = require("express");
const router = express.Router();
const db = require("../db");
const requireUser = require("../middleware/requireUser");

// Public: route info + approved counts, no personal data involved.
router.get("/status", async (req, res) => {
  try {
    const [routes] = await db.query("SELECT * FROM courier_route WHERE id IN (1, 2)");
    const [counts] = await db.query("SELECT route_id, COUNT(*) as count FROM courier_orders WHERE status = 'approved' GROUP BY route_id");
    
    const formattedRoutes = routes.map(route => {
      const routeCount = counts.find(c => c.route_id === route.id);
      return {
        id: route.id,
        from: route.route_from,
        to: route.route_to,
        stops: route.stops, // Added stops field
        approvedCount: routeCount ? routeCount.count : 0
      };
    });

    res.json({ success: true, routes: formattedRoutes });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.post("/", requireUser, async (req, res) => {
  const { 
    route_id, pickup_address, drop_address, needed_by, notes,
    name, email, phone_number, alt_phone_num, 
    building_name, landmark, street, pin_code, city_or_village, state
  } = req.body;
  const user_id = req.userEmail;

  const query = `
    INSERT INTO courier_orders
    (user_id, route_id, pickup_address, drop_address, needed_by, notes, name, email, phone_number, alt_phone_num, building_name, landmark, street, pin_code, city_or_village, state, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
  `;

  try {
    const [result] = await db.query(query, [
      user_id, route_id || 1, pickup_address, drop_address, needed_by, notes || null, name || null, email || null, phone_number || null, alt_phone_num || null, building_name || null, landmark || null, street || null, pin_code || null, city_or_village || null, state || null
    ]);
    res.json({ success: true, order_id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error: " + err.message });
  }
});

router.get("/mine/:user_id", requireUser, async (req, res) => {
  try {
    const [data] = await db.query(`SELECT * FROM courier_orders WHERE user_id = ? ORDER BY id DESC`, [req.userEmail]);
    res.json({ success: true, orders: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
