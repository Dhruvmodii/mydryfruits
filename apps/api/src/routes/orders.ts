import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validate";
import {
  generateOrderNumber,
  estimateDelivery,
  priceForWeight,
  money,
  WEIGHT_OPTIONS,
} from "../lib/utils";
import { sendTemplatedEmail } from "../lib/email";
import { sendSms } from "../lib/sms";
import { sendWhatsApp } from "../lib/whatsapp";
import { sendOrderInvoiceEmail } from "../lib/invoice-mail";
import { env } from "../config";
import { getIntegrations } from "../lib/integrations";

const router = Router();

const cartItemSchema = z.object({
  productId: z.string(),
  weightGrams: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20).default(1),
});

router.post(
  "/quote",
  validateBody(
    z.object({
      items: z.array(cartItemSchema).min(1),
      couponCode: z.string().optional(),
    })
  ),
  async (req, res) => {
    const quote = await buildQuote(req.body.items, req.body.couponCode);
    if ("error" in quote) return res.status(400).json(quote);
    res.json(quote);
  }
);

router.post(
  "/",
  validateBody(
    z.object({
      customerName: z.string().min(2),
      customerEmail: z.string().email(),
      addressLine1: z.string().min(5),
      addressLine2: z.string().optional(),
      city: z.string().min(2),
      state: z.string().min(2),
      pincode: z.string().min(4).max(10),
      country: z.string().default("India"),
      notes: z.string().optional(),
      couponCode: z.string().optional(),
      items: z.array(cartItemSchema).min(1),
    })
  ),
  async (req, res) => {
    const quote = await buildQuote(req.body.items, req.body.couponCode);
    if ("error" in quote) return res.status(400).json(quote);

    const orderNumber = generateOrderNumber();
    const estimatedDelivery = estimateDelivery();

    const customer = await prisma.customer.upsert({
      where: { email: req.body.customerEmail.toLowerCase() },
      create: {
        name: req.body.customerName,
        email: req.body.customerEmail.toLowerCase(),
        addressLine1: req.body.addressLine1,
        addressLine2: req.body.addressLine2 || null,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
        country: req.body.country || "India",
        orderCount: 0,
        totalSpent: 0,
      },
      update: {
        name: req.body.customerName,
        addressLine1: req.body.addressLine1,
        addressLine2: req.body.addressLine2 || null,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
        country: req.body.country || "India",
      },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: req.body.customerName,
        customerEmail: req.body.customerEmail.toLowerCase(),
        addressLine1: req.body.addressLine1,
        addressLine2: req.body.addressLine2,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
        country: req.body.country || "India",
        notes: req.body.notes,
        couponCode: quote.couponCode,
        subtotal: quote.subtotal,
        discount: quote.discount,
        deliveryCharge: quote.deliveryCharge,
        tax: quote.tax,
        total: quote.total,
        estimatedDelivery,
        customerId: customer.id,
        items: {
          create: quote.lines.map((l) => ({
            productId: l.productId,
            productName: l.productName,
            imageUrl: l.imageUrl,
            weightGrams: l.weightGrams,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
          })),
        },
      },
      include: { items: true },
    });

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        orderCount: { increment: 1 },
        totalSpent: { increment: quote.total },
        lastOrderAt: new Date(),
      },
    });

    if (quote.couponId) {
      await prisma.coupon.update({
        where: { id: quote.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    const itemsHtml = quote.lines
      .map(
        (l) =>
          `<li>${l.productName} (${l.weightGrams}g) × ${l.quantity} — ₹${l.lineTotal.toFixed(2)}</li>`
      )
      .join("");
    const itemsText = quote.lines
      .map((l) => `${l.productName} (${l.weightGrams}g) × ${l.quantity} — ₹${l.lineTotal.toFixed(2)}`)
      .join("\n");
    const address = [order.addressLine1, order.addressLine2, `${order.city}, ${order.state} ${order.pincode}`, order.country]
      .filter(Boolean)
      .join(", ");
    const adminOrderUrl = `${env.siteUrl}/admin/orders?highlight=${encodeURIComponent(order.orderNumber)}`;
    const copySummary = [
      `Order ${order.orderNumber}`,
      `Customer: ${order.customerName}`,
      `Email: ${order.customerEmail}`,
      `Address: ${address}`,
      `Items:`,
      itemsText,
      `Subtotal: ₹${Number(order.subtotal).toFixed(2)}`,
      `Discount: ₹${Number(order.discount).toFixed(2)}`,
      `Delivery: ₹${Number(order.deliveryCharge).toFixed(2)}`,
      `Tax: ₹${Number(order.tax).toFixed(2)}`,
      `Total: ₹${Number(order.total).toFixed(2)}`,
      order.couponCode ? `Coupon: ${order.couponCode}` : "",
      `Open in admin: ${adminOrderUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    const business = await prisma.siteSetting.findUnique({ where: { key: "business" } });
    const biz = (business?.value as { email?: string; phone?: string }) || {};
    const integrations = await getIntegrations();
    // Skip seeded placeholders like hello@mydryfruits.com — use a real inbox only
    const isPlaceholder = (e: string) =>
      e.endsWith("@mydryfruits.com") || e.endsWith("@yourdomain.com");
    const adminRecipients = [
      ...new Set(
        [biz.email, integrations.sendgrid.fromEmail]
          .filter((e): e is string => !!e && e.includes("@"))
          .map((e) => e.toLowerCase())
          .filter((e) => !isPlaceholder(e))
      ),
    ];
    if (!adminRecipients.length) {
      const fallback = (env.adminEmail || "").toLowerCase();
      if (fallback.includes("@") && !isPlaceholder(fallback)) adminRecipients.push(fallback);
    }

    const adminAlert = `New order ${order.orderNumber} — ${order.customerName} — ₹${Number(order.total).toFixed(2)}`;

    // Respond first — emails/SMS/WhatsApp run in the background so checkout stays fast
    void Promise.allSettled([
      sendTemplatedEmail({
        to: order.customerEmail,
        templateKey: "order_confirmation",
        vars: {
          customerName: order.customerName,
          orderNumber: order.orderNumber,
          total: Number(order.total).toFixed(2),
          itemsHtml: `<ul>${itemsHtml}</ul>`,
          estimatedDelivery: estimatedDelivery,
        },
      }),
      sendTemplatedEmail({
        to: adminRecipients,
        templateKey: "admin_order_notification",
        vars: {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          total: Number(order.total).toFixed(2),
          subtotal: Number(order.subtotal).toFixed(2),
          discount: Number(order.discount).toFixed(2),
          deliveryCharge: Number(order.deliveryCharge).toFixed(2),
          tax: Number(order.tax).toFixed(2),
          couponCode: order.couponCode || "",
          address,
          addressLine1: order.addressLine1,
          city: order.city,
          state: order.state,
          pincode: order.pincode,
          itemsHtml: `<ul>${itemsHtml}</ul>`,
          itemsText,
          copySummary,
          adminOrderUrl,
          viewOrderHtml: `<a href="${adminOrderUrl}" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#1B4332;color:#fff;text-decoration:none;border-radius:8px">Open order in admin</a>`,
          estimatedDelivery: estimatedDelivery,
          notes: order.notes || "",
        },
      }),
      // Invoice + PDF to customer (also covers what the next-day cron used to do)
      sendOrderInvoiceEmail(order.id),
      prisma.analyticsEvent.create({
        data: { type: "order_placed", path: "/checkout", meta: { orderNumber, total: quote.total } },
      }),
      biz.phone ? sendSms(biz.phone, adminAlert) : Promise.resolve(),
      biz.phone ? sendWhatsApp(biz.phone, adminAlert) : Promise.resolve(),
    ]).then((results) => {
      for (const r of results) {
        if (r.status === "rejected") console.error("[order:notify]", r.reason);
        else if (r.value && typeof r.value === "object" && "mode" in r.value && r.value.mode === "failed") {
          console.error("[order:notify:failed]", r.value);
        }
      }
    });

    res.status(201).json({
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        discount: Number(order.discount),
        deliveryCharge: Number(order.deliveryCharge),
        tax: Number(order.tax),
        total: Number(order.total),
        items: order.items.map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          lineTotal: Number(i.lineTotal),
        })),
      },
    });
    return;
  }
);

