import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { hidden: false },
    orderBy: { displayOrder: "asc" },
  });
  res.json({ items: categories });
});

router.get("/:slug", async (req, res) => {
  const category = await prisma.category.findFirst({
    where: { slug: req.params.slug, hidden: false },
  });
  if (!category) return res.status(404).json({ error: "Category not found" });
  res.json({ category });
});

export default router;
