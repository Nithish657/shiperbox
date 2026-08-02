// Run ONCE to convert plaintext passwords already sitting in the `admin`
// table into bcrypt hashes. After this runs successfully, admins log in
// with their ORIGINAL plaintext password — bcrypt.compare checks it
// against the new hash, they don't need a new password.
//
// Usage:  node hash-existing-passwords.js
//
// Safe to re-run: it skips any row whose password already looks like a
// bcrypt hash (starts with $2a$ / $2b$ / $2y$).

const bcrypt = require("bcryptjs");
const db = require("./db");

async function run() {
  const [rows] = await db.execute("SELECT id, password FROM admins");

  for (const row of rows) {
    if (/^\$2[aby]\$/.test(row.password)) {
      console.log(`Row ${row.id}: already hashed, skipping.`);
      continue;
    }
    const newHash = await bcrypt.hash(row.password, 10);
    await db.execute("UPDATE admins SET password = ? WHERE id = ?", [newHash, row.id]);
    console.log(`Row ${row.id}: password hashed.`);
  }

  console.log("Done.");
  process.exit(0);
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});