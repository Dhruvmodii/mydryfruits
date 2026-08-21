import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AnalyticsBeacon } from "@/components/AnalyticsBeacon";
import { api } from "@/lib/api";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const revalidate = 60;

type StorefrontLite = {
  categories: { name: string; slug: string }[];
  settings: {
    policies?: Record<string, string>;
    branding?: { faviconUrl?: string };
  };
};

async function getStorefrontLite(): Promise<StorefrontLite> {
  try {
    return await api<StorefrontLite>("/api/storefront");
  } catch {
    return { categories: [], settings: {} };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await getStorefrontLite();
  const faviconUrl = data.settings?.branding?.faviconUrl?.trim();

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${SITE_NAME} — Premium Dry Fruits Delivered Fresh`,
      template: `%s | ${SITE_NAME}`,
    },
    description:
      "Shop premium almonds, cashews, pistachios, dates and healthy snacks. Fresh stock, natural quality, fast delivery.",
    openGraph: {
      siteName: SITE_NAME,
      type: "website",
    },
    ...(faviconUrl
      ? {
          icons: {
            icon: [{ url: faviconUrl }],
            shortcut: faviconUrl,
            apple: faviconUrl,
          },
        }
      : {}),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const data = await getStorefrontLite();
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} min-h-screen antialiased`}>
        <Navbar />
        <main>{children}</main>
        <Footer categories={data.categories} policies={data.settings?.policies as never} />
        <AnalyticsBeacon />
      </body>
    </html>
  );
}
