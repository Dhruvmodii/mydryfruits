"use client";

import { FormEvent, useState } from "react";
import { apiClient } from "@/lib/api-client";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await apiClient("/api/storefront/newsletter", {
        method: "POST",
        body: JSON.stringify({ email }),
        success: "You're on the list. Offers will come to this email.",
      });
      setStatus("ok");
      setEmail("");
    } catch {
      setStatus("err");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        className="input-field flex-1"
      />
      <button type="submit" className="btn-primary whitespace-nowrap">
        Get Offers
      </button>
      {status === "ok" && <p className="w-full text-sm text-forest">You&apos;re on the list.</p>}
      {status === "err" && <p className="w-full text-sm text-red-700">Something went wrong.</p>}
    </form>
  );
}
