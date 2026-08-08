import { Router } from "express";
import { prisma } from "../lib/prisma";
import { serializeProduct, priceForWeight, money } from "../lib/utils";

const router = Router();

router.get("/", async (_req, res) => {
  const items = await prisma.collection.findMany({
    where: { hidden: false },
    orderBy: { displayOrder: "asc" },
    include: {
      items: { include: { product: { include: { category: true } } } },
    },
  });

  res.json({
    items: items.map((c) => ({
      ...c,
      price: c.price
        ? Number(c.price)
        : money(
            c.items.reduce(
              (sum, i) => sum + priceForWeight(Number(i.product.pricePerKg), i.weightGrams),
              0
            )
          ),
      items: c.items.map((i) => ({
        ...i,
        product: serializeProduct(i.product),
        linePrice: priceForWeight(Number(i.product.pricePerKg), i.weightGrams),
      })),
    })),
  });
});

router.get("/:slug", async (req, res) => {
  const collection = await prisma.collection.findFirst({
    where: { slug: String(req.params.slug), hidden: false },
    include: {
      items: { include: { product: { include: { category: true } } } },
    },
  });
  if (!collection) return res.status(404).json({ error: "Collection not found" });

  const computed = money(
    collection.items.reduce(
      (sum, i) => sum + priceForWeight(Number(i.product.pricePerKg), i.weightGrams),
      0
    )
  );

  res.json({
    collection: {
      ...collection,
      price: collection.price ? Number(collection.price) : computed,
      items: collection.items.map((i) => ({
        ...i,
        product: serializeProduct(i.product),
        linePrice: priceForWeight(Number(i.product.pricePerKg), i.weightGrams),
      })),
    },
  });
});

export default router;
