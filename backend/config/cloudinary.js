require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET,
  secure: true,
});

if (!cloudinary.config().cloud_name || !cloudinary.config().api_key || !cloudinary.config().api_secret) {
  console.error(
    "⚠️ Cloudinary config is missing values. Expected CLOUDINARY_CLOUD_NAME/CLOUD_NAME, " +
    "CLOUDINARY_API_KEY/API_KEY, CLOUDINARY_API_SECRET/API_SECRET in your .env file."
  );
}

// Helper function to upload local files to Cloudinary (Legacy)
const uploadToCloudinary = async (localFilePath, folder = "products") => {
  try {
    if (!localFilePath) return null;

    const result = await cloudinary.uploader.upload(localFilePath, {
      folder: folder,
      resource_type: "auto",
    });

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return result;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

// Memory Buffer Uploader (Render Container Safe)
const uploadBufferToCloudinary = (fileBuffer, folder = "products") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: "auto" },
      (error, result) => {
        if (error) {
          console.error("Cloudinary buffer upload error:", error);
          return resolve(null);
        }
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

module.exports = { cloudinary, uploadToCloudinary, uploadBufferToCloudinary };