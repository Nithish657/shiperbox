// migrate-to-cloudinary.js
// Updated with better path detection

const db = require("./db");
const { uploadToCloudinary } = require("./config/cloudinary");
const fs = require("fs");
const path = require("path");

// Function to find image file in multiple locations
function findImageFile(imagePath, itemName) {
    console.log(`  🔍 Looking for: ${imagePath}`);
    
    // Try different possible locations
    const possiblePaths = [
        // 1. As stored in DB (relative path)
        imagePath,
        
        // 2. Full path from backend root
        path.join(__dirname, imagePath),
        
        // 3. Just the filename in uploads folder
        path.join(__dirname, "uploads", path.basename(imagePath)),
        
        // 4. Just the filename in root
        path.join(__dirname, path.basename(imagePath)),
        
        // 5. Check if the file exists elsewhere
        path.join(__dirname, "uploads", imagePath.replace("uploads/", "")),
    ];
    
    // Also check if there's a similar file with different extension
    const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.JPG', '.JPEG', '.PNG'];
    
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            console.log(`  ✅ Found at: ${p}`);
            return p;
        }
    }
    
    // Try with different extensions
    const baseName = path.basename(imagePath, path.extname(imagePath));
    for (const ext of extensions) {
        const testPath = path.join(__dirname, "uploads", baseName + ext);
        if (fs.existsSync(testPath)) {
            console.log(`  ✅ Found at: ${testPath}`);
            return testPath;
        }
    }
    
    console.log(`  ❌ Not found in any location`);
    return null;
}

