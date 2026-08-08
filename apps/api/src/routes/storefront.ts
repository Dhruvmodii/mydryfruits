import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validate";
import { serializeProduct } from "../lib/utils";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const sections = await prisma.homepageSection.findMany({ where: { enabled: true } });
    const reviews = await prisma.review.findMany({
      where: { hidden: false },
      orderBy: { displayOrder: "asc" },
      take: 12,
    });
    const faqs = await prisma.faq.findMany({
      where: { hidden: false },
      orderBy: { displayOrder: "asc" },
    });
    const settings = await prisma.siteSetting.findMany();
    const categories = await prisma.category.findMany({
      where: { hidden: false },
      orderBy: { displayOrder: "asc" },
    });
    const featured = await prisma.product.findMany({
      where: {
        hidden: false,
        OR: [
          { isFeatured: true },
          { isBestSeller: true },
          { isTrending: true },
          { isNewArrival: true },
        ],
      },
      take: 12,
      include: { category: true },
      orderBy: { displayOrder: "asc" },
    });
    const seo = await prisma.seoPage.findUnique({ where: { path: "/" } });

    const settingsMap = Object.fromEntries(
      settings.filter((s) => s.key !== "integrations").map((s) => [s.key, s.value])
    );
    const sectionMap = Object.fromEntries(sections.map((s) => [s.key, s]));

    res.json({
      sections: sectionMap,
      reviews,
      faqs,
      settings: settingsMap,
      categories,
      featuredProducts: featured.map(serializeProduct),
      seo,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/reviews", async (_req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { hidden: false },
      orderBy: { displayOrder: "asc" },
    });
    res.json({ items: reviews });
  } catch (err) {
    next(err);
  }
});

router.get("/faqs", async (_req, res, next) => {
  try {
    const faqs = await prisma.faq.findMany({
      where: { hidden: false },
      orderBy: { displayOrder: "asc" },
    });
    res.json({ items: faqs });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/newsletter",
  validateBody(z.object({ email: z.string().email() })),
  async (req, res, next) => {
    try {
      const email = req.body.email.toLowerCase();
      await prisma.newsletterSubscriber.upsert({
        where: { email },
        create: { email },
        update: {},
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/contact",
  validateBody(
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
      message: z.string().min(5),
    })
  ),
  async (req, res, next) => {
    try {
      await prisma.analyticsEvent.create({
        data: { type: "contact", meta: req.body },
      });
      res.json({ ok: true, message: "Thanks — we'll get back to you soon." });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/settings", async (_req, res, next) => {
  try {
    const settings = await prisma.siteSetting.findMany();
    // Never expose API keys / integration secrets publicly
    const map = Object.fromEntries(
      settings.filter((s) => s.key !== "integrations").map((s) => [s.key, s.value])
    );
    res.json({ settings: map });
  } catch (err) {
    next(err);
  }
});

router.get("/seo", async (req, res, next) => {
  try {
    const path = String(req.query.path || "/");
    const seo = await prisma.seoPage.findUnique({ where: { path } });
    res.json({ seo });
  } catch (err) {
    next(err);
  }
});

router.get("/offers", async (_req, res, next) => {
  try {
    const seasonal = await prisma.homepageSection.findUnique({ where: { key: "seasonal" } });
    const coupons = await prisma.coupon.findMany({
      where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { code: true, type: true, value: true, minPurchase: true, expiresAt: true },
    });
    res.json({ seasonal: seasonal?.content, coupons });
  } catch (err) {
    next(err);
  }
});

export default router;
