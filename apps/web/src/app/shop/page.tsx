"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import type { Product, Category } from "@/lib/types";

function ShopInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "newest";
  const availability = searchParams.get("availability") || "";
  const premium = searchParams.get("premium") || "";
  const bestSeller = searchParams.get("bestSeller") || "";
  const discount = searchParams.get("discount") || "";

  useEffect(() => {
    apiClient<{ items: Category[] }>("/api/categories").then((d) => setCategories(d.items));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);
    if (availability) params.set("availability", availability);
    if (premium) params.set("premium", premium);
    if (bestSeller) params.set("bestSeller", bestSeller);
    if (discount) params.set("discount", discount);
    params.set("limit", "48");
    apiClient<{ items: Product[]; total: number }>(`/api/products?${params}`)
      .then((d) => {
        setProducts(d.items);
        setTotal(d.total);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [q, category, sort, availability, premium, bestSeller, discount]);

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/shop?${params.toString()}`);
  }

  return (
    <div className="container-pad section-space">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl text-forest">Shop</h1>
          <p className="mt-2 text-forest/60">{loading ? "Loading…" : `${total} products`}</p>
        </div>
      </div>

      <div id="categories" className="mt-8 flex flex-wrap gap-2">
        <FilterChip active={!category} onClick={() => update("category", "")}>
          All
        </FilterChip>
        {categories.map((c) => (
          <FilterChip
            key={c.slug}
            active={category === c.slug}
            onClick={() => update("category", c.slug)}
          >
            {c.name}
          </FilterChip>
        ))}
      </div>

      <div className="mt-6 grid gap-3 rounded-2xl bg-white p-4 shadow-card md:grid-cols-4">
        <select
          className="input-field !py-2.5 text-sm"
          value={sort}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="popularity">Popularity</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="az">A–Z</option>
          <option value="za">Z–A</option>
          <option value="best_seller">Best Seller</option>
        </select>
        <select
          className="input-field !py-2.5 text-sm"
          value={availability}
          onChange={(e) => update("availability", e.target.value)}
        >
          <option value="">Availability</option>
          <option value="in_stock">In stock</option>
          <option value="out_of_stock">Out of stock</option>
        </select>
        <select
          className="input-field !py-2.5 text-sm"
          value={premium}
          onChange={(e) => update("premium", e.target.value)}
        >
          <option value="">All qualities</option>
          <option value="true">Premium</option>
        </select>
        <select
          className="input-field !py-2.5 text-sm"
          value={discount || bestSeller}
          onChange={(e) => {
            if (e.target.value === "discount") {
              update("bestSeller", "");
              update("discount", "true");
            } else if (e.target.value === "best") {
              update("discount", "");
              update("bestSeller", "true");
            } else {
              update("discount", "");
              update("bestSeller", "");
            }
          }}
        >
          <option value="">More filters</option>
          <option value="best">Best Seller</option>
          <option value="discount">On Discount</option>
        </select>
      </div>

      {q && (
        <p className="mt-4 text-sm text-forest/60">
          Results for &ldquo;{q}&rdquo; — searches names, Hindi/Gujarati labels and alternate spellings.
        </p>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {!loading && products.length === 0 && (
        <p className="mt-16 text-center text-forest/50">No products found.</p>
      )}
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm transition ${
        active ? "bg-forest text-cream" : "bg-white text-forest shadow-card hover:bg-forest/5"
      }`}
    >
      {children}
    </button>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="container-pad py-20">Loading shop…</div>}>
      <ShopInner />
    </Suspense>
  );
}
