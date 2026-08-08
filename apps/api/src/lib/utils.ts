export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function money(n: number | string) {
  return Math.round(Number(n) * 100) / 100;
}

export function priceForWeight(pricePerKg: number | string, weightGrams: number) {
  return money((Number(pricePerKg) * weightGrams) / 1000);
}

export const WEIGHT_OPTIONS = [
  250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 3500, 4000,
] as const;

export function formatWeight(grams: number) {
  if (grams < 1000) return `${grams}g`;
  const kg = grams / 1000;
  return Number.isInteger(kg) ? `${kg}kg` : `${kg}kg`;
}

export function generateOrderNumber() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MDF${y}${m}${day}${rand}`;
}

export function estimateDelivery() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function serializeProduct<T extends Record<string, unknown>>(product: T) {
  const p = { ...product } as Record<string, unknown>;
  if (p.pricePerKg != null) p.pricePerKg = Number(p.pricePerKg);
  p.alternateNames = parseAlternateNames(p.alternateNames);
  return p;
}

export function parseAlternateNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

export function stringifyAlternateNames(names: string[] | string | undefined) {
  if (Array.isArray(names)) return JSON.stringify(names.map((n) => n.toLowerCase()));
  if (typeof names === "string") {
    try {
      const parsed = JSON.parse(names);
      if (Array.isArray(parsed)) return JSON.stringify(parsed.map((n) => String(n).toLowerCase()));
    } catch {
      /* fall through */
    }
    return JSON.stringify(
      names
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
  }
  return "[]";
}
