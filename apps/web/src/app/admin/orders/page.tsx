"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";
import { formatINR, getApiBaseUrl } from "@/lib/constants";
import { toast } from "@/components/Toast";

const STATUSES = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"];

function orderCopyText(o: any) {
  const items = (o.items || [])
    .map((i: any) => `${i.productName} · ${i.weightGrams}g · ${formatINR(i.lineTotal)}`)
    .join("\n");
  return [
    `Order ${o.orderNumber}`,
    `Status: ${o.status}`,
    `Customer: ${o.customerName}`,
    `Email: ${o.customerEmail}`,
    `Address: ${[o.addressLine1, o.addressLine2, o.city, o.state, o.pincode].filter(Boolean).join(", ")}`,
    `Items:`,
    items || "(none)",
    `Subtotal: ${formatINR(o.subtotal)}`,
    `Discount: ${formatINR(o.discount)}`,
    `Delivery: ${formatINR(o.deliveryCharge)}`,
    `Tax: ${formatINR(o.tax)}`,
    `Total: ${formatINR(o.total)}`,
    o.couponCode ? `Coupon: ${o.couponCode}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function AdminOrdersPage() {
  const [highlight, setHighlight] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setHighlight(new URLSearchParams(window.location.search).get("highlight") || "");
  }, []);

  function load() {
    const q = status ? `?status=${status}` : "";
    adminFetch<{ items: any[] }>(`/api/admin/orders${q}`).then((d) => setItems(d.items));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!highlight) return;
    const id = window.setTimeout(() => {
      document.getElementById(`order-${highlight}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => window.clearTimeout(id);
  }, [highlight, items]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-forest">Orders</h1>
        <button
          type="button"
          className="btn-secondary"
          onClick={async () => {
            const token = localStorage.getItem("mydryfruits_admin_token");
            try {
              const r = await fetch(`${getApiBaseUrl()}/api/admin/orders/export/excel`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!r.ok) throw new Error("Could not export Excel. Try again.");
              const blob = await r.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "orders.xlsx";
              a.click();
              toast.success("Excel download started.");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Export failed");
            }
          }}
        >
          Export Excel
        </button>
      </div>
      <select className="input-field mt-4 max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <div className="mt-6 space-y-4">
        {items.map((o) => (
          <div
            key={o.id}
            id={`order-${o.orderNumber}`}
            className={`rounded-2xl bg-white p-5 shadow-card ${
              highlight === o.orderNumber ? "ring-2 ring-gold" : ""
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-forest">{o.orderNumber}</p>
                <p className="text-sm text-forest/60">
                  {o.customerName} · {o.customerEmail}
                </p>
                <p className="text-sm text-forest/60">
                  {o.addressLine1}, {o.city}, {o.state} {o.pincode}
                </p>
                <p className="mt-1 font-medium">{formatINR(o.total)}</p>
              </div>
              <div className="flex flex-col gap-2">
                <select
                  className="input-field !py-2 text-sm"
                  value={o.status}
                  onChange={async (e) => {
                    await adminFetch(`/api/admin/orders/${o.id}/status`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: e.target.value }),
                      success: `Order ${o.orderNumber} marked ${e.target.value}`,
                    });
                    load();
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-secondary !py-2 text-sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(orderCopyText(o));
                      toast.success("Order copied. You can paste it anywhere.");
                    } catch {
                      toast.error("Could not copy. Select the order text and copy manually.");
                    }
                  }}
                >
                  Copy order
                </button>
                <button
                  type="button"
                  className="btn-secondary !py-2 text-sm"
                  onClick={async () => {
                    const token = localStorage.getItem("mydryfruits_admin_token");
                    try {
                      const r = await fetch(`${getApiBaseUrl()}/api/admin/orders/${o.id}/invoice`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (!r.ok) throw new Error("Could not download the invoice.");
                      const blob = await r.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${o.orderNumber}.pdf`;
                      a.click();
                      toast.success("Invoice download started.");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Download failed");
                    }
                  }}
                >
                  Download PDF
                </button>
              </div>
            </div>
            <ul className="mt-3 text-sm text-forest/70">
              {o.items?.map((i: any) => (
                <li key={i.id}>
                  {i.productName} · {i.weightGrams}g · {formatINR(i.lineTotal)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