router.get("/saved-details", async (req, res) => {
  const email = String(req.query.email || "")
    .toLowerCase()
    .trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Valid email required" });
  }

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (customer?.addressLine1) {
    return res.json({
      details: {
        customerName: customer.name,
        customerEmail: customer.email,
        addressLine1: customer.addressLine1,
        addressLine2: customer.addressLine2 || "",
        city: customer.city || "",
        state: customer.state || "",
        pincode: customer.pincode || "",
        country: customer.country || "India",
      },
    });
  }

  const order = await prisma.order.findFirst({
    where: { customerEmail: email },
    orderBy: { createdAt: "desc" },
    select: {
      customerName: true,
      customerEmail: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      pincode: true,
      country: true,
    },
  });

  res.json({
    details: order
      ? {
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          addressLine1: order.addressLine1,
          addressLine2: order.addressLine2 || "",
          city: order.city,
          state: order.state,
          pincode: order.pincode,
          country: order.country,
        }
      : null,
  });
});

router.get("/:orderNumber", async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { orderNumber: req.params.orderNumber },
    include: { items: true },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({
    order: {
      ...order,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      deliveryCharge: Number(order.deliveryCharge),
      tax: Number(order.tax),
      total: Number(order.total),
      items: order.items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
    },
  });
});

