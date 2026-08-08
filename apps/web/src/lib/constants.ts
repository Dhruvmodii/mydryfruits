export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "MyDryFruits";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";

export const WEIGHT_OPTIONS = [
  { grams: 250, label: "250g" },
  { grams: 500, label: "500g" },
  { grams: 750, label: "750g" },
  { grams: 1000, label: "1kg" },
  { grams: 1250, label: "1.25kg" },
  { grams: 1500, label: "1.5kg" },
  { grams: 1750, label: "1.75kg" },
  { grams: 2000, label: "2kg" },
  { grams: 2500, label: "2.5kg" },
  { grams: 3000, label: "3kg" },
  { grams: 3500, label: "3.5kg" },
  { grams: 4000, label: "4kg" },
] as const;

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function priceForWeight(pricePerKg: number, weightGrams: number) {
  return Math.round(((pricePerKg * weightGrams) / 1000) * 100) / 100;
}

export function formatWeight(grams: number) {
  if (grams < 1000) return `${grams}g`;
  const kg = grams / 1000;
  return `${kg}kg`;
}
