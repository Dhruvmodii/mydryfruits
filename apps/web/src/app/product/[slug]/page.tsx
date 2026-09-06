"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { ProductCard } from "@/components/ProductCard";
import { BulkOrderModal } from "@/components/BulkOrderModal";
import { useCart } from "@/store/cart";
import { formatINR, priceForWeight, WEIGHT_OPTIONS } from "@/lib/constants";
import type { Product } from "@/lib/types";

export default function ProductPage() {
  const params = useParams();
  const slug = String(params.slug);
  const addItem = useCart((s) => s.addItem);
  const [data, setData] = useState<{
    product: Product;
    related: Product[];
    frequentlyBought: Product[];
  } | null>(null);
  const [weight, setWeight] = useState(500);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    apiClient<{ product: Product; related: Product[]; frequentlyBought: Product[] }>(
      `/api/products/${slug}`,
      { silent: true }
    ).then(setData);
  }, [slug]);

  if (!data) {
    return <div className="container-pad py-24 text-forest/50">Loading product…</div>;
  }

  const { product, related, frequentlyBought } = data;
  const unit = priceForWeight(product.pricePerKg, weight);
  const price =
    product.discountPercent > 0 ? unit * (1 - product.discountPercent / 100) : unit;
  const image = product.images?.[0]?.url || product.imageUrl;

  function addToCart() {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      pricePerKg: product.pricePerKg,
      weightGrams: weight,
      quantity: 1,
      discountPercent: product.discountPercent,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div className="container-pad section-space">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-white shadow-card">
          {image && (
            <Image
              src={image}
              alt={product.name}
              fill
              className={`object-cover transition duration-300 ${zoom ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"}`}
              onClick={() => setZoom((z) => !z)}
              sizes="(max-width:1024px) 100vw, 50vw"
              priority
            />
          )}
        </div>

        <div>
          <p className="text-sm uppercase tracking-wider text-gold">
            {product.category?.name}
          </p>
          <h1 className="mt-2 font-display text-4xl text-forest md:text-5xl">{product.name}</h1>
          {(product.localName || product.description) && (
            <p className="mt-2 text-lg text-forest/55">{product.localName || product.description}</p>
          )}
          <div className="mt-3 flex items-center gap-2 text-forest/60">
            <span className="text-gold">★ {product.rating.toFixed(1)}</span>
            {product.inStock ? (
              <span className="rounded-full bg-forest/10 px-2 py-0.5 text-xs text-forest">In stock</span>
            ) : (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Out of stock</span>
            )}
          </div>

          <p className="mt-6 font-display text-3xl text-forest">
            {formatINR(price)}
            <span className="ml-2 text-base font-sans font-normal text-forest/45">
              ({formatINR(product.pricePerKg)}/kg)
            </span>
          </p>

          <label className="mt-8 block text-sm font-medium text-forest">Quantity</label>
          <select
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="input-field mt-2 max-w-xs"
          >
            {WEIGHT_OPTIONS.map((w) => (
              <option key={w.grams} value={w.grams}>
                {w.label}
              </option>
            ))}
          </select>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!product.inStock}
              onClick={addToCart}
              className="btn-primary min-w-[160px] disabled:opacity-50"
            >
              {added ? "Added to cart" : "Add to Cart"}
            </button>
            <button type="button" onClick={() => setBulkOpen(true)} className="btn-secondary">
              Above 4kg — Bulk Order
            </button>
          </div>

          <div className="mt-10 space-y-6 border-t border-forest/10 pt-8 text-sm leading-relaxed text-forest/70">
            {product.benefits && (
              <div>
                <h2 className="font-display text-xl text-forest">Benefits</h2>
                <p className="mt-2">{product.benefits}</p>
              </div>
            )}
            {product.storageTips && (
              <div>
                <h2 className="font-display text-xl text-forest">Storage tips</h2>
                <p className="mt-2">{product.storageTips}</p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {product.origin && <p><span className="text-forest">Origin:</span> {product.origin}</p>}
              {product.shelfLife && <p><span className="text-forest">Shelf life:</span> {product.shelfLife}</p>}
            </div>
            <p>
              <span className="text-forest">Delivery:</span> Most orders packed within 24–48 hours.
              Estimate shown at checkout.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-20">
        <h2 className="font-display text-3xl text-forest">Related products</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {related.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-3xl text-forest">Frequently bought together</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {frequentlyBought.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <p className="mt-10 text-center text-sm">
        <Link href="/shop" className="text-forest hover:text-gold">
          ← Continue shopping
        </Link>
      </p>

      <BulkOrderModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        productName={product.name}
        productId={product.id}
      />
    </div>
  );
}
