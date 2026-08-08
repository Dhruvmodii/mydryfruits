"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";
import { formatINR } from "@/lib/constants";
import { API_URL } from "@/lib/constants";

const STATUSES = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"];

export default function AdminOrdersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState("");

  function load() {
    const q = status ? `?status=${status}` : "";
    adminFetch<{ items: any[] }>(`/api/admin/orders${q}`).then((d) => setItems(d.items));
  }

  useEffect(() => {
    load();
  }, [status]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-forest">Orders</h1>
        <a
          href={`${API_URL}/api/admin/orders/export/excel`}
          className="btn-secondary"
          onClick={(e) => {
            e.preventDefault();
            const token = localStorage.getItem("mydryfruits_admin_token");
            fetch(`${API_URL}/api/admin/orders/export/excel`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((r) => r.blob())
              .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "orders.xlsx";
                a.click();
              });
          }}
        >
          Export Excel
        </a>
      </div>
      <select className="input-field mt-4 max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <div className="mt-6 space-y-4">
        {items.map((o) => (
          <div key={o.id} className="rounded-2xl bg-white p-5 shadow-card">
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
                  onClick={() => {
                    const token = localStorage.getItem("mydryfruits_admin_token");
                    fetch(`${API_URL}/api/admin/orders/${o.id}/invoice`, {
                      headers: { Authorization: `Bearer ${token}` },
                    })
                      .then((r) => r.blob())
                      .then((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${o.orderNumber}.pdf`;
                        a.click();
                      });
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
