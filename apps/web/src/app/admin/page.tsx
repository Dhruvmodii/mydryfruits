"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "./AdminShell";
import { formatINR } from "@/lib/constants";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    adminFetch("/api/admin/dashboard").then(setData).catch(console.error);
  }, []);

  if (!data) return <p className="text-forest/50">Loading dashboard…</p>;

  const { stats, recentOrders, inventoryAlerts, popularProducts, salesByDay } = data;
  const days = Object.entries(salesByDay || {}).slice(-14);

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue" value={formatINR(stats.revenue)} />
        <Stat label="Orders" value={String(stats.orders)} />
        <Stat label="Products" value={String(stats.products)} />
        <Stat label="Customers" value={String(stats.customers)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="font-display text-xl text-forest">Sales (30d)</h2>
          <div className="mt-4 flex h-40 items-end gap-1">
            {days.map(([day, val]) => {
              const max = Math.max(...days.map(([, v]) => Number(v)), 1);
              const h = (Number(val) / max) * 100;
              return (
                <div key={day} className="flex-1 rounded-t bg-forest/80" style={{ height: `${Math.max(h, 4)}%` }} title={`${day}: ${val}`} />
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="font-display text-xl text-forest">Popular products</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {popularProducts.map((p: any) => (
              <li key={p.name} className="flex justify-between">
                <span>{p.name}</span>
                <span className="text-forest/50">{p.count} · {formatINR(p.revenue)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-forest">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm text-gold">
              View all
            </Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {recentOrders.map((o: any) => (
              <li key={o.id} className="flex justify-between border-b border-forest/5 pb-2">
                <span>
                  {o.orderNumber} · {o.customerName}
                </span>
                <span>
                  {o.status} · {formatINR(o.total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="font-display text-xl text-forest">Inventory alerts</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {inventoryAlerts.map((p: any) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="text-red-700">{p.inStock ? `Qty ${p.stockQty}` : "Out of stock"}</span>
              </li>
            ))}
            {inventoryAlerts.length === 0 && <li className="text-forest/40">All good</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <p className="text-sm text-forest/50">{label}</p>
      <p className="mt-1 font-display text-2xl text-forest">{value}</p>
    </div>
  );
}
