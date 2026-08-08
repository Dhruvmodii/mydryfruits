import { Router } from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import { z } from "zod";
import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAdmin, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { slugify, money, generateOrderNumber, estimateDelivery, stringifyAlternateNames } from "../lib/utils";
import { uploadImageBuffer } from "../lib/cloudinary";
import { buildInvoicePdf } from "../lib/pdf";
import { sendTemplatedEmail } from "../lib/email";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"));
    }
    cb(null, true);
  },
});

const router = Router();
router.use(requireAdmin);

// ── Dashboard ──────────────────────────────────────────────
router.get("/dashboard", async (_req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [orders, products, customers, recentOrders, lowStock, popular, revenueAgg, events] =
    await Promise.all([
      prisma.order.count(),
      prisma.product.count({ where: { hidden: false } }),
      prisma.customer.count(),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { items: true },
      }),
      prisma.product.findMany({
        where: { OR: [{ stockQty: { lte: 10 } }, { inStock: false }], hidden: false },
        take: 10,
      }),
      prisma.orderItem.groupBy({
        by: ["productName"],
        _sum: { lineTotal: true },
        _count: true,
        orderBy: { _count: { productName: "desc" } },
        take: 5,
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: "CANCELLED" } },
      }),
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: since } },
        select: { type: true, createdAt: true },
      }),
    ]);

  const salesByDay: Record<string, number> = {};
  const recentPaid = await prisma.order.findMany({
    where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
    select: { createdAt: true, total: true },
  });
  for (const o of recentPaid) {
    const key = o.createdAt.toISOString().slice(0, 10);
    salesByDay[key] = money((salesByDay[key] || 0) + Number(o.total));
  }

  res.json({
    stats: {
      revenue: Number(revenueAgg._sum.total || 0),
      orders,
      products,
      customers,
      visitors: events.filter((e) => e.type === "page_view").length,
      conversions: events.filter((e) => e.type === "order_placed").length,
    },
    recentOrders: recentOrders.map(serializeOrder),
    inventoryAlerts: lowStock,
    popularProducts: popular.map((p) => ({
      name: p.productName,
      count: p._count,
      revenue: Number(p._sum.lineTotal || 0),
    })),
    salesByDay,
  });
});

// ── Products CRUD ──────────────────────────────────────────
router.get("/products", async (req, res) => {
  const q = String(req.query.q || "");
  const where: Prisma.ProductWhereInput = q
    ? {
        OR: [
          { name: { contains: q } },
          { alternateNames: { contains: q.toLowerCase() } },
        ],
      }
    : {};
  const items = await prisma.product.findMany({
    where,
    include: { category: true, images: true },
    orderBy: { updatedAt: "desc" },
  });
  res.json({
    items: items.map((p) => ({ ...p, pricePerKg: Number(p.pricePerKg) })),
  });
});

