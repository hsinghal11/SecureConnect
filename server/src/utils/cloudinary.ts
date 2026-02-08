import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import fs from "fs/promises";
import path from "path";
import logger from "./logger";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/**
 * Uploads a file from local path to Cloudinary
 * @param localPath - Path to the file to be uploaded
 * @returns Cloudinary Upload Response or null
 */
const uploadOnCloudinary = async (localPath: string): Promise<UploadApiResponse | null> => {
  try {
    if (!localPath) {
      logger.error("File path is missing.");
      return null;
    }

    const response = await cloudinary.uploader.upload(localPath, {
      resource_type: "auto",
      folder: "youtube-backend",
      use_filename: true,
    });

    // Clean up local file
    await fs.unlink(localPath);

    logger.info(`Uploaded to Cloudinary: ${response.secure_url}`);
    return response;
  } catch (error) {
    logger.error(`Cloudinary upload failed: ${error}`);

    // Try to delete file if it exists
    try {
      if (localPath && (await fs.stat(localPath))) {
        await fs.unlink(localPath);
      }
    } catch (cleanupError) {
      logger.error(`Failed to remove file: ${cleanupError}`);
    }

    return null;
  }
};

export { uploadOnCloudinary };
