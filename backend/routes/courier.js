const express = require("express");
const router = express.Router();
const db = require("../db");
const axios = require("axios");
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

async function sendCourierEmail(order) {
  try {
    const {
      route_id, pickup_address, drop_address, needed_by, notes,
      name, email, phone_number, alt_phone_num,
      building_name, landmark, street, pin_code, city_or_village, state,
      user_id,
    } = order;

    const formattedDate = needed_by ? new Date(needed_by).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "-";
    const fullAddress = `${building_name || ""}, ${street || ""}, ${landmark ? landmark + ", " : ""}${city_or_village || ""}${state ? ", " + state : ""}${pin_code ? " - " + pin_code : ""}`;

    const htmlContent = `
      <div style="font-family: sans-serif; color: #222; max-width: 600px;">
        <h2 style="color: #0c831f;">New Courier Order! 📦</h2>
        <table width="100%" style="border-collapse: collapse; margin-bottom: 20px;">
          <tr><td style="padding:6px 0;"><strong>Route ID:</strong></td><td>${route_id || 1}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Needed By:</strong></td><td>${formattedDate}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Pickup Address:</strong></td><td>${pickup_address || "-"}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Drop Address:</strong></td><td>${drop_address || "-"}</td></tr>
        </table>
        <h4 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Contact Details:</h4>
        <p><strong>Name:</strong> ${name || "-"}</p>
        <p><strong>Email:</strong> ${email || "-"}</p>
        <p><strong>Phone:</strong> +91 ${phone_number || "-"}</p>
        <p><strong>Alt Phone:</strong> +91 ${alt_phone_num || "-"}</p>
        <p><strong>Customer Account:</strong> +${user_id}</p>
        <h4 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Address on File:</h4>
        <p>${fullAddress}</p>
        <h4 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Notes:</h4>
        <p>${notes || "-"}</p>
      </div>
    `;

    const brevoPayload = {
      sender: { name: "Courier Orders App", email: "shiperbox@gmail.com" },
      to: [{ email: "shiperbox@gmail.com", name: "Admin" }],
      subject: "New Courier Order",
      htmlContent: htmlContent,
    };

    await axios.post("https://api.brevo.com/v3/smtp/email", brevoPayload, {
      headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" }
    });
  } catch (emailErr) {
    console.error("Courier email failed to send:", emailErr.response?.data || emailErr.message);
  }
}

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

    sendCourierEmail({
      route_id, pickup_address, drop_address, needed_by, notes,
      name, email, phone_number, alt_phone_num,
      building_name, landmark, street, pin_code, city_or_village, state,
      user_id,
    });

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