import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { serializeProduct } from "../lib/utils";

const router = Router();

router.get("/", async (req, res, next) => {
  const {
    q,
    category,
    minPrice,
    maxPrice,
    availability,
    sort = "newest",
    featured,
    bestSeller,
    trending,
    newArrival,
    premium,
    discount,
    page = "1",
    limit = "24",
  } = req.query;

  const where: Prisma.ProductWhereInput = { hidden: false };

  if (category) {
    where.category = { slug: String(category) };
  }
  if (availability === "in_stock") where.inStock = true;
  if (availability === "out_of_stock") where.inStock = false;
  if (featured === "true") where.isFeatured = true;
  if (bestSeller === "true") where.isBestSeller = true;
  if (trending === "true") where.isTrending = true;
  if (newArrival === "true") where.isNewArrival = true;
  if (premium === "true") where.isPremium = true;
  if (discount === "true") where.discountPercent = { gt: 0 };
  if (minPrice || maxPrice) {
    where.pricePerKg = {};
    if (minPrice) (where.pricePerKg as Prisma.DecimalFilter).gte = Number(minPrice);
    if (maxPrice) (where.pricePerKg as Prisma.DecimalFilter).lte = Number(maxPrice);
  }

  if (q) {
    const term = String(q).trim();
    where.OR = [
      { name: { contains: term } },
      { description: { contains: term } },
      { localName: { contains: term } },
      { alternateNames: { contains: term.toLowerCase() } },
    ];
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  switch (String(sort)) {
    case "price_asc":
      orderBy = { pricePerKg: "asc" };
      break;
    case "price_desc":
      orderBy = { pricePerKg: "desc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    case "popularity":
      orderBy = { reviewCount: "desc" };
      break;
    case "az":
      orderBy = { name: "asc" };
      break;
    case "za":
      orderBy = { name: "desc" };
      break;
    case "best_seller":
      orderBy = { isBestSeller: "desc" };
      break;
    default:
      orderBy = { displayOrder: "asc" };
  }

  const take = Math.min(Number(limit) || 24, 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  try {
    const items = await prisma.product.findMany({
      where,
      orderBy,
      take,
      skip,
      include: { category: true, images: { orderBy: { sortOrder: "asc" } } },
    });
    const total = await prisma.product.count({ where });

    let filtered = items;
    if (q) {
      const term = String(q).toLowerCase();
      filtered = items.filter((p) => {
        const alts = (() => {
          try {
            const parsed = JSON.parse(p.alternateNames || "[]");
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();
        const hay = [p.name, p.description || "", p.localName || "", ...alts].join(" ").toLowerCase();
        return hay.includes(term) || alts.some((a: string) => String(a).toLowerCase().includes(term));
      });
    }

    res.json({
      items: filtered.map(serializeProduct),
      total: q ? filtered.length : total,
      page: Number(page) || 1,
      limit: take,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:slug", async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { slug: req.params.slug, hidden: false },
    include: { category: true, images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const related = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id },
      hidden: false,
      inStock: true,
    },
    take: 8,
    include: { category: true },
  });

  const alsoBought = await prisma.product.findMany({
    where: {
      id: { not: product.id },
      hidden: false,
      OR: [{ isBestSeller: true }, { isTrending: true }],
    },
    take: 4,
    include: { category: true },
  });

  res.json({
    product: serializeProduct(product),
    related: related.map(serializeProduct),
    frequentlyBought: alsoBought.map(serializeProduct),
    customersAlsoBought: alsoBought.map(serializeProduct),
  });
});

export default router;