router.post(
  "/products",
  validateBody(
    z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      localName: z.string().optional(),
      pricePerKg: z.number().positive(),
      imageUrl: z.string().optional(),
      categoryId: z.string(),
      alternateNames: z.array(z.string()).default([]),
      benefits: z.string().optional(),
      storageTips: z.string().optional(),
      nutrition: z.any().optional(),
      origin: z.string().optional(),
      shelfLife: z.string().optional(),
      inStock: z.boolean().default(true),
      stockQty: z.number().int().default(100),
      hidden: z.boolean().default(false),
      onDemand: z.boolean().default(false),
      isFeatured: z.boolean().default(false),
      isBestSeller: z.boolean().default(false),
      isTrending: z.boolean().default(false),
      isNewArrival: z.boolean().default(false),
      isPremium: z.boolean().default(false),
      discountPercent: z.number().int().min(0).max(90).default(0),
      displayOrder: z.number().int().default(0),
    })
  ),
  async (req, res) => {
    let slug = slugify(req.body.name);
    const exists = await prisma.product.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now().toString(36)}`;
    const product = await prisma.product.create({
      data: {
        ...req.body,
        slug,
        alternateNames: stringifyAlternateNames(req.body.alternateNames),
        images: req.body.imageUrl
          ? { create: [{ url: req.body.imageUrl, alt: req.body.name }] }
          : undefined,
      },
      include: { category: true, images: true },
    });
    await refreshCategoryCount(product.categoryId);
    res.status(201).json({ product: { ...product, pricePerKg: Number(product.pricePerKg) } });
  }
);

router.put("/products/:id", async (req, res) => {
  const data = { ...req.body };
  if (data.name) data.slug = slugify(data.name);
  if (data.alternateNames) {
    data.alternateNames = stringifyAlternateNames(data.alternateNames);
  }
  delete data.id;
  delete data.category;
  delete data.images;
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data,
    include: { category: true, images: true },
  });
  await refreshCategoryCount(product.categoryId);
  res.json({ product: { ...product, pricePerKg: Number(product.pricePerKg) } });
});

router.delete("/products/:id", async (req, res) => {
  const product = await prisma.product.delete({ where: { id: req.params.id } });
  await refreshCategoryCount(product.categoryId);
  res.json({ ok: true });
});

// ── Categories ─────────────────────────────────────────────
router.get("/categories", async (_req, res) => {
  const items = await prisma.category.findMany({ orderBy: { displayOrder: "asc" } });
  res.json({ items });
});

router.post("/categories", async (req, res) => {
  const name = String(req.body.name || "");
  const category = await prisma.category.create({
    data: {
      name,
      slug: slugify(name),
      description: req.body.description,
      imageUrl: req.body.imageUrl,
      iconUrl: req.body.iconUrl,
      bannerUrl: req.body.bannerUrl,
      seoTitle: req.body.seoTitle,
      seoDescription: req.body.seoDescription,
      displayOrder: req.body.displayOrder ?? 0,
      hidden: req.body.hidden ?? false,
    },
  });
  res.status(201).json({ category });
});

router.put("/categories/:id", async (req, res) => {
  const data = { ...req.body };
  if (data.name) data.slug = slugify(data.name);
  delete data.id;
  delete data.products;
  const category = await prisma.category.update({ where: { id: req.params.id }, data });
  res.json({ category });
});

router.delete("/categories/:id", async (req, res) => {
  const count = await prisma.product.count({ where: { categoryId: req.params.id } });
  if (count > 0) return res.status(400).json({ error: "Category has products" });
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Collections ────────────────────────────────────────────
router.get("/collections", async (_req, res) => {
  const items = await prisma.collection.findMany({
    include: { items: { include: { product: true } } },
    orderBy: { displayOrder: "asc" },
  });
  res.json({ items });
});

router.post("/collections", async (req, res) => {
  const { name, description, imageUrl, benefitTag, price, items = [], hidden, displayOrder } =
    req.body;
  const collection = await prisma.collection.create({
    data: {
      name,
      slug: slugify(name),
      description,
      imageUrl,
      benefitTag,
      price,
      hidden: hidden ?? false,
      displayOrder: displayOrder ?? 0,
      items: {
        create: items.map((i: { productId: string; weightGrams: number }) => ({
          productId: i.productId,
          weightGrams: i.weightGrams || 250,
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });
  res.status(201).json({ collection });
});

router.put("/collections/:id", async (req, res) => {
  const { items, ...rest } = req.body;
  if (rest.name) rest.slug = slugify(rest.name);
  delete rest.id;
  if (items) {
    await prisma.collectionItem.deleteMany({ where: { collectionId: req.params.id } });
    await prisma.collectionItem.createMany({
      data: items.map((i: { productId: string; weightGrams: number }) => ({
        collectionId: req.params.id,
        productId: i.productId,
        weightGrams: i.weightGrams || 250,
      })),
    });
  }
  const collection = await prisma.collection.update({
    where: { id: req.params.id },
    data: rest,
    include: { items: { include: { product: true } } },
  });
  res.json({ collection });
});

router.delete("/collections/:id", async (req, res) => {
  await prisma.collection.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Orders ─────────────────────────────────────────────────
router.get("/orders", async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const items = await prisma.order.findMany({
    where: status ? { status: status as OrderStatus } : undefined,
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ items: items.map(serializeOrder) });
});

router.get("/orders/export/excel", async (_req, res) => {
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Orders");
  ws.columns = [
    { header: "Order #", key: "orderNumber", width: 18 },
    { header: "Date", key: "date", width: 14 },
    { header: "Customer", key: "customer", width: 22 },
    { header: "Email", key: "email", width: 28 },
    { header: "Status", key: "status", width: 12 },
    { header: "Total", key: "total", width: 12 },
  ];
  for (const o of orders) {
    ws.addRow({
      orderNumber: o.orderNumber,
      date: o.createdAt.toISOString().slice(0, 10),
      customer: o.customerName,
      email: o.customerEmail,
      status: o.status,
      total: Number(o.total),
    });
  }
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=orders.xlsx");
  await wb.xlsx.write(res);
  res.end();
});

router.patch(
  "/orders/:id/status",
  validateBody(z.object({ status: z.nativeEnum(OrderStatus) })),
  async (req, res) => {
    const order = await prisma.order.update({
      where: { id: String(req.params.id) },
      data: { status: req.body.status },
      include: { items: true },
    });
    res.json({ order: serializeOrder(order) });
  }
);

router.get("/orders/:id/invoice", async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!order) return res.status(404).json({ error: "Not found" });
  const pdf = await buildInvoicePdf({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    addressLine1: order.addressLine1,
    addressLine2: order.addressLine2,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    deliveryCharge: Number(order.deliveryCharge),
    tax: Number(order.tax),
    total: Number(order.total),
    createdAt: order.createdAt,
    items: order.items.map((i) => ({
      productName: i.productName,
      weightGrams: i.weightGrams,
      unitPrice: Number(i.unitPrice),
      lineTotal: Number(i.lineTotal),
    })),
  });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${order.orderNumber}.pdf"`);
  res.send(pdf);
});

