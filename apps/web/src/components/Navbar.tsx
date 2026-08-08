"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/store/cart";
import { SITE_NAME } from "@/lib/constants";

const links = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/shop#categories", label: "Categories" },
  { href: "/offers", label: "Offers" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const count = useCart((s) => s.count());
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
  }

  if (pathname?.startsWith("/admin")) return null;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-cream/95 shadow-soft backdrop-blur-md" : "bg-cream/80 backdrop-blur-sm"
      }`}
    >
      <div className="container-pad flex h-16 items-center gap-4 md:h-20">
        <Link href="/" className="font-display text-2xl tracking-tight text-forest md:text-3xl">
          {SITE_NAME}
        </Link>

        <nav className="ml-8 hidden items-center gap-6 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm tracking-wide transition hover:text-gold ${
                pathname === l.href ? "text-forest font-medium" : "text-forest/70"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={onSearch} className="ml-auto hidden max-w-xs flex-1 md:block lg:max-w-sm">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search badam, kaju, dates…"
            className="input-field !py-2.5 text-sm"
            aria-label="Search products"
          />
        </form>

        <Link href="/cart" className="relative ml-2 rounded-xl p-2.5 text-forest hover:bg-forest/5">
          <span className="sr-only">Cart</span>
          <CartIcon />
          {mounted && count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] font-semibold text-forest-dark">
              {count}
            </span>
          )}
        </Link>

        <button
          type="button"
          className="rounded-xl p-2.5 text-forest hover:bg-forest/5 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          <MenuIcon open={open} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-forest/10 bg-cream lg:hidden"
          >
            <div className="container-pad flex flex-col gap-1 py-4">
              <form onSubmit={onSearch} className="mb-3">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search products…"
                  className="input-field text-sm"
                />
              </form>
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-xl px-3 py-3 text-base text-forest hover:bg-white"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 6h15l-1.5 9h-12z" />
      <path d="M6 6l-2-3H2" />
      <circle cx="9" cy="20" r="1.2" fill="currentColor" />
      <circle cx="17" cy="20" r="1.2" fill="currentColor" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : (
        <>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </>
      )}
    </svg>
  );
}
