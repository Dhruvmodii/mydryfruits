"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HomeMotion } from "@/components/HomeMotion";

type Cta = { label?: string; href?: string };

export type HeroSlide = {
  headline?: string;
  subheading?: string;
  imageUrl?: string;
  ctaPrimary?: Cta;
  ctaSecondary?: Cta;
};

export type HeroContent = {
  autoScroll?: boolean;
  scrollInterval?: number;
  headline?: string;
  subheading?: string;
  imageUrl?: string;
  ctaPrimary?: Cta;
  ctaSecondary?: Cta;
  slides?: HeroSlide[];
};

function shopHref(href?: string) {
  if (!href) return "/shop";
  const m = href.match(/^\/shop\/([^/?#]+)$/);
  if (m) return `/shop?q=${encodeURIComponent(m[1].replace(/-/g, " "))}`;
  return href;
}

function toSlides(hero: HeroContent): HeroSlide[] {
  if (Array.isArray(hero.slides) && hero.slides.length) return hero.slides;
  return [
    {
      headline: hero.headline,
      subheading: hero.subheading,
      imageUrl: hero.imageUrl,
      ctaPrimary: hero.ctaPrimary || { label: "Shop Now", href: "/shop" },
      ctaSecondary: hero.ctaSecondary || { label: "Explore Categories", href: "/shop#categories" },
    },
  ];
}

export function HeroBanner({ hero }: { hero: HeroContent }) {
  const slides = useMemo(() => toSlides(hero), [hero]);
  const [index, setIndex] = useState(0);
  const auto = hero.autoScroll !== false && slides.length > 1;
  const interval = Math.max(1500, Number(hero.scrollInterval) || 4000);

  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [auto, interval, slides.length]);

  const slide = slides[index] || slides[0];
  const primary = slide?.ctaPrimary || { label: "Shop Now", href: "/shop" };
  const secondary = slide?.ctaSecondary;

  return (
    <section className="relative min-h-[88vh] overflow-hidden">
      <div className="absolute inset-0">
        {slides.map((s, i) => (
          <div
            key={`${s.headline || s.imageUrl || i}-${i}`}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          >
            {s.imageUrl ? (
              <Image
                src={s.imageUrl}
                alt={s.headline || "MyDryFruits"}
                fill
                priority={i === 0}
                className="object-cover"
                sizes="100vw"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-forest via-forest-light to-cream" />
            )}
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-forest-dark/85 via-forest-dark/55 to-forest-dark/25" />
      </div>

      <div className="container-pad relative flex min-h-[88vh] flex-col justify-end pb-16 pt-28 md:justify-center md:pb-24">
        <HomeMotion>
          <p className="font-display text-4xl text-cream sm:text-5xl md:text-7xl">MyDryFruits</p>
          <h1 className="mt-4 max-w-2xl font-display text-3xl leading-tight text-cream sm:text-4xl md:text-5xl">
            {slide?.headline || "Premium Dry Fruits Delivered Fresh"}
          </h1>
          {slide?.subheading ? (
            <p className="mt-4 max-w-xl text-base text-cream/80 md:text-lg">{slide.subheading}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={shopHref(primary.href)} className="btn-primary !bg-cream !text-forest hover:!bg-gold">
              {primary.label || "Shop Now"}
            </Link>
            {secondary?.href ? (
              <Link
                href={shopHref(secondary.href)}
                className="btn-secondary !border-cream/40 !bg-transparent !text-cream hover:!border-gold hover:!text-gold"
              >
                {secondary.label || "Explore"}
              </Link>
            ) : null}
          </div>
        </HomeMotion>

        {slides.length > 1 ? (
          <div className="mt-10 flex items-center gap-3">
            <button
              type="button"
              className="rounded-full border border-cream/40 px-3 py-1 text-sm text-cream hover:border-gold hover:text-gold"
              onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
              aria-label="Previous slide"
            >
              ‹
            </button>
            <div className="flex gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`h-2.5 w-2.5 rounded-full ${i === index ? "bg-gold" : "bg-cream/40"}`}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              className="rounded-full border border-cream/40 px-3 py-1 text-sm text-cream hover:border-gold hover:text-gold"
              onClick={() => setIndex((i) => (i + 1) % slides.length)}
              aria-label="Next slide"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
