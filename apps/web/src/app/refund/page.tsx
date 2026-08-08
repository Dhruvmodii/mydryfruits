import { api } from "@/lib/api";

export default async function RefundPage() {
  let body = "Please contact us within 48 hours of delivery for damaged or incorrect items.";
  try {
    const data = await api<{ settings: { policies?: Record<string, string> } }>("/api/storefront/settings");
    if (data.settings.policies?.refund) body = data.settings.policies.refund;
  } catch { /* default */ }
  return (
    <div className="container-pad section-space">
      <h1 className="font-display text-4xl text-forest">Refund Policy</h1>
      <p className="mt-6 max-w-3xl leading-relaxed text-forest/70">{body}</p>
    </div>
  );
}