// ── Bulk inquiries ─────────────────────────────────────────
router.get("/bulk-inquiries", async (_req, res) => {
  const items = await prisma.bulkInquiry.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ items });
});

router.post("/bulk-inquiries/:id/convert", async (req, res) => {
  const inquiry = await prisma.bulkInquiry.findUnique({ where: { id: req.params.id } });
  if (!inquiry) return res.status(404).json({ error: "Not found" });

  const orderNumber = generateOrderNumber();
  const order = await prisma.order.create({
    data: {
      orderNumber,
      status: "PENDING",
      customerName: inquiry.name,
      customerEmail: inquiry.email,
      addressLine1: "To be confirmed",
      city: "TBD",
      state: "TBD",
      pincode: "000000",
      subtotal: 0,
      total: 0,
      notes: `Converted from bulk inquiry. Qty: ${inquiry.requiredQuantity}. ${inquiry.message || ""}`,
      estimatedDelivery: estimateDelivery(),
      items: {
        create: [
          {
            productId: inquiry.productId || undefined,
            productName: inquiry.productName,
            weightGrams: 5000,
            unitPrice: 0,
            lineTotal: 0,
          },
        ],
      },
    },
    include: { items: true },
  });

  await prisma.bulkInquiry.update({
    where: { id: inquiry.id },
    data: { status: "CONVERTED", convertedOrderId: order.id },
  });

  res.json({ order: serializeOrder(order) });
});

// ── Customers ──────────────────────────────────────────────
router.get("/customers", async (req, res) => {
  const q = String(req.query.q || "");
  const items = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { lastOrderAt: "desc" },
    include: { orders: { take: 5, orderBy: { createdAt: "desc" } } },
  });
  res.json({
    items: items.map((c) => ({ ...c, totalSpent: Number(c.totalSpent) })),
  });
});

