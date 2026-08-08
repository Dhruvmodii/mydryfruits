import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config";
import { prisma } from "./lib/prisma";
import { startInvoiceJob } from "./jobs/invoice";

import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import categoryRoutes from "./routes/categories";
import collectionRoutes from "./routes/collections";
import storefrontRoutes from "./routes/storefront";
import orderRoutes from "./routes/orders";
import bulkRoutes from "./routes/bulk";
import couponRoutes from "./routes/coupons";
import adminRoutes from "./routes/admin";

const app = express();

if (env.trustProxy) {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

const corsOrigins = env.corsOrigin.split(",").map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (corsOrigins.includes(origin) || corsOrigins.includes("*")) return cb(null, true);
      console.warn(`[cors] blocked origin ${origin}`);
      return cb(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: env.isProd ? 300 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Local disk uploads (EC2)
app.use(
  "/uploads",
  express.static(env.uploadDir, {
    maxAge: env.isProd ? "7d" : 0,
    fallthrough: true,
  })
);

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      ok: true,
      brand: "MyDryFruits",
      env: env.nodeEnv,
      db: "up",
      time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[health] database down", err);
    res.status(503).json({
      ok: false,
      brand: "MyDryFruits",
      env: env.nodeEnv,
      db: "down",
      time: new Date().toISOString(),
    });
  }
});

app.get("/sitemap.xml", async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { hidden: false },
      select: { slug: true, updatedAt: true },
    });
    const categories = await prisma.category.findMany({
      where: { hidden: false },
      select: { slug: true },
    });
    const collections = await prisma.collection.findMany({
      where: { hidden: false },
      select: { slug: true },
    });
    const base = env.siteUrl;
    const urls = [
      "",
      "/shop",
      "/collections",
      "/about",
      "/contact",
      "/offers",
      ...categories.map((c) => `/shop?category=${c.slug}`),
      ...products.map((p) => `/product/${p.slug}`),
      ...collections.map((c) => `/collections/${c.slug}`),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url><loc>${base}${u}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`
  )
  .join("\n")}
</urlset>`;
    res.type("application/xml").send(xml);
  } catch (err) {
    next(err);
  }
});

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${env.siteUrl}/sitemap.xml\n`);
});

app.post("/api/track", async (req, res, next) => {
  try {
    await prisma.analyticsEvent.create({
      data: {
        type: req.body.type || "page_view",
        path: req.body.path,
        meta: req.body.meta,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/storefront", storefrontRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/bulk", bulkRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(
  (
    err: Error & { status?: number },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[error]", err.message);
    if (env.nodeEnv !== "production") {
      console.error(err.stack);
    }
    if (!res.headersSent) {
      const status = err.status && err.status >= 400 ? err.status : 500;
      const message =
        status === 500 && env.isProd
          ? "Server error"
          : err.message || "Server error";
      res.status(status).json({ error: message });
    }
  }
);

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
  if (env.isProd) process.exit(1);
});

const server = app.listen(env.port, "0.0.0.0", () => {
  console.log(
    `[boot] MyDryFruits API listening on 0.0.0.0:${env.port} (${env.nodeEnv}) upload=${env.uploadDriver}`
  );
  startInvoiceJob();
});

function shutdown(signal: string) {
  console.log(`[boot] ${signal} received, shutting down…`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } finally {
      process.exit(0);
    }
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
