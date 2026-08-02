// sync-cloudinary-images.js
//
// Purpose: your images are already uploaded to Cloudinary (folders like
// "vegproducts", "flowerproducts", "ads") but your database `image`
// columns were never updated to point at them - so the site shows no
// images. This script does NOT need any local files. It:
//
//   1. Lists every asset actually sitting in each Cloudinary folder
//   2. Tries to match each asset to a database row by comparing the
//      product name to the Cloudinary filename (public_id)
//   3. By default just PRINTS the matches it would make (dry run)
//   4. Only writes to the database when you pass --apply
//
// Usage:
//   node sync-cloudinary-images.js            (dry run - just prints)
//   node sync-cloudinary-images.js --apply    (actually updates the DB)
//
// If a product doesn't auto-match, it prints it under "NO MATCH" so you
// can either rename the file in Cloudinary or update it manually - it
// will never guess and write something wrong to the database.

require("dotenv").config();
const db = require("./db");
const { cloudinary } = require("./config/cloudinary");

const APPLY = process.argv.includes("--apply");

// Map: { database table, Cloudinary folder name }
// Edit these folder names if yours differ from the screenshot.
const TABLE_FOLDER_MAP = [
  { table: "vegetables", folder: "vegproducts" },
  { table: "flowers", folder: "flowerproducts" },
];

// Ads has no "name" column to match against, so it's handled separately
// below (manual review only - ads are position-based, not name-based).
const ADS_FOLDER = "ads";

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // strip spaces, punctuation, underscores, dashes
}

async function listFolderAssets(folder) {
  const assets = [];
  let nextCursor = undefined;

  do {
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: folder + "/",
      max_results: 500,
      next_cursor: nextCursor,
    });
    assets.push(...result.resources);
    nextCursor = result.next_cursor;
  } while (nextCursor);

  return assets;
}

async function syncTable(table, folder) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`SYNCING: ${table}  <-  Cloudinary folder "${folder}"`);
  console.log("=".repeat(60));

  const [rows] = await db.query(`SELECT id, name, image FROM ${table}`);
  const assets = await listFolderAssets(folder);

  console.log(`DB rows: ${rows.length}   Cloudinary assets found: ${assets.length}`);

  if (assets.length === 0) {
    console.log(`⚠️  No assets found in Cloudinary folder "${folder}". Check the folder name.`);
    return;
  }

  // Build a lookup of normalized filename -> asset
  const assetByNormalizedName = new Map();
  for (const asset of assets) {
    // public_id looks like "vegproducts/Tomato_123" - take the part after the folder
    const filename = asset.public_id.split("/").pop();
    assetByNormalizedName.set(normalize(filename), asset);
  }

  let matched = 0;
  let alreadyGood = 0;
  let unmatched = [];

  for (const row of rows) {
    if (row.image && row.image.startsWith("http")) {
      alreadyGood++;
      continue; // already has a working Cloudinary URL, skip
    }

    const key = normalize(row.name);
    const asset = assetByNormalizedName.get(key);

    if (asset) {
      matched++;
      console.log(`  ✅ MATCH: "${row.name}" (id ${row.id})  ->  ${asset.secure_url}`);
      if (APPLY) {
        await db.query(`UPDATE ${table} SET image = ? WHERE id = ?`, [asset.secure_url, row.id]);
      }
    } else {
      unmatched.push(row);
    }
  }

  if (unmatched.length > 0) {
    console.log(`\n  ❌ NO MATCH for ${unmatched.length} item(s) - filename doesn't match product name:`);
    unmatched.forEach(r => console.log(`     - "${r.name}" (id ${r.id}), current image: ${r.image || "(empty)"}`));
    console.log(`\n  Cloudinary filenames available in "${folder}":`);
    assets.forEach(a => console.log(`     - ${a.public_id.split("/").pop()}`));
  }

  console.log(`\nSummary for ${table}: ${matched} matched, ${alreadyGood} already had URLs, ${unmatched.length} unmatched.`);
}

async function reviewAds() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`REVIEWING: ads  <-  Cloudinary folder "${ADS_FOLDER}"`);
  console.log("=".repeat(60));

  const [rows] = await db.query(`SELECT id, image FROM ads`);
  const assets = await listFolderAssets(ADS_FOLDER);

  console.log(`DB rows: ${rows.length}   Cloudinary assets found: ${assets.length}`);
  console.log(`Ads have no name to auto-match by, so review manually:`);
  rows.forEach(r => console.log(`  - ad id ${r.id}, current image: ${r.image || "(empty)"}`));
  console.log(`Available Cloudinary ad assets:`);
  assets.forEach(a => console.log(`  - ${a.secure_url}`));

  if (APPLY) {
    console.log(`\n(Not auto-updating ads - assign these manually via the admin panel's "Update Ad" feature.)`);
  }
}

async function run() {
  console.log(APPLY ? "🚀 Running in APPLY mode - the database WILL be updated." : "🔍 Running in DRY RUN mode - nothing will be written. Add --apply to write changes.");

  for (const { table, folder } of TABLE_FOLDER_MAP) {
    await syncTable(table, folder);
  }

  await reviewAds();

  console.log("\nDone.");
  process.exit(0);
}

run().catch(err => {
  console.error("Sync failed:", err);
  process.exit(1);
});