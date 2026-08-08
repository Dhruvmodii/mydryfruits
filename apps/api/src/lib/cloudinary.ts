import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config";

const cloudinaryConfigured = Boolean(
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

function extFromMime(mime: string) {
  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("svg")) return ".svg";
  return ".jpg";
}

async function saveToDisk(buffer: Buffer, mime = "image/jpeg") {
  const year = new Date().getFullYear().toString();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const dir = path.join(env.uploadDir, year, month);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${randomUUID()}${extFromMime(mime)}`;
  const fullPath = path.join(dir, filename);
  await fs.promises.writeFile(fullPath, buffer);
  const relative = `/uploads/${year}/${month}/${filename}`;
  return {
    url: `${env.publicApiUrl}${relative}`,
    publicId: relative,
  };
}

async function saveToCloudinary(buffer: Buffer, folder = "mydryfruits") {
  return new Promise<{ url: string; publicId: string | null }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => {
        if (err || !result) return reject(err || new Error("Upload failed"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Stores uploads on local disk (default) or Cloudinary when UPLOAD_DRIVER=cloudinary.
 * Never stores base64 data-URLs in production.
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  folder = "mydryfruits",
  mime = "image/jpeg"
) {
  const driver = env.uploadDriver;

  if (driver === "cloudinary") {
    if (!cloudinaryConfigured) {
      throw new Error(
        "UPLOAD_DRIVER=cloudinary but CLOUDINARY_* env vars are missing"
      );
    }
    return saveToCloudinary(buffer, folder);
  }

  // local disk (EC2 production default)
  return saveToDisk(buffer, mime);
}

export { cloudinaryConfigured };
