"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");

  function load() {
    adminFetch<{ items: any[] }>("/api/admin/categories").then((d) => setItems(d.items));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Categories</h1>
      <form
        className="mt-6 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await adminFetch("/api/admin/categories", {
            method: "POST",
            body: JSON.stringify({ name }),
          });
          setName("");
          load();
        }}
      >
        <input className="input-field max-w-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" required />
        <button className="btn-primary" type="submit">Add</button>
      </form>
      <ul className="mt-6 space-y-3">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-card">
            <div>
              <p className="font-medium text-forest">{c.name}</p>
              <p className="text-sm text-forest/50">{c.productCount} products · {c.slug}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-sm text-gold"
                onClick={async () => {
                  await adminFetch(`/api/admin/categories/${c.id}`, {
                    method: "PUT",
                    body: JSON.stringify({ ...c, hidden: !c.hidden }),
                  });
                  load();
                }}
              >
                {c.hidden ? "Show" : "Hide"}
              </button>
              <button
                type="button"
                className="text-sm text-red-700"
                onClick={async () => {
                    await adminFetch(`/api/admin/categories/${c.id}`, { method: "DELETE", success: "Category deleted" });
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
