import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validate";
import { money } from "../lib/utils";

const router = Router();

router.post(
  "/validate",
  validateBody(z.object({ code: z.string().min(2), subtotal: z.number().nonnegative() })),
  async (req, res) => {
    const now = new Date();
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: req.body.code.toUpperCase(),
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
    });
    if (!coupon) return res.status(400).json({ error: "Invalid or expired coupon" });
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ error: "Coupon usage limit reached" });
    }
    if (req.body.subtotal < Number(coupon.minPurchase)) {
      return res.status(400).json({
        error: `Minimum purchase ₹${coupon.minPurchase} required`,
      });
    }
    const discount =
      coupon.type === "percentage"
        ? money((req.body.subtotal * Number(coupon.value)) / 100)
        : money(Number(coupon.value));
    res.json({
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      discount,
    });
  }
);

export default router;
