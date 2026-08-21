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
    const publicApi = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(
      /\/$/,
      ""
    );
    const internalApi = (
      process.env.INTERNAL_API_URL ||
      publicApi ||
      "http://127.0.0.1:4000"
    ).replace(/\/$/, "");
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
    const sameOrigin = !publicApi || publicApi === siteUrl;
    // Local next dev has no Nginx — always proxy /api to Express
    const shouldProxyApi = sameOrigin || process.env.NODE_ENV === "development";
    const apiDest = shouldProxyApi ? internalApi : publicApi;

    return [
      { source: "/sitemap.xml", destination: `${apiDest}/sitemap.xml` },
      { source: "/robots.txt", destination: `${apiDest}/robots.txt` },
      ...(shouldProxyApi
        ? [
            { source: "/api/:path*", destination: `${internalApi}/api/:path*` },
            { source: "/uploads/:path*", destination: `${internalApi}/uploads/:path*` },
            { source: "/health", destination: `${internalApi}/health` },
          ]
        : []),
    ];
  },
};

export default nextConfig;
