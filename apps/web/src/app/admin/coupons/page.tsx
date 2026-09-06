"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";
import { toast } from "@/components/Toast";

type CouponForm = {
  code: string;
  type: string;
  value: string;
  minPurchase: string;
  maxUses: string;
  startsAt: string;
  expiresAt: string;
  active: boolean;
};

const emptyForm = (): CouponForm => ({
  code: "",
  type: "percentage",
  value: "",
  minPurchase: "",
  maxUses: "",
  startsAt: "",
  expiresAt: "",
  active: true,
});

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

function discountLabel(type: string, value: number) {
  return type === "percentage" ? `${value}% off` : `₹${value} off`;
}

export default function AdminCouponsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function load() {
    adminFetch<{ items: any[] }>("/api/admin/coupons").then((d) => setItems(d.items));
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(c: any) {
    setEditingId(c.id);
    setError("");
    setForm({
      code: c.code || "",
      type: c.type || "percentage",
      value: c.value === 0 || c.value ? String(c.value) : "",
      minPurchase: c.minPurchase === 0 || c.minPurchase ? String(c.minPurchase) : "",
      maxUses: c.maxUses == null ? "" : String(c.maxUses),
      startsAt: toLocalInput(c.startsAt),
      expiresAt: toLocalInput(c.expiresAt),
      active: c.active !== false,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.code.trim()) {
      setError("Coupon code is required.");
      toast.error("Coupon code is required.");
      return;
    }
    if (form.value.trim() === "") {
      setError("Discount value is required.");
      toast.error("Discount value is required. Type the percent or ₹ amount.");
      return;
    }
    if (form.minPurchase.trim() === "") {
      setError("Minimum purchase is required (use 0 for none).");
      toast.error("Minimum purchase is required. Use 0 if there is no minimum.");
      return;
    }

    const value = Number(form.value);
    const minPurchase = Number(form.minPurchase);
    if (Number.isNaN(value) || value < 0) {
      setError("Enter a valid discount value.");
      toast.error("Enter a valid discount value (0 or more).");
      return;
    }
    if (form.type === "percentage" && value > 100) {
      setError("Percentage cannot be more than 100.");
      toast.error("Percentage cannot be more than 100.");
      return;
    }
    if (Number.isNaN(minPurchase) || minPurchase < 0) {
      setError("Enter a valid minimum purchase.");
      toast.error("Enter a valid minimum purchase (0 or more).");
      return;
    }

    let maxUses: number | null = null;
    if (form.maxUses.trim() !== "") {
      maxUses = Number(form.maxUses);
      if (Number.isNaN(maxUses) || maxUses < 1) {
        setError("Max uses must be at least 1, or leave blank for unlimited.");
        toast.error("Max uses must be at least 1, or leave blank for unlimited.");
        return;
      }
    }

    if (form.startsAt && form.expiresAt && new Date(form.startsAt) >= new Date(form.expiresAt)) {
      setError("End date/time must be after the start date/time.");
      toast.error("End date/time must be after the start date/time.");
      return;
    }

    const payload = {
      code: form.code.trim(),
      type: form.type,
      value,
      minPurchase,
      maxUses,
      startsAt: form.startsAt || null,
      expiresAt: form.expiresAt || null,
      active: form.active,
    };

    if (editingId) {
      await adminFetch(`/api/admin/coupons/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        success: "Coupon updated successfully",
      });
    } else {
      await adminFetch("/api/admin/coupons", {
        method: "POST",
        body: JSON.stringify(payload),
        success: "Coupon created successfully",
      });
    }
    resetForm();
    load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Coupons</h1>

      <form
        className="mt-6 grid gap-4 rounded-2xl bg-white p-5 shadow-card md:grid-cols-2"
        onSubmit={onSubmit}
      >
        <label className="block text-sm text-forest/80">
          Coupon code
          <input
            className="input-field mt-1"
            placeholder="e.g. WELCOME10"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            required
          />
        </label>

        <label className="block text-sm text-forest/80">
          Discount type
          <select
            className="input-field mt-1"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="percentage">Percentage (% off)</option>
            <option value="fixed">Fixed (₹ off)</option>
          </select>
        </label>

        <label className="block text-sm text-forest/80">
          {form.type === "percentage" ? "Discount percent" : "Discount amount (₹)"}
          <input
            className="input-field mt-1"
            type="number"
            min={0}
            step="any"
            placeholder={form.type === "percentage" ? "e.g. 10" : "e.g. 100"}
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
        </label>

        <label className="block text-sm text-forest/80">
          Minimum purchase (₹)
          <input
            className="input-field mt-1"
            type="number"
            min={0}
            step="any"
            placeholder="e.g. 500 (0 = no minimum)"
            value={form.minPurchase}
            onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
          />
        </label>

        <label className="block text-sm text-forest/80 md:col-span-2">
          Max number of uses
          <input
            className="input-field mt-1"
            type="number"
            min={1}
            step={1}
            placeholder="e.g. 10 — leave blank for unlimited"
            value={form.maxUses}
            onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
          />
          <span className="mt-1 block text-xs text-forest/50">
            After this many customers use the coupon, it stops working.
          </span>
        </label>

        <label className="block text-sm text-forest/80">
          Valid from (optional)
          <input
            className="input-field mt-1"
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          />
        </label>

        <label className="block text-sm text-forest/80">
          Valid until (optional)
          <input
            className="input-field mt-1"
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-forest/80 md:col-span-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Active (customers can apply this coupon)
        </label>

        {error ? <p className="text-sm text-red-700 md:col-span-2">{error}</p> : null}

        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button className="btn-primary" type="submit">
            {editingId ? "Update coupon" : "Create coupon"}
          </button>
          {editingId ? (
            <button className="btn-secondary" type="button" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <ul className="mt-6 space-y-3">
        {items.map((c) => {
          const from = formatWhen(c.startsAt);
          const until = formatWhen(c.expiresAt);
          return (
            <li key={c.id} className="flex justify-between gap-4 rounded-2xl bg-white p-4 shadow-card">
              <div>
                <p className="font-mono text-forest">{c.code}</p>
                <p className="text-sm text-forest/50">
                  {discountLabel(c.type, Number(c.value))}
                  {" · "}
                  min purchase ₹{Number(c.minPurchase)}
                  {" · "}
                  used {c.usedCount}/{c.maxUses ?? "∞"}
                  {!c.active ? " · inactive" : ""}
                </p>
                <p className="mt-1 text-xs text-forest/40">
                  {from || until
                    ? `Valid ${from ? `from ${from}` : "anytime"}${until ? ` until ${until}` : ""}`
                    : "No date limit"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-start">
                <button type="button" className="text-sm text-forest underline" onClick={() => startEdit(c)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="text-sm text-red-700"
                  onClick={async () => {
                    await adminFetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
                    if (editingId === c.id) resetForm();
                    load();
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