async function migrateAllImages() {
    console.log("🚀 Starting full migration to Cloudinary...\n");
    console.log(`📁 Current directory: ${__dirname}\n`);
    
    // List what's in the uploads folder
    try {
        const files = fs.readdirSync(path.join(__dirname, "uploads"));
        console.log(`📂 Found ${files.length} files in uploads folder`);
        console.log(`   Sample: ${files.slice(0, 5).join(', ')}...\n`);
    } catch (err) {
        console.log(`⚠️ Uploads folder not found or empty\n`);
    }
    
    let stats = {
        total: 0,
        migrated: 0,
        failed: 0,
        skipped: 0
    };

    try {
        // 1. MIGRATE VEGETABLES
        console.log("📦 Migrating vegetables...");
        const [veg] = await db.query("SELECT id, name, image FROM vegetables WHERE image IS NOT NULL");
        console.log(`Found ${veg.length} vegetables to process\n`);
        
        for (const item of veg) {
            stats.total++;
            if (item.image && !item.image.startsWith("http")) {
                console.log(`\n${stats.total}. ${item.name}:`);
                const localPath = findImageFile(item.image, item.name);
                
                if (localPath) {
                    console.log(`  ⬆️ Uploading to Cloudinary...`);
                    const result = await uploadToCloudinary(localPath, "products/vegetables");
                    if (result) {
                        await db.query("UPDATE vegetables SET image = ? WHERE id = ?", [result.secure_url, item.id]);
                        console.log(`  ✅ ${item.name} migrated successfully!`);
                        stats.migrated++;
                    } else {
                        console.log(`  ❌ ${item.name} upload failed`);
                        stats.failed++;
                    }
                } else {
                    console.log(`  ❌ ${item.name} - file not found`);
                    stats.failed++;
                }
            } else {
                console.log(`  ⏭️ ${item.name} - already Cloudinary URL`);
                stats.skipped++;
            }
        }

        // 2. MIGRATE FLOWERS
        console.log("\n🌺 Migrating flowers...");
        const [flowers] = await db.query("SELECT id, name, image FROM flowers WHERE image IS NOT NULL");
        console.log(`Found ${flowers.length} flowers to process\n`);
        
        for (const item of flowers) {
            stats.total++;
            if (item.image && !item.image.startsWith("http")) {
                console.log(`\n${stats.total}. ${item.name}:`);
                const localPath = findImageFile(item.image, item.name);
                
                if (localPath) {
                    console.log(`  ⬆️ Uploading to Cloudinary...`);
                    const result = await uploadToCloudinary(localPath, "products/flowers");
                    if (result) {
                        await db.query("UPDATE flowers SET image = ? WHERE id = ?", [result.secure_url, item.id]);
                        console.log(`  ✅ ${item.name} migrated successfully!`);
                        stats.migrated++;
                    } else {
                        console.log(`  ❌ ${item.name} upload failed`);
                        stats.failed++;
                    }
                } else {
                    console.log(`  ❌ ${item.name} - file not found`);
                    stats.failed++;
                }
            } else {
                console.log(`  ⏭️ ${item.name} - already Cloudinary URL`);
                stats.skipped++;
            }
        }

        // 3. MIGRATE ADS
        console.log("\n📢 Migrating ads...");
        const [ads] = await db.query("SELECT id, image FROM ads WHERE image IS NOT NULL");
        console.log(`Found ${ads.length} ads to process\n`);
        
        for (const ad of ads) {
            stats.total++;
            if (ad.image && !ad.image.startsWith("http")) {
                console.log(`\n${stats.total}. Ad ${ad.id}:`);
                const localPath = findImageFile(ad.image, `ad-${ad.id}`);
                
                if (localPath) {
                    console.log(`  ⬆️ Uploading to Cloudinary...`);
                    const result = await uploadToCloudinary(localPath, "ads");
                    if (result) {
                        await db.query("UPDATE ads SET image = ? WHERE id = ?", [result.secure_url, ad.id]);
                        console.log(`  ✅ Ad ${ad.id} migrated successfully!`);
                        stats.migrated++;
                    } else {
                        console.log(`  ❌ Ad ${ad.id} upload failed`);
                        stats.failed++;
                    }
                } else {
                    console.log(`  ❌ Ad ${ad.id} - file not found`);
                    stats.failed++;
                }
            } else {
                console.log(`  ⏭️ Ad ${ad.id} - already Cloudinary URL`);
                stats.skipped++;
            }
        }

        // 4. MIGRATE GARLAND ORDERS
        console.log("\n🌿 Migrating garland orders...");
        const [garlands] = await db.query("SELECT id, reference_image FROM garland_orders WHERE reference_image IS NOT NULL");
        console.log(`Found ${garlands.length} garland orders to process\n`);
        
        for (const garland of garlands) {
            stats.total++;
            if (garland.reference_image && !garland.reference_image.startsWith("http")) {
                console.log(`\n${stats.total}. Garland ${garland.id}:`);
                const localPath = findImageFile(garland.reference_image, `garland-${garland.id}`);
                
                if (localPath) {
                    console.log(`  ⬆️ Uploading to Cloudinary...`);
                    const result = await uploadToCloudinary(localPath, "garlands");
                    if (result) {
                        await db.query("UPDATE garland_orders SET reference_image = ? WHERE id = ?", [result.secure_url, garland.id]);
                        console.log(`  ✅ Garland ${garland.id} migrated successfully!`);
                        stats.migrated++;
                    } else {
                        console.log(`  ❌ Garland ${garland.id} upload failed`);
                        stats.failed++;
                    }
                } else {
                    console.log(`  ❌ Garland ${garland.id} - file not found`);
                    stats.failed++;
                }
            } else {
                console.log(`  ⏭️ Garland ${garland.id} - already Cloudinary URL`);
                stats.skipped++;
            }
        }

        // SUMMARY
        console.log("\n" + "=".repeat(50));
        console.log("📊 MIGRATION SUMMARY");
        console.log("=".repeat(50));
        console.log(`Total images processed: ${stats.total}`);
        console.log(`✅ Successfully migrated: ${stats.migrated}`);
        console.log(`❌ Failed: ${stats.failed}`);
        console.log(`⏭️ Skipped (already in Cloudinary): ${stats.skipped}`);
        console.log("=".repeat(50));

        if (stats.failed === 0) {
            console.log("\n🎉 All images migrated successfully!");
            console.log("📁 You can now delete the 'uploads' folder to save space.");
            console.log("💡 To delete: rmdir /s uploads (Windows) or rm -rf uploads (Mac/Linux)");
        } else {
            console.log(`\n⚠️ ${stats.failed} images failed. Check the logs above.`);
            console.log("💡 You can manually upload these to Cloudinary via the dashboard.");
            console.log("💡 Or check if the images are in a different location.");
        }

    } catch (err) {
        console.error("❌ Migration error:", err);
    }
}

migrateAllImages();