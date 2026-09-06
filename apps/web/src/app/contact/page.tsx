"use client";

import { FormEvent, useState } from "react";
import { apiClient } from "@/lib/api-client";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await apiClient("/api/storefront/contact", {
        method: "POST",
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          message: fd.get("message"),
        }),
        success: "Message sent successfully. We'll reply soon.",
      });
      setStatus("ok");
      e.currentTarget.reset();
    } catch {
      setStatus("err");
    }
  }

  return (
    <div className="container-pad section-space">
      <h1 className="font-display text-4xl text-forest">Contact</h1>
      <p className="mt-2 text-forest/60">Questions, bulk orders, or festival hampers — write to us.</p>
      <form onSubmit={onSubmit} className="mt-10 max-w-xl space-y-4">
        <input name="name" required placeholder="Name" className="input-field" />
        <input name="email" type="email" required placeholder="Email" className="input-field" />
        <textarea name="message" required rows={5} placeholder="Message" className="input-field" />
        <button type="submit" className="btn-primary">
          Send message
        </button>
        {status === "ok" && <p className="text-sm text-forest">Thanks — we&apos;ll reply soon.</p>}
        {status === "err" && <p className="text-sm text-red-700">Could not send. Try again.</p>}
      </form>
    </div>
  );
}
