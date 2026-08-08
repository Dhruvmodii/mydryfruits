"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";
import { formatINR } from "@/lib/constants";

export default function AdminCustomersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");

  function load() {
    adminFetch<{ items: any[] }>(`/api/admin/customers?q=${encodeURIComponent(q)}`).then((d) =>
      setItems(d.items)
    );
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Customers</h1>
      <div className="mt-4 flex gap-2">
        <input className="input-field max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" />
        <button type="button" className="btn-secondary" onClick={load}>Search</button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-forest/10 text-forest/50">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Orders</th>
              <th className="p-3">Spent</th>
              <th className="p-3">Last order</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-forest/5">
                <td className="p-3">{c.name}</td>
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c.orderCount}</td>
                <td className="p-3">{formatINR(c.totalSpent)}</td>
                <td className="p-3">{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
