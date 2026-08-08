"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";

export default function AdminReviewsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ customerName: "", rating: 5, comment: "", productName: "" });

  function load() {
    adminFetch<{ items: any[] }>("/api/admin/reviews").then((d) => setItems(d.items));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Reviews</h1>
      <form
        className="mt-6 space-y-3 rounded-2xl bg-white p-5 shadow-card"
        onSubmit={async (e) => {
          e.preventDefault();
          await adminFetch("/api/admin/reviews", {
            method: "POST",
            body: JSON.stringify({ ...form, rating: Number(form.rating) }),
          });
          load();
        }}
      >
        <input className="input-field" placeholder="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
        <input className="input-field" type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
        <input className="input-field" placeholder="Product name" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
        <textarea className="input-field" placeholder="Comment" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} required />
        <button className="btn-primary" type="submit">Add review</button>
      </form>
      <ul className="mt-6 space-y-3">
        {items.map((r) => (
          <li key={r.id} className="flex justify-between rounded-2xl bg-white p-4 shadow-card">
            <div>
              <p className="font-medium">{r.customerName} · {"★".repeat(r.rating)}</p>
              <p className="text-sm text-forest/60">{r.comment}</p>
            </div>
            <button type="button" className="text-sm text-red-700" onClick={async () => { await adminFetch(`/api/admin/reviews/${r.id}`, { method: "DELETE" }); load(); }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
