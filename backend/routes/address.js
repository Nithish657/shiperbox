const express = require("express");
const router = express.Router();
const db = require("../db");
const requireUser = require("../middleware/requireUser");

// GET: All saved addresses for the logged-in user
router.get("/:user_id", requireUser, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC",
      [req.userEmail]
    );
    res.json({ success: true, addresses: rows });
  } catch (err) {
    console.error("Fetch addresses error:", err.message);
    res.status(500).json({ success: false, addresses: [] });
  }
});

// GET: Default address OR latest order address fallback
router.get("/default/:user_id", requireUser, async (req, res) => {
  const userId = req.userEmail;

  try {
    let address = null;

    try {
      const [rows] = await db.query(
        "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC LIMIT 1",
        [userId]
      );
      if (rows.length > 0) address = rows[0];
    } catch (e) {
      console.error("Address error:", e.message);
    }

    if (!address) {
      try {
        const [orders] = await db.query(
          "SELECT * FROM cart_orders WHERE user_id = ? ORDER BY id DESC LIMIT 1",
          [userId]
        );
        if (orders.length > 0) {
          const o = orders[0];
          address = {
            full_name: o.name || "",
            phone: o.phone_number || "",
            alt_phone: o.alt_phone_num || "",
            building: o.building_name || "",
            street: o.street || "",
            landmark: o.landmark || "",
            city: o.city_or_village || "",
            postal_code: o.pin_code || ""
          };
        }
      } catch (e) {
        console.error("Fallback error:", e.message);
      }
    }

    res.json({ success: true, address });
  } catch (err) {
    res.status(500).json({ success: false, address: null });
  }
});

// POST: Save/update an address for the logged-in user
router.post("/", requireUser, async (req, res) => {
  const {
    label = "Home",
    full_name,
    phone,
    alt_phone,
    building,
    street,
    landmark,
    city,
    postal_code,
    full_address,
    is_default,
  } = req.body;
  const user_id = req.userEmail;

  if (!building || !street || !city || !postal_code) {
    return res.status(400).json({ success: false, message: "Missing required address fields." });
  }

  try {
    if (is_default) {
      await db.query("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [user_id]);
    }

    const sql = `
      INSERT INTO addresses
        (user_id, label, full_name, phone, alt_phone, building, street, landmark, city, postal_code, full_address, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name),
        phone = VALUES(phone),
        alt_phone = VALUES(alt_phone),
        building = VALUES(building),
        street = VALUES(street),
        landmark = VALUES(landmark),
        city = VALUES(city),
        postal_code = VALUES(postal_code),
        full_address = VALUES(full_address),
        is_default = VALUES(is_default)
    `;

    await db.query(sql, [
      user_id,
      label,
      full_name || null,
      phone || null,
      alt_phone || null,
      building,
      street,
      landmark || null,
      city,
      postal_code,
      full_address || `${building}, ${street}, ${city} - ${postal_code}`,
      is_default ? 1 : 0,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("Save address error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT: Mark an address as default
// Previously this trusted req.body.user_id AND set is_default=1 on any
// address id with no ownership check at all - so anyone could, e.g., mark
// a different user's address row as their own default. Both are now
// scoped to the authenticated user.
router.put("/:id/default", requireUser, async (req, res) => {
  const user_id = req.userEmail;
  try {
    await db.query("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [user_id]);
    const [result] = await db.query(
      "UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, user_id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE: Delete a saved address
// Previously this deleted by id alone with no ownership check - anyone
// could delete any user's address just by guessing/incrementing an id.
router.delete("/:id", requireUser, async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM addresses WHERE id = ? AND user_id = ?",
      [req.params.id, req.userEmail]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
