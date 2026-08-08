"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useCart } from "@/store/cart";
import { formatINR, formatWeight } from "@/lib/constants";
import type { Collection } from "@/lib/types";

export default function CollectionDetailPage() {
  const params = useParams();
  const addItem = useCart((s) => s.addItem);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    apiClient<{ collection: Collection }>(`/api/collections/${params.slug}`).then((d) =>
      setCollection(d.collection)
    );
  }, [params.slug]);

  if (!collection) {
    return <div className="container-pad py-24 text-forest/50">Loading collection…</div>;
  }

  function addAll() {
    if (!collection) return;
    for (const item of collection.items) {
      addItem({
        productId: item.product.id,
        slug: item.product.slug,
        name: item.product.name,
        imageUrl: item.product.imageUrl,
        pricePerKg: item.product.pricePerKg,
        weightGrams: item.weightGrams,
        quantity: 1,
        discountPercent: item.product.discountPercent,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="container-pad section-space">
      <p className="text-sm uppercase tracking-wider text-gold">{collection.benefitTag}</p>
      <h1 className="mt-2 font-display text-4xl text-forest md:text-5xl">{collection.name}</h1>
      <p className="mt-3 max-w-2xl text-forest/60">{collection.description}</p>
      <p className="mt-4 font-display text-3xl text-forest">{formatINR(collection.price)}</p>
      <button type="button" onClick={addAll} className="btn-primary mt-6">
        {added ? "Added pack to cart" : "Add entire pack to cart"}
      </button>

      <div className="mt-12 space-y-4">
        {collection.items.map((item) => (
          <div key={item.product.id} className="flex gap-4 rounded-2xl bg-white p-4 shadow-card">
            <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-cream-dark">
              {item.product.imageUrl && (
                <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" sizes="80px" />
              )}
            </div>
            <div className="flex-1">
              <Link href={`/product/${item.product.slug}`} className="font-medium text-forest hover:text-gold">
                {item.product.name}
              </Link>
              <p className="text-sm text-forest/55">
                {formatWeight(item.weightGrams)} · {formatINR(item.linePrice)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
