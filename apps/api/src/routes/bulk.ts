import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validate";
import { sendTemplatedEmail } from "../lib/email";

const router = Router();

router.post(
  "/",
  validateBody(
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
      productId: z.string().optional(),
      productName: z.string().min(1),
      requiredQuantity: z.string().min(1),
      message: z.string().optional(),
    })
  ),
  async (req, res) => {
    const inquiry = await prisma.bulkInquiry.create({
      data: {
        name: req.body.name,
        email: req.body.email.toLowerCase(),
        productId: req.body.productId,
        productName: req.body.productName,
        requiredQuantity: req.body.requiredQuantity,
        message: req.body.message,
      },
    });

    const business = await prisma.siteSetting.findUnique({ where: { key: "business" } });
    const biz = (business?.value as { email?: string }) || {};
    const { env } = await import("../config");
    const candidate = (biz.email || env.adminEmail || "").toLowerCase();
    const adminTo =
      candidate.includes("@") && !candidate.endsWith("@mydryfruits.com")
        ? candidate
        : env.adminEmail;

    void Promise.allSettled([
      sendTemplatedEmail({
        to: inquiry.email,
        templateKey: "bulk_inquiry_ack",
        vars: {
          name: inquiry.name,
          productName: inquiry.productName,
          requiredQuantity: inquiry.requiredQuantity,
        },
      }),
      sendRawAdmin(adminTo, inquiry),
    ]).then((results) => {
      for (const r of results) {
        if (r.status === "rejected") console.error("[bulk:notify]", r.reason);
      }
    });

    res.status(201).json({ inquiry: { id: inquiry.id } });
  }
);

async function sendRawAdmin(
  to: string,
  inquiry: { name: string; email: string; productName: string; requiredQuantity: string; message: string | null }
) {
  const { sendRawEmail } = await import("../lib/email");
  await sendRawEmail(
    to,
    `Bulk inquiry: ${inquiry.productName}`,
    `<p><strong>${inquiry.name}</strong> (${inquiry.email}) requested <strong>${inquiry.requiredQuantity}</strong> of ${inquiry.productName}.</p><p>${inquiry.message || ""}</p>`
  );
}

export default router;
