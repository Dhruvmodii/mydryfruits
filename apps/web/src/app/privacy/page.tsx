import { api } from "@/lib/api";

async function getPolicy(key: "privacy" | "refund" | "terms") {
  try {
    const data = await api<{ settings: { policies?: Record<string, string> } }>("/api/storefront/settings");
    return data.settings.policies?.[key] || "Policy content will appear here.";
  } catch {
    return "Policy content will appear here.";
  }
}

export default async function PrivacyPage() {
  const body = await getPolicy("privacy");
  return (
    <div className="container-pad section-space prose-forest">
      <h1 className="font-display text-4xl text-forest">Privacy Policy</h1>
      <p className="mt-6 max-w-3xl leading-relaxed text-forest/70">{body}</p>
    </div>
  );
}
