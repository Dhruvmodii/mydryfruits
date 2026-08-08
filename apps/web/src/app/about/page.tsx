import { api } from "@/lib/api";

export default async function AboutPage() {
  let about = {
    title: "About MyDryFruits",
    body: "MyDryFruits is a family-owned dry fruits and healthy foods business. We source premium nuts, dried fruits and wholesome snacks — fresh stock, honest prices, and packaging that protects every order.",
  };
  try {
    const data = await api<{ settings: { about?: typeof about } }>("/api/storefront/settings");
    if (data.settings.about) about = data.settings.about as typeof about;
  } catch {
    /* use defaults */
  }

  return (
    <div className="container-pad section-space">
      <h1 className="font-display text-4xl text-forest md:text-5xl">{about.title}</h1>
      <p className="mt-6 max-w-3xl text-lg leading-relaxed text-forest/70">{about.body}</p>
    </div>
  );
}
