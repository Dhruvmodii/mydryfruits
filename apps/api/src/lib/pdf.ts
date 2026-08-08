import PDFDocument from "pdfkit";

export async function buildInvoicePdf(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  tax: number;
  total: number;
  createdAt: Date;
  estimatedDelivery?: string | null;
  items: {
    productName: string;
    weightGrams: number;
    unitPrice: number;
    lineTotal: number;
    quantity?: number;
  }[];
}) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const left = 48;
    const right = pageWidth - 48;
    const green = "#1B4332";
    const muted = "#5c6b5c";
    const line = "#d8e0d8";

    // Header bar
    doc.rect(0, 0, pageWidth, 92).fill(green);
    doc.fillColor("#ffffff").fontSize(26).font("Helvetica-Bold").text("MyDryFruits", left, 28);
    doc.font("Helvetica").fontSize(11).fillColor("#d8e8d8").text("Premium Dry Fruits & Healthy Foods", left, 58);
    doc.fontSize(12).fillColor("#ffffff").text("TAX INVOICE", right - 120, 36, { width: 120, align: "right" });

    let y = 118;
    doc.fillColor(green).font("Helvetica-Bold").fontSize(14).text(`Invoice # ${order.orderNumber}`, left, y);
    y += 20;
    doc.font("Helvetica").fontSize(10).fillColor(muted);
    doc.text(`Order date: ${order.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`, left, y);
    y += 14;
    if (order.estimatedDelivery) {
      doc.text(`Estimated delivery: ${order.estimatedDelivery}`, left, y);
      y += 14;
    }

    y += 10;
    // Bill to box
    doc.fillColor(green).font("Helvetica-Bold").fontSize(11).text("Bill To", left, y);
    y += 16;
    doc.font("Helvetica").fontSize(10).fillColor("#111111");
    doc.text(order.customerName, left, y);
    y += 14;
    doc.fillColor(muted).text(order.customerEmail, left, y);
    y += 14;
    const address = [
      order.addressLine1,
      order.addressLine2,
      `${order.city}, ${order.state} ${order.pincode}`,
      order.country || "India",
    ]
      .filter(Boolean)
      .join("\n");
    doc.fillColor("#111111").text(address, left, y, { width: 260 });
    y = Math.max(y + 70, 230);

    // Table header
    doc.moveTo(left, y).lineTo(right, y).strokeColor(line).stroke();
    y += 8;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(green);
    doc.text("#", left, y, { width: 24 });
    doc.text("Item", left + 28, y, { width: 220 });
    doc.text("Weight", left + 250, y, { width: 60 });
    doc.text("Qty", left + 315, y, { width: 36, align: "right" });
    doc.text("Rate", left + 360, y, { width: 70, align: "right" });
    doc.text("Amount", left + 430, y, { width: 70, align: "right" });
    y += 14;
    doc.moveTo(left, y).lineTo(right, y).strokeColor(line).stroke();
    y += 10;

    doc.font("Helvetica").fontSize(9).fillColor("#111111");
    order.items.forEach((item, idx) => {
      if (y > 700) {
        doc.addPage();
        y = 48;
      }
      const weight = item.weightGrams >= 1000 ? `${item.weightGrams / 1000} kg` : `${item.weightGrams} g`;
      const qty = item.quantity || 1;
      doc.text(String(idx + 1), left, y, { width: 24 });
      doc.text(item.productName, left + 28, y, { width: 220 });
      doc.text(weight, left + 250, y, { width: 60 });
      doc.text(String(qty), left + 315, y, { width: 36, align: "right" });
      doc.text(`Rs ${item.unitPrice.toFixed(2)}`, left + 360, y, { width: 70, align: "right" });
      doc.text(`Rs ${item.lineTotal.toFixed(2)}`, left + 430, y, { width: 70, align: "right" });
      y += 18;
    });

    y += 6;
    doc.moveTo(left, y).lineTo(right, y).strokeColor(line).stroke();
    y += 16;

    const summaryX = left + 300;
    const label = (t: string, v: string, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 10);
      doc.fillColor(bold ? green : muted).text(t, summaryX, y, { width: 100 });
      doc.fillColor(bold ? green : "#111111").text(v, summaryX + 100, y, { width: 100, align: "right" });
      y += bold ? 18 : 16;
    };

    label("Subtotal", `Rs ${order.subtotal.toFixed(2)}`);
    if (order.discount > 0) label("Discount", `- Rs ${order.discount.toFixed(2)}`);
    label("Delivery", `Rs ${order.deliveryCharge.toFixed(2)}`);
    if (order.tax > 0) label("Tax", `Rs ${order.tax.toFixed(2)}`);
    y += 4;
    label("Total payable", `Rs ${order.total.toFixed(2)}`, true);

    y += 28;
    doc.font("Helvetica").fontSize(9).fillColor(muted);
    doc.text(
      "This is a computer-generated invoice from MyDryFruits. For support, reply to this email.",
      left,
      y,
      { width: right - left }
    );
    y += 28;
    doc.fillColor(green).font("Helvetica-Bold").fontSize(11).text("Thank you for shopping with us!", left, y);

    doc.end();
  });
}
