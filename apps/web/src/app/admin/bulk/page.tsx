"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";

export default function AdminBulkPage() {
  const [items, setItems] = useState<any[]>([]);
  function load() {
    adminFetch<{ items: any[] }>("/api/admin/bulk-inquiries").then((d) => setItems(d.items));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Bulk Orders</h1>
      <ul className="mt-6 space-y-3">
        {items.map((i) => (
          <li key={i.id} className="rounded-2xl bg-white p-4 shadow-card">
            <p className="font-medium text-forest">
              {i.name} · {i.email}
            </p>
            <p className="text-sm text-forest/60">
              {i.productName} — {i.requiredQuantity}
            </p>
            {i.message && <p className="mt-1 text-sm">{i.message}</p>}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs uppercase tracking-wide text-gold">{i.status}</span>
              {i.status === "NEW" && (
                <button
                  type="button"
                  className="btn-secondary !py-2 text-sm"
                  onClick={async () => {
                    await adminFetch(`/api/admin/bulk-inquiries/${i.id}/convert`, { method: "POST" });
                    load();
                  }}
                >
                  Convert to order
                </button>
              )}
            </div>
          </li>
        ))}
        {items.length === 0 && <p className="text-forest/50">No bulk inquiries yet.</p>}
      </ul>
    </div>
  );
}
