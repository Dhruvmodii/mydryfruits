"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { formatINR, priceForWeight, WEIGHT_OPTIONS } from "@/lib/constants";
import { useCart } from "@/store/cart";

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCart((s) => s.addItem);
  const [weight, setWeight] = useState(250);
  const [added, setAdded] = useState(false);

  const unit = priceForWeight(product.pricePerKg, weight);
  const price =
    product.discountPercent > 0 ? unit * (1 - product.discountPercent / 100) : unit;

  function add() {
    if (!product.inStock) return;
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
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
      <Link href={`/product/${product.slug}`} className="relative aspect-[4/3] overflow-hidden bg-cream-dark">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width:768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-forest/30">No image</div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1">
          {product.isBestSeller && <Badge>Best Seller</Badge>}
          {product.isNewArrival && <Badge>New</Badge>}
          {product.isTrending && <Badge>Trending</Badge>}
          {product.discountPercent > 0 && <Badge>{product.discountPercent}% off</Badge>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-display text-lg leading-snug text-forest">{product.name}</h3>
          {(product.localName || product.description) && (
            <p className="mt-0.5 text-sm text-forest/55">{product.localName || product.description}</p>
          )}
        </Link>
        <div className="mt-2 flex items-center gap-2 text-sm text-forest/60">
          <span className="text-gold">★</span>
          <span>{product.rating.toFixed(1)}</span>
        </div>
        <p className="mt-2 font-medium text-forest">
          {formatINR(price)}
          <span className="ml-1 text-xs font-normal text-forest/50">/ {WEIGHT_OPTIONS.find((w) => w.grams === weight)?.label}</span>
        </p>
        <div className="mt-auto flex gap-2 pt-4">
          <select
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="input-field !min-h-[44px] !py-2 text-sm"
            aria-label="Weight"
          >
            {WEIGHT_OPTIONS.map((w) => (
              <option key={w.grams} value={w.grams}>
                {w.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={!product.inStock}
            className="btn-primary !min-h-[44px] flex-1 !px-3 !py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {added ? "Added" : product.inStock ? "Add" : "Sold out"}
          </button>
        </div>
        <Link
          href={`/product/${product.slug}`}
          className="mt-2 text-center text-xs text-forest/50 hover:text-gold"
        >
          Quick view
        </Link>
      </div>
    </article>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-forest/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cream">
      {children}
    </span>
  );
}
