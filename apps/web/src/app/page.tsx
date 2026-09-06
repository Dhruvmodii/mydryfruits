import Link from "next/link";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import type { Product, Category } from "@/lib/types";
import { HeroBanner } from "@/components/HeroBanner";

export const revalidate = 10;

async function getHome() {
  return api<{
    sections: Record<string, { content: any; title?: string }>;
    reviews: { customerName: string; rating: number; comment: string; productName?: string }[];
    faqs: { question: string; answer: string }[];
    categories: Category[];
    featuredProducts: Product[];
    settings: { business?: { yearsInBusiness?: number; tagline?: string } };
  }>("/api/storefront");
}

export default async function HomePage() {
  let data: Awaited<ReturnType<typeof getHome>> | null = null;
  try {
    data = await getHome();
  } catch {
    data = null;
  }

  const hero = data?.sections?.hero?.content || {
    headline: "Premium Dry Fruits Delivered Fresh",
    subheading: "100% Natural • Fresh Stock • Premium Quality",
    imageUrl: "",
  };
  const trust = data?.sections?.trust?.content?.items || [];
  const seasonal = data?.sections?.seasonal?.content?.banners || [];
  const benefits = data?.sections?.benefits?.content?.items || [];
  const years = data?.settings?.business?.yearsInBusiness || 25;

  return (
    <>
      <HeroBanner hero={hero} />

      <section className="section-space bg-cream">
        <div className="container-pad">
          <h2 className="font-display text-3xl text-forest md:text-4xl">Why choose us</h2>
          <p className="mt-2 max-w-xl text-forest/60">Family business for {years}+ years — quality you can taste.</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trust.map((item: { title: string; text: string }) => (
              <div key={item.title} className="rounded-2xl bg-white p-6 shadow-card">
                <h3 className="font-display text-xl text-forest">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-forest/65">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="categories" className="section-space bg-cream-dark/40">
        <div className="container-pad">
          <h2 className="font-display text-3xl text-forest md:text-4xl">Categories</h2>
          <p className="mt-2 text-forest/60">Find exactly what you need.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {(data?.categories || []).map((c) => (
              <Link
                key={c.id}
                href={`/shop?category=${c.slug}`}
                className="group rounded-2xl bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft"
              >
                <h3 className="font-display text-xl text-forest group-hover:text-gold">{c.name}</h3>
                <p className="mt-2 text-sm text-forest/55">{c.productCount} products</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="container-pad">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl text-forest md:text-4xl">Featured products</h2>
              <p className="mt-2 text-forest/60">Best sellers, new arrivals and trending picks.</p>
            </div>
            <Link href="/shop" className="hidden text-sm text-forest hover:text-gold sm:inline">
              View all →
            </Link>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(data?.featuredProducts || []).slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-space bg-forest text-cream">
        <div className="container-pad">
          <h2 className="font-display text-3xl md:text-4xl">Seasonal picks</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {seasonal.map((b: { title: string; subtitle: string; href: string }) => (
              <Link
                key={b.title}
                href={b.href}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-gold/50 hover:bg-white/10"
              >
                <h3 className="font-display text-2xl text-gold">{b.title}</h3>
                <p className="mt-2 text-sm text-cream/70">{b.subtitle}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="container-pad">
          <h2 className="font-display text-3xl text-forest md:text-4xl">Healthy benefits</h2>
          <p className="mt-2 text-forest/60">Nature&apos;s nutrition, simply explained.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b: { name: string; benefit: string; productSlug: string }) => (
              <Link
                key={b.name}
                href={`/product/${b.productSlug}`}
                className="rounded-2xl bg-white p-6 shadow-card transition hover:shadow-soft"
              >
                <h3 className="font-display text-xl text-forest">{b.name}</h3>
                <p className="mt-2 text-gold">{b.benefit}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space bg-cream-dark/30">
        <div className="container-pad">
          <h2 className="font-display text-3xl text-forest md:text-4xl">Customer reviews</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {(data?.reviews || []).map((r) => (
              <blockquote key={r.customerName + r.comment.slice(0, 12)} className="rounded-2xl bg-white p-5 shadow-card">
                <p className="text-gold">{"★".repeat(r.rating)}</p>
                <p className="mt-3 text-sm leading-relaxed text-forest/75">{r.comment}</p>
                <footer className="mt-4 text-sm font-medium text-forest">{r.customerName}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="container-pad max-w-3xl">
          <h2 className="font-display text-3xl text-forest md:text-4xl">FAQ</h2>
          <div className="mt-8 space-y-4">
            {(data?.faqs || []).map((f) => (
              <details key={f.question} className="group rounded-2xl bg-white p-5 shadow-card">
                <summary className="cursor-pointer list-none font-medium text-forest">
                  {f.question}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-forest/65">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space bg-forest/5">
        <div className="container-pad text-center">
          <h2 className="font-display text-3xl text-forest md:text-4xl">Get offers</h2>
          <p className="mx-auto mt-2 max-w-md text-forest/60">
            Festival deals and fresh-stock alerts — no spam.
          </p>
          <div className="mt-8">
            <NewsletterForm />
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Store",
            name: "MyDryFruits",
            description: "Premium dry fruits and healthy foods",
            url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          }),
        }}
      />
    </>
  );
}
