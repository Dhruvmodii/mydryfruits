"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";
import { formatINR } from "@/lib/constants";

export default function AdminProductsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    name: "",
    pricePerKg: 1000,
    categoryId: "",
    description: "",
    alternateNames: "",
    inStock: true,
    isFeatured: false,
    isBestSeller: false,
    isTrending: false,
    isNewArrival: false,
    isPremium: false,
    hidden: false,
    imageUrl: "",
  });

  function load() {
    adminFetch<{ items: any[] }>(`/api/admin/products?q=${encodeURIComponent(q)}`).then((d) =>
      setItems(d.items)
    );
  }

  useEffect(() => {
    load();
    adminFetch<{ items: any[] }>("/api/admin/categories").then((d) => setCategories(d.items));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      pricePerKg: Number(form.pricePerKg),
      alternateNames: String(form.alternateNames || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean),
    };
    if (editing) {
      await adminFetch(`/api/admin/products/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await adminFetch("/api/admin/products", { method: "POST", body: JSON.stringify(payload) });
    }
    setEditing(null);
    setForm({
      name: "",
      pricePerKg: 1000,
      categoryId: categories[0]?.id || "",
      description: "",
      alternateNames: "",
      inStock: true,
      isFeatured: false,
      isBestSeller: false,
      isTrending: false,
      isNewArrival: false,
      isPremium: false,
      hidden: false,
      imageUrl: "",
    });
    load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Products</h1>
      <div className="mt-4 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="input-field max-w-xs" />
        <button type="button" onClick={load} className="btn-secondary">
          Search
        </button>
      </div>

      <form onSubmit={save} className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow-card md:grid-cols-2">
        <h2 className="md:col-span-2 font-display text-xl text-forest">
          {editing ? "Edit product" : "Create product"}
        </h2>
        <input className="input-field" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input-field" type="number" placeholder="Price per kg" value={form.pricePerKg} onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })} required />
        <select className="input-field" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
          <option value="">Category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input className="input-field" placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        <input className="input-field md:col-span-2" placeholder="Local name / description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className="input-field md:col-span-2" placeholder="Alternate names (comma separated)" value={form.alternateNames} onChange={(e) => setForm({ ...form, alternateNames: e.target.value })} />
        <div className="md:col-span-2 flex flex-wrap gap-4 text-sm">
          {(["inStock", "isFeatured", "isBestSeller", "isTrending", "isNewArrival", "isPremium", "hidden"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />
              {k}
            </label>
          ))}
        </div>
        <div className="md:col-span-2 flex gap-2">
          <button type="submit" className="btn-primary">{editing ? "Update" : "Create"}</button>
          {editing && (
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-8 overflow-x-auto rounded-2xl bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-forest/10 text-forest/50">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price/kg</th>
              <th className="p-3">Flags</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-forest/5">
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.category?.name}</td>
                <td className="p-3">{formatINR(p.pricePerKg)}</td>
                <td className="p-3 text-xs">
                  {p.hidden && "hidden "}
                  {p.isFeatured && "featured "}
                  {p.isBestSeller && "best "}
                  {!p.inStock && "oos"}
                </td>
                <td className="p-3 space-x-2">
                  <button
                    type="button"
                    className="text-gold"
                    onClick={() => {
                      setEditing(p);
                      setForm({
                        ...p,
                        alternateNames: (p.alternateNames || []).join(", "),
                        categoryId: p.categoryId,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-red-700"
                    onClick={async () => {
                      if (!confirm("Delete?")) return;
                      await adminFetch(`/api/admin/products/${p.id}`, { method: "DELETE" });
                      load();
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
