"use client";

import { FormEvent, useState } from "react";
import { apiClient } from "@/lib/api-client";

export function BulkOrderModal({
  open,
  onClose,
  productName,
  productId,
}: {
  open: boolean;
  onClose: () => void;
  productName: string;
  productId?: string;
}) {
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await apiClient("/api/bulk", {
        method: "POST",
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          requiredQuantity: fd.get("quantity"),
          message: fd.get("message") || undefined,
          productName,
          productId,
        }),
        success: "Bulk inquiry sent. We'll email you shortly.",
      });
      setStatus("ok");
    } catch {
      setStatus("err");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-forest-dark/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-cream p-6 shadow-soft">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-forest">Bulk Order</h2>
            <p className="mt-1 text-sm text-forest/60">{productName} — above 4kg</p>
          </div>
          <button type="button" onClick={onClose} className="text-forest/50 hover:text-forest">
            Close
          </button>
        </div>
        {status === "ok" ? (
          <p className="text-forest">Thanks — we&apos;ve emailed your acknowledgement. Our team will follow up shortly.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input name="name" required placeholder="Your name" className="input-field" />
            <input name="email" type="email" required placeholder="Email" className="input-field" />
            <input name="quantity" required placeholder="Required quantity (e.g. 10kg)" className="input-field" />
            <textarea name="message" placeholder="Message (optional)" rows={3} className="input-field !min-h-0" />
            {status === "err" && <p className="text-sm text-red-700">Could not submit. Try again.</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Sending…" : "Submit inquiry"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
