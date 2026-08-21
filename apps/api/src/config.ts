import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load monorepo root .env (works from src/ and dist/)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const isProd = nodeEnv === "production";

const jwtSecret = process.env.JWT_SECRET || "";
if (isProd) {
  if (!jwtSecret || jwtSecret === "dev-secret-change-me" || jwtSecret.length < 32) {
    console.error(
      "[fatal] JWT_SECRET must be set to a strong random value (32+ chars) in production"
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("[fatal] DATABASE_URL is required in production");
    process.exit(1);
  }
  if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN.includes("localhost")) {
    console.warn(
      "[warn] CORS_ORIGIN should be your public site URL in production (not localhost)"
    );
  }
}

const defaultUploadDir = path.resolve(__dirname, "../uploads");
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : defaultUploadDir;

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv,
  isProd,
  jwtSecret: jwtSecret || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  /** Public API base URL used for absolute upload links */
  publicApiUrl: (process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://localhost:${process.env.PORT || 4000}`).replace(
    /\/$/,
    ""
  ),
  siteUrl: (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.CORS_ORIGIN || "http://localhost:3000").replace(
    /\/$/,
    ""
  ),
  paymentsEnabled: process.env.PAYMENTS_ENABLED === "true",
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  /** local | cloudinary — local stores files on disk under UPLOAD_DIR */
  uploadDriver: (process.env.UPLOAD_DRIVER ||
    (process.env.CLOUDINARY_CLOUD_NAME ? "cloudinary" : "local")) as "local" | "cloudinary",
  uploadDir,
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "MyDryFruits <orders@mydryfruits.com>",
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || "",
    fromEmail: process.env.SENDGRID_FROM_EMAIL || "",
    fromName: process.env.SENDGRID_FROM_NAME || "MyDryFruits",
  },
  adminEmail: process.env.ADMIN_EMAIL || "admin@dhruvmodi.online",
  trustProxy: process.env.TRUST_PROXY !== "false",
};
