import { api } from "@/lib/api";

export default async function TermsPage() {
  let body = "By placing an order you agree to our pricing, delivery estimates and product availability.";
  try {
    const data = await api<{ settings: { policies?: Record<string, string> } }>("/api/storefront/settings");
    if (data.settings.policies?.terms) body = data.settings.policies.terms;
  } catch { /* default */ }
  return (
    <div className="container-pad section-space">
      <h1 className="font-display text-4xl text-forest">Terms & Conditions</h1>
      <p className="mt-6 max-w-3xl leading-relaxed text-forest/70">{body}</p>
    </div>
  );
}