// ── Coupons ────────────────────────────────────────────────
router.get("/coupons", async (_req, res) => {
  const items = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  res.json({
    items: items.map((c) => ({
      ...c,
      value: Number(c.value),
      minPurchase: Number(c.minPurchase),
    })),
  });
});

router.post("/coupons", async (req, res) => {
  const coupon = await prisma.coupon.create({
    data: {
      code: String(req.body.code).toUpperCase(),
      type: req.body.type,
      value: req.body.value,
      minPurchase: req.body.minPurchase ?? 0,
      maxUses: req.body.maxUses,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
      active: req.body.active ?? true,
    },
  });
  res.status(201).json({ coupon });
});

router.put("/coupons/:id", async (req, res) => {
  const data = { ...req.body };
  if (data.code) data.code = String(data.code).toUpperCase();
  if (data.expiresAt) data.expiresAt = new Date(data.expiresAt);
  delete data.id;
  const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data });
  res.json({ coupon });
});

router.delete("/coupons/:id", async (req, res) => {
  await prisma.coupon.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Reviews / FAQ / Homepage ───────────────────────────────
router.get("/reviews", async (_req, res) => {
  res.json({ items: await prisma.review.findMany({ orderBy: { displayOrder: "asc" } }) });
});
router.post("/reviews", async (req, res) => {
  const review = await prisma.review.create({ data: req.body });
  res.status(201).json({ review });
});
router.put("/reviews/:id", async (req, res) => {
  const review = await prisma.review.update({ where: { id: req.params.id }, data: req.body });
  res.json({ review });
});
router.delete("/reviews/:id", async (req, res) => {
  await prisma.review.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.get("/faqs", async (_req, res) => {
  res.json({ items: await prisma.faq.findMany({ orderBy: { displayOrder: "asc" } }) });
});
router.post("/faqs", async (req, res) => {
  const faq = await prisma.faq.create({ data: req.body });
  res.status(201).json({ faq });
});
router.put("/faqs/:id", async (req, res) => {
  const faq = await prisma.faq.update({ where: { id: req.params.id }, data: req.body });
  res.json({ faq });
});
router.delete("/faqs/:id", async (req, res) => {
  await prisma.faq.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.get("/homepage", async (_req, res) => {
  res.json({ items: await prisma.homepageSection.findMany() });
});
router.put("/homepage/:key", async (req, res) => {
  const section = await prisma.homepageSection.upsert({
    where: { key: req.params.key },
    create: {
      key: req.params.key,
      title: req.body.title,
      content: req.body.content,
      enabled: req.body.enabled ?? true,
    },
    update: {
      title: req.body.title,
      content: req.body.content,
      enabled: req.body.enabled,
    },
  });
  res.json({ section });
});

// ── Email templates ────────────────────────────────────────
router.get("/email-templates", async (_req, res) => {
  res.json({ items: await prisma.emailTemplate.findMany() });
});
router.put("/email-templates/:key", async (req, res) => {
  const template = await prisma.emailTemplate.update({
    where: { key: req.params.key },
    data: {
      name: req.body.name,
      subject: req.body.subject,
      htmlBody: req.body.htmlBody,
    },
  });
  res.json({ template });
});

/** Send offer / festival (or any) template to customers + newsletter, or a single test address */
router.post("/email-templates/:key/send", async (req, res) => {
  const key = req.params.key;
  if (!["offer", "festival"].includes(key)) {
    return res.status(400).json({
      error: "Only offer and festival campaigns can be sent manually. Order emails send automatically.",
    });
  }

  const title = String(req.body.title || (key === "offer" ? "Special offer" : "Festival wishes"));
  const body = String(req.body.body || "");
  const testEmail = req.body.testEmail ? String(req.body.testEmail).trim() : "";

  let recipients: string[] = [];
  if (testEmail) {
    recipients = [testEmail];
  } else {
    const [customers, subscribers] = await Promise.all([
      prisma.customer.findMany({ select: { email: true } }),
      prisma.newsletterSubscriber.findMany({ select: { email: true } }),
    ]);
    recipients = [
      ...new Set([...customers.map((c) => c.email), ...subscribers.map((s) => s.email)].map((e) => e.toLowerCase())),
    ];
  }

  if (!recipients.length) {
    return res.status(400).json({ error: "No recipients found. Add a test email or wait for customers." });
  }

  let sent = 0;
  let failed = 0;
  for (const to of recipients) {
    const result = await sendTemplatedEmail({
      to,
      templateKey: key,
      vars: { title, body },
    });
    if (result.queued && result.mode !== "failed") sent += 1;
    else failed += 1;
  }

  res.json({ ok: true, sent, failed, total: recipients.length });
});

// ── Media ──────────────────────────────────────────────────
router.get("/media", async (_req, res) => {
  res.json({ items: await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } }) });
});

router.post("/media", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const uploaded = await uploadImageBuffer(req.file.buffer, "mydryfruits", req.file.mimetype);
  const asset = await prisma.mediaAsset.create({
    data: {
      url: uploaded.url,
      publicId: uploaded.publicId,
      type: "image",
      alt: req.body.alt,
      bytes: req.file.size,
    },
  });
  res.status(201).json({ asset });
});

router.delete("/media/:id", async (req, res) => {
  await prisma.mediaAsset.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── SEO ────────────────────────────────────────────────────
router.get("/seo", async (_req, res) => {
  res.json({ items: await prisma.seoPage.findMany() });
});
router.put("/seo", async (req, res) => {
  const { path, title, description, keywords, ogImage, canonical, schemaJson } = req.body;
  const seo = await prisma.seoPage.upsert({
    where: { path },
    create: { path, title, description, keywords, ogImage, canonical, schemaJson },
    update: { title, description, keywords, ogImage, canonical, schemaJson },
  });
  res.json({ seo });
});

// ── Settings ───────────────────────────────────────────────
router.get("/settings", async (_req, res) => {
  const { ensureIntegrationsSetting } = await import("../lib/integrations");
  await ensureIntegrationsSetting();
  const settings = await prisma.siteSetting.findMany();
  res.json({ settings: Object.fromEntries(settings.map((s) => [s.key, s.value])) });
});

router.put("/settings/:key", async (req, res) => {
  const setting = await prisma.siteSetting.upsert({
    where: { key: req.params.key },
    create: { key: req.params.key, value: req.body.value },
    update: { value: req.body.value },
  });
  res.json({ setting });
});

// ── Analytics ──────────────────────────────────────────────
router.get("/analytics", async (_req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const events = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: since } },
  });
  const byType: Record<string, number> = {};
  for (const e of events) byType[e.type] = (byType[e.type] || 0) + 1;

  const topProducts = await prisma.orderItem.groupBy({
    by: ["productName"],
    _count: true,
    orderBy: { _count: { productName: "desc" } },
    take: 10,
  });

  res.json({
    byType,
    topProducts,
    visitors: byType.page_view || 0,
    orders: byType.order_placed || 0,
    conversionRate:
      byType.page_view > 0
        ? money(((byType.order_placed || 0) / byType.page_view) * 100)
        : 0,
  });
});

router.post("/analytics/event", async (req, res) => {
  // allow admin tooling; public tracking is separate
  await prisma.analyticsEvent.create({
    data: { type: req.body.type || "custom", path: req.body.path, meta: req.body.meta },
  });
  res.json({ ok: true });
});

function serializeOrder(order: any) {
  return {
    ...order,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    deliveryCharge: Number(order.deliveryCharge),
    tax: Number(order.tax),
    total: Number(order.total),
    items: order.items?.map((i: any) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      lineTotal: Number(i.lineTotal),
    })),
  };
}

async function refreshCategoryCount(categoryId: string) {
  const productCount = await prisma.product.count({
    where: { categoryId, hidden: false },
  });
  await prisma.category.update({ where: { id: categoryId }, data: { productCount } });
}

export default router;
