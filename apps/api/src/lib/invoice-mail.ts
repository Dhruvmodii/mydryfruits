import { prisma } from "./prisma";
import { buildInvoicePdf } from "./pdf";
import { sendTemplatedEmail } from "./email";

export async function sendOrderInvoiceEmail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.invoiceSentAt || order.status === "CANCELLED") {
    return { sent: false };
  }

  const pdf = await buildInvoicePdf({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    addressLine1: order.addressLine1,
    addressLine2: order.addressLine2,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    country: order.country,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    deliveryCharge: Number(order.deliveryCharge),
    tax: Number(order.tax),
    total: Number(order.total),
    createdAt: order.createdAt,
    estimatedDelivery: order.estimatedDelivery,
    items: order.items.map((i) => ({
      productName: i.productName,
      weightGrams: i.weightGrams,
      unitPrice: Number(i.unitPrice),
      lineTotal: Number(i.lineTotal),
    })),
  });

  const result = await sendTemplatedEmail({
    to: order.customerEmail,
    templateKey: "invoice",
    vars: {
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      total: Number(order.total).toFixed(2),
    },
    attachments: [{ filename: `Invoice-${order.orderNumber}.pdf`, content: pdf }],
  });

  if (result.queued) {
    await prisma.order.update({
      where: { id: order.id },
      data: { invoiceSentAt: new Date() },
    });
  }

  return { sent: !!result.queued, mode: result.mode };
}
