"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";

export default function AdminCouponsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ code: "", type: "percentage", value: 10, minPurchase: 500, maxUses: 100 });

  function load() {
    adminFetch<{ items: any[] }>("/api/admin/coupons").then((d) => setItems(d.items));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Coupons</h1>
      <form
        className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow-card md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await adminFetch("/api/admin/coupons", {
            method: "POST",
            body: JSON.stringify({
              ...form,
              value: Number(form.value),
              minPurchase: Number(form.minPurchase),
              maxUses: Number(form.maxUses),
            }),
          });
          load();
        }}
      >
        <input className="input-field" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
        <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed</option>
        </select>
        <input className="input-field" type="number" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
        <input className="input-field" type="number" placeholder="Min purchase" value={form.minPurchase} onChange={(e) => setForm({ ...form, minPurchase: Number(e.target.value) })} />
        <button className="btn-primary md:col-span-2" type="submit">Create coupon</button>
      </form>
      <ul className="mt-6 space-y-3">
        {items.map((c) => (
          <li key={c.id} className="flex justify-between rounded-2xl bg-white p-4 shadow-card">
            <div>
              <p className="font-mono text-forest">{c.code}</p>
              <p className="text-sm text-forest/50">
                {c.type} {c.value} · used {c.usedCount}/{c.maxUses ?? "∞"}
              </p>
            </div>
            <button
              type="button"
              className="text-sm text-red-700"
              onClick={async () => {
                await adminFetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
                load();
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
