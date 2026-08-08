"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    adminFetch("/api/admin/analytics").then(setData);
  }, []);
  if (!data) return <p>Loading…</p>;
  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Analytics</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card label="Visitors (30d)" value={data.visitors} />
        <Card label="Orders tracked" value={data.orders} />
        <Card label="Conversion %" value={data.conversionRate} />
      </div>
      <h2 className="mt-8 font-display text-xl text-forest">Top products</h2>
      <ul className="mt-3 space-y-2">
        {data.topProducts?.map((p: any) => (
          <li key={p.productName} className="rounded-xl bg-white p-3 shadow-card text-sm">
            {p.productName} · {p._count}
          </li>
        ))}
      </ul>
      <h2 className="mt-8 font-display text-xl text-forest">Events by type</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {Object.entries(data.byType || {}).map(([k, v]) => (
          <li key={k} className="rounded-xl bg-white p-3 shadow-card">
            {k}: {String(v)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <p className="text-sm text-forest/50">{label}</p>
      <p className="mt-1 font-display text-2xl text-forest">{value}</p>
    </div>
  );
}
