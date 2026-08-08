"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_NAME } from "@/lib/constants";

export function Footer({
  categories = [],
}: {
  categories?: { name: string; slug: string }[];
  policies?: { privacy?: string; refund?: string; terms?: string };
}) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-forest/10 bg-forest text-cream">
      <div className="container-pad grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <p className="font-display text-3xl">{SITE_NAME}</p>
          <p className="mt-3 text-sm leading-relaxed text-cream/70">
            Premium dry fruits and healthy foods — fresh stock, natural quality, delivered with care.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-gold">Categories</p>
          <ul className="space-y-2 text-sm text-cream/80">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link href={`/shop?category=${c.slug}`} className="hover:text-gold">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-gold">Quick Links</p>
          <ul className="space-y-2 text-sm text-cream/80">
            <li><Link href="/shop" className="hover:text-gold">Shop</Link></li>
            <li><Link href="/collections" className="hover:text-gold">Collections</Link></li>
            <li><Link href="/offers" className="hover:text-gold">Offers</Link></li>
            <li><Link href="/about" className="hover:text-gold">About</Link></li>
            <li><Link href="/contact" className="hover:text-gold">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-gold">Contact</p>
          <ul className="space-y-2 text-sm text-cream/80">
            <li>hello@mydryfruits.com</li>
            <li>+91 98765 43210</li>
          </ul>
          <div className="mt-6 flex gap-4 text-sm text-cream/70">
            <Link href="/privacy" className="hover:text-gold">Privacy</Link>
            <Link href="/refund" className="hover:text-gold">Refund</Link>
            <Link href="/terms" className="hover:text-gold">Terms</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-cream/50">
        © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
