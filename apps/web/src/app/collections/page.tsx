import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import type { Collection } from "@/lib/types";
import { formatINR } from "@/lib/constants";

export const revalidate = 60;

export default async function CollectionsPage() {
  let items: Collection[] = [];
  try {
    const data = await api<{ items: Collection[] }>("/api/collections");
    items = data.items;
  } catch {
    items = [];
  }

  return (
    <div className="container-pad section-space">
      <h1 className="font-display text-4xl text-forest">Curated collections</h1>
      <p className="mt-2 max-w-xl text-forest/60">
        Ready-made packs for gifting, fitness, kids and everyday wellness — higher value, easier choosing.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <Link
            key={c.id}
            href={`/collections/${c.slug}`}
            className="group overflow-hidden rounded-3xl bg-white shadow-card transition hover:shadow-soft"
          >
            <div className="relative aspect-[16/10] bg-cream-dark">
              {c.imageUrl && (
                <Image src={c.imageUrl} alt={c.name} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="33vw" />
              )}
            </div>
            <div className="p-5">
              {c.benefitTag && <p className="text-xs uppercase tracking-wider text-gold">{c.benefitTag}</p>}
              <h2 className="mt-1 font-display text-2xl text-forest">{c.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-forest/60">{c.description}</p>
              <p className="mt-4 font-medium text-forest">From {formatINR(c.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
