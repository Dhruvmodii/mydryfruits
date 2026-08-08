"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";

export default function AdminCollectionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  function load() {
    adminFetch<{ items: any[] }>("/api/admin/collections").then((d) => setItems(d.items));
  }
  useEffect(() => {
    load();
    adminFetch<{ items: any[] }>("/api/admin/products").then((d) => setProducts(d.items));
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Collections</h1>
      <form
        className="mt-6 space-y-3 rounded-2xl bg-white p-5 shadow-card"
        onSubmit={async (e) => {
          e.preventDefault();
          await adminFetch("/api/admin/collections", {
            method: "POST",
            body: JSON.stringify({
              name,
              description,
              benefitTag: "Curated",
              items: selected.map((productId) => ({ productId, weightGrams: 250 })),
            }),
          });
          setName("");
          setDescription("");
          setSelected([]);
          load();
        }}
      >
        <input className="input-field" placeholder="Collection name" value={name} onChange={(e) => setName(e.target.value)} required />
        <textarea className="input-field" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="max-h-48 overflow-y-auto rounded-xl border border-forest/10 p-3 text-sm">
          {products.slice(0, 40).map((p) => (
            <label key={p.id} className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={(e) =>
                  setSelected((s) => (e.target.checked ? [...s, p.id] : s.filter((id) => id !== p.id)))
                }
              />
              {p.name}
            </label>
          ))}
        </div>
        <button className="btn-primary" type="submit">Create collection</button>
      </form>
      <ul className="mt-6 space-y-3">
        {items.map((c) => (
          <li key={c.id} className="rounded-2xl bg-white p-4 shadow-card">
            <div className="flex justify-between">
              <div>
                <p className="font-medium text-forest">{c.name}</p>
                <p className="text-sm text-forest/50">{c.items?.length || 0} items</p>
              </div>
              <button
                type="button"
                className="text-sm text-red-700"
                onClick={async () => {
                  await adminFetch(`/api/admin/collections/${c.id}`, { method: "DELETE" });
                  load();
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
