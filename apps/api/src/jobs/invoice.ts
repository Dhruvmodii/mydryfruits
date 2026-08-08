import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { sendOrderInvoiceEmail } from "../lib/invoice-mail";

export function startInvoiceJob() {
  // Backup: every day at 9:00 AM — invoices not yet sent for yesterday's orders
  cron.schedule("0 9 * * *", async () => {
    console.log("[cron] Running next-day invoice job…");
    try {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          invoiceSentAt: null,
          status: { not: "CANCELLED" },
        },
        select: { id: true },
      });

      let sent = 0;
      for (const order of orders) {
        const result = await sendOrderInvoiceEmail(order.id);
        if (result.sent) sent += 1;
      }
      console.log(`[cron] Sent ${sent}/${orders.length} invoices`);
    } catch (err) {
      console.error("[cron] Invoice job failed", err);
    }
  });
}