async function buildQuote(
  items: { productId: string; weightGrams: number; quantity: number }[],
  couponCode?: string
) {
  for (const item of items) {
    if (!(WEIGHT_OPTIONS as readonly number[]).includes(item.weightGrams)) {
      return { error: `Invalid weight ${item.weightGrams}. Use fixed options or bulk order.` };
    }
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, hidden: false },
  });
  const map = new Map(products.map((p) => [p.id, p]));

  const lines = [];
  for (const item of items) {
    const product = map.get(item.productId);
    if (!product) return { error: "One or more products are unavailable" };
    if (!product.inStock) return { error: `${product.name} is out of stock` };
    const unitPrice = priceForWeight(Number(product.pricePerKg), item.weightGrams);
    const discounted =
      product.discountPercent > 0
        ? money(unitPrice * (1 - product.discountPercent / 100))
        : unitPrice;
    const lineTotal = money(discounted * item.quantity);
    lines.push({
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrl,
      weightGrams: item.weightGrams,
      quantity: item.quantity,
      unitPrice: discounted,
      lineTotal,
    });
  }

  const subtotal = money(lines.reduce((s, l) => s + l.lineTotal, 0));
  let discount = 0;
  let couponId: string | undefined;
  let appliedCode: string | undefined;

  if (couponCode) {
    const now = new Date();
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: couponCode.toUpperCase(),
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
    });
    if (!coupon) return { error: "Invalid or expired coupon" };
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      return { error: "Coupon usage limit reached" };
    }
    if (subtotal < Number(coupon.minPurchase)) {
      return { error: `Minimum purchase ₹${coupon.minPurchase} required for this coupon` };
    }
    discount =
      coupon.type === "percentage"
        ? money((subtotal * Number(coupon.value)) / 100)
        : money(Number(coupon.value));
    couponId = coupon.id;
    appliedCode = coupon.code;
  }

  const business = await prisma.siteSetting.findUnique({ where: { key: "business" } });
  const biz = (business?.value as { deliveryCharge?: number; freeDeliveryAbove?: number; taxPercent?: number }) || {};
  const deliveryCharge =
    subtotal - discount >= (biz.freeDeliveryAbove ?? 999) ? 0 : biz.deliveryCharge ?? 50;
  const tax = money(((subtotal - discount) * (biz.taxPercent ?? 0)) / 100);
  const total = money(subtotal - discount + deliveryCharge + tax);

  return {
    lines,
    subtotal,
    discount,
    deliveryCharge,
    tax,
    total,
    couponCode: appliedCode,
    couponId,
    estimatedDelivery: estimateDelivery(),
  };
}

export default router;
