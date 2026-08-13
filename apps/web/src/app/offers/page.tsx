"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

type OffersData = {
  seasonal?: { banners?: { title: string; subtitle: string; href: string }[] };
  coupons?: { code: string; type: string; value: number; minPurchase: number }[];
};

export default function OffersPage() {
  const [data, setData] = useState<OffersData | null>(null);

  useEffect(() => {
    apiClient<OffersData>("/api/storefront/offers").then(setData);
  }, []);

  return (
    <div className="container-pad section-space">
      <h1 className="font-display text-4xl text-forest">Offers</h1>
      <p className="mt-2 text-forest/60">Seasonal specials and coupon codes.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {(data?.seasonal?.banners || []).map((b) => (
          <Link key={b.title} href={b.href} className="rounded-2xl bg-forest p-6 text-cream shadow-card">
            <h2 className="font-display text-2xl text-gold">{b.title}</h2>
            <p className="mt-2 text-sm text-cream/70">{b.subtitle}</p>
          </Link>
        ))}
      </div>
      <div className="mt-12 space-y-3">
        {(data?.coupons || []).map((c) => (
          <div key={c.code} className="rounded-2xl bg-white p-5 shadow-card">
            <p className="font-mono text-lg text-forest">{c.code}</p>
            <p className="text-sm text-forest/60">
              {c.type === "percentage" ? `${c.value}% off` : `₹${c.value} off`} · min ₹{c.minPurchase}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
