"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";

export default function AdminSeoPage() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({
    path: "/",
    title: "",
    description: "",
    keywords: "",
    ogImage: "",
    canonical: "",
  });

  function load() {
    adminFetch<{ items: any[] }>("/api/admin/seo").then((d) => setItems(d.items));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">SEO Manager</h1>
      <form
        className="mt-6 space-y-3 rounded-2xl bg-white p-5 shadow-card"
        onSubmit={async (e) => {
          e.preventDefault();
          await adminFetch("/api/admin/seo", { method: "PUT", body: JSON.stringify(form) });
          load();
          alert("Saved");
        }}
      >
        <input className="input-field" placeholder="Path e.g. /shop" value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} required />
        <input className="input-field" placeholder="Meta title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="input-field" placeholder="Meta description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className="input-field" placeholder="Keywords" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
        <input className="input-field" placeholder="OG image URL" value={form.ogImage} onChange={(e) => setForm({ ...form, ogImage: e.target.value })} />
        <input className="input-field" placeholder="Canonical URL" value={form.canonical} onChange={(e) => setForm({ ...form, canonical: e.target.value })} />
        <button className="btn-primary" type="submit">Save SEO</button>
      </form>
      <ul className="mt-6 space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.id} className="rounded-xl bg-white p-3 shadow-card">
            <button
              type="button"
              className="text-left"
              onClick={() =>
                setForm({
                  path: i.path,
                  title: i.title || "",
                  description: i.description || "",
                  keywords: i.keywords || "",
                  ogImage: i.ogImage || "",
                  canonical: i.canonical || "",
                })
              }
            >
              <span className="font-medium text-forest">{i.path}</span>
              <span className="block text-forest/50">{i.title}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-forest/50">Sitemap: /sitemap.xml · Robots: /robots.txt</p>
    </div>
  );
}
