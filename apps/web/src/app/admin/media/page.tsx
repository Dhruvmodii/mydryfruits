"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";
import { getApiBaseUrl } from "@/lib/constants";
import { toast } from "@/components/Toast";

export default function AdminMediaPage() {
  const [items, setItems] = useState<any[]>([]);

  function load() {
    adminFetch<{ items: any[] }>("/api/admin/media").then((d) => setItems(d.items));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Media Library</h1>
      <p className="mt-2 text-sm text-forest/55">
        Max <strong>2MB</strong> per image (kept small for free AWS disk). Prefer compressed JPG/WebP.
      </p>
      <input
        type="file"
        accept="image/*"
        className="mt-6 block"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 2 * 1024 * 1024) {
            toast.error("Image must be 2MB or smaller. Compress it and try again.");
            e.target.value = "";
            return;
          }
          const fd = new FormData();
          fd.append("file", file);
          const token = localStorage.getItem("mydryfruits_admin_token");
          const res = await fetch(`${getApiBaseUrl()}/api/admin/media`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            toast.error(body.error || "Upload failed. Use JPG/PNG under 2MB.");
          } else {
            toast.success("Image uploaded successfully");
          }
          e.target.value = "";
          load();
        }}
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((m) => (
          <div key={m.id} className="rounded-2xl bg-white p-3 shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.url} alt={m.alt || ""} className="aspect-square w-full rounded-xl object-cover" />
            <button
              type="button"
              className="mt-2 text-sm text-red-700"
              onClick={async () => {
                await adminFetch(`/api/admin/media/${m.id}`, { method: "DELETE" });
                load();
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
