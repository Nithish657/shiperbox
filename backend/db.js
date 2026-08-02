const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Added to fight ECONNRESET from idle/dropped connections against
  // TiDB Cloud: keeps the TCP connection alive so it's less likely to be
  // silently dropped, and fails fast on a truly dead connection attempt
  // instead of hanging.
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 20000
});

// Surfaces pool-level errors (e.g. a connection dying in the pool) instead
// of letting them fail silently or crash the process.
db.on("error", (err) => {
  console.error("MySQL pool error:", err.code || err.message);
});

// Verification check
(async () => {
  try {
    const connection = await db.getConnection();
    console.log("✅ MySQL Pool Connected to TiDB Cloud with SSL");
    connection.release();
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
  }
})();

module.exports = db;