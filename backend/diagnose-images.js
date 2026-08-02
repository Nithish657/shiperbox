// diagnose-images.js
// Run once with: node diagnose-images.js
// Prints (1) what your DB actually stores in the `image` columns, and
// (2) what actually exists in your Cloudinary account right now.
// Paste the full output back so the exact fix can be pinpointed.

const db = require("./db");
const { cloudinary } = require("./config/cloudinary");

async function checkTable(tableName, limit = 5) {
  console.log(`\n=== ${tableName} (first ${limit} rows) ===`);
  try {
    const [rows] = await db.query(`SELECT id, name, image FROM ${tableName} LIMIT ?`, [limit]);
    if (rows.length === 0) {
      console.log("  (no rows found)");
      return;
    }
    rows.forEach(r => {
      const isCloudinary = r.image && r.image.startsWith("http");
      console.log(`  id=${r.id} name="${r.name}"`);
      console.log(`    image = ${JSON.stringify(r.image)}`);
      console.log(`    looks like: ${isCloudinary ? "✅ Cloudinary URL" : "❌ NOT a URL (old path / null / broken)"}`);
    });
  } catch (err) {
    console.log(`  ⚠️ Could not query ${tableName}: ${err.message}`);
  }
}

async function listCloudinaryFolder(folder) {
  console.log(`\n=== Cloudinary folder: ${folder} ===`);
  try {
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: folder,
      max_results: 30,
    });
    if (result.resources.length === 0) {
      console.log("  (empty - no assets found under this prefix)");
      return;
    }
    result.resources.forEach(r => {
      console.log(`  ${r.public_id}  ->  ${r.secure_url}`);
    });
    console.log(`  Total in this folder: ${result.resources.length}`);
  } catch (err) {
    console.log(`  ⚠️ Could not list folder "${folder}": ${err.message}`);
  }
}

async function run() {
  console.log("🔍 DATABASE CHECK");
  await checkTable("vegetables");
  await checkTable("flowers");
  await checkTable("ads");

  console.log("\n\n🔍 CLOUDINARY CHECK");
  // Update these to match your actual folder names if different
  await listCloudinaryFolder("products/vegetables");
  await listCloudinaryFolder("products/flowers");
  await listCloudinaryFolder("vegproducts");
  await listCloudinaryFolder("flowerproducts");
  await listCloudinaryFolder("ads");
  await listCloudinaryFolder("garlands");

  console.log("\n\nDone. Paste this whole output back.");
  process.exit(0);
}

run().catch(err => {
  console.error("Diagnostic script failed:", err);
  process.exit(1);
});
