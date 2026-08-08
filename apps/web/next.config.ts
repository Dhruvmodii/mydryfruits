import type { NextConfig } from "next";
import path from "path";
import { config as loadEnv } from "dotenv";

// Load monorepo root .env so NEXT_PUBLIC_* work during `next build` on EC2
loadEnv({ path: path.resolve(__dirname, "../../.env") });
loadEnv({ path: path.resolve(__dirname, ".env.local") });

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return [
      { source: "/sitemap.xml", destination: `${api}/sitemap.xml` },
      { source: "/robots.txt", destination: `${api}/robots.txt` },
    ];
  },
};

export default nextConfig;
