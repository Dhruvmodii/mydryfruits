"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/constants";

const TOKEN_KEY = "mydryfruits_admin_token";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/homepage", label: "Homepage" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/faqs", label: "FAQ" },
  { href: "/admin/emails", label: "Email Builder" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/bulk", label: "Bulk Orders" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setReady(true);
      return;
    }
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    fetch(`${getApiBaseUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("unauth");
        setReady(true);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        router.replace("/admin/login");
      });
  }, [pathname, router]);

  if (pathname === "/admin/login") return <>{children}</>;
  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center bg-cream text-forest/50">Loading admin…</div>;
  }

  return (
    <div className="min-h-screen bg-cream md:flex">
      <aside className="border-b border-forest/10 bg-forest text-cream md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="p-5">
          <p className="font-display text-2xl">MyDryFruits</p>
          <p className="text-xs text-cream/50">Admin</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 md:flex-col md:overflow-visible">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                pathname === item.href ? "bg-white/15 text-gold" : "text-cream/70 hover:bg-white/10 hover:text-cream"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            className="mt-2 rounded-lg px-3 py-2 text-left text-sm text-cream/50 hover:text-cream"
            onClick={() => {
              localStorage.removeItem(TOKEN_KEY);
              router.push("/admin/login");
            }}
          >
            Sign out
          </button>
        </nav>
      </aside>
      <div className="flex-1 p-4 md:p-8">{children}</div>
    </div>
  );
}

export function useAdminToken() {
  const [token, setToken] = useState("");
  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY) || "");
  }, []);
  return token;
}

export async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY) || "";
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json();
  }
  return res as unknown as T;
}
