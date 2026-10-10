const cloudinary = require("../config/cloudinary");

// Uploads a local file buffer/path to Cloudinary and returns the secure URL.
// Used for thumbnails, lesson resources, and generated certificates.
async function uploadToCloudinary(filePath, folder = "eduplatform") {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn("[upload] Cloudinary not configured, returning local path as placeholder.");
    return { url: filePath, publicId: null };
  }
  const result = await cloudinary.uploader.upload(filePath, { folder });
  return { url: result.secure_url, publicId: result.public_id };
}

module.exports = { uploadToCloudinary };
