"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/store/cart";
import { apiClient } from "@/lib/api";
import { formatINR } from "@/lib/constants";

const CHECKOUT_KEY = "mydryfruits_checkout_details";

type CheckoutDetails = {
  name: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
};

const emptyDetails: CheckoutDetails = {
  name: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function loadLocalDetails(): CheckoutDetails {
  try {
    const raw = localStorage.getItem(CHECKOUT_KEY);
    if (!raw) return emptyDetails;
    return { ...emptyDetails, ...JSON.parse(raw) };
  } catch {
    return emptyDetails;
  }
}

function saveLocalDetails(details: CheckoutDetails) {
  localStorage.setItem(CHECKOUT_KEY, JSON.stringify(details));
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [details, setDetails] = useState<CheckoutDetails>(emptyDetails);
  const [ready, setReady] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [autofilled, setAutofilled] = useState(false);
  const lookupEmail = useRef("");

  const cartTotal = subtotal();
  const emailOk = useMemo(() => isValidEmail(details.email), [details.email]);

  useEffect(() => {
    setDetails(loadLocalDetails());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !emailOk) return;
    const email = details.email.trim().toLowerCase();
    if (email === lookupEmail.current) return;

    const timer = setTimeout(async () => {
      lookupEmail.current = email;
      try {
        const res = await apiClient<{
          details: {
            customerName: string;
            customerEmail: string;
            addressLine1: string;
            addressLine2?: string;
            city: string;
            state: string;
            pincode: string;
          } | null;
        }>(`/api/orders/saved-details?email=${encodeURIComponent(email)}`);

        if (!res.details) return;

        setDetails((prev) => ({
          name: res.details!.customerName || prev.name,
          email: res.details!.customerEmail || prev.email,
          addressLine1: res.details!.addressLine1 || prev.addressLine1,
          addressLine2: res.details!.addressLine2 || prev.addressLine2,
          city: res.details!.city || prev.city,
          state: res.details!.state || prev.state,
          pincode: res.details!.pincode || prev.pincode,
        }));
        setAutofilled(true);
      } catch {
        // ignore lookup failures — guest can still type manually
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [details.email, emailOk, ready]);

  function updateField<K extends keyof CheckoutDetails>(key: K, value: CheckoutDetails[K]) {
    setDetails((prev) => ({ ...prev, [key]: value }));
    if (key === "email") setAutofilled(false);
  }

  if (items.length === 0) {
    return (
      <div className="container-pad section-space text-center">
        <h1 className="font-display text-4xl text-forest">Nothing to checkout</h1>
        <Link href="/shop" className="btn-primary mt-8 inline-flex">
          Shop now
        </Link>
      </div>
    );
  }

  async function applyCoupon() {
    try {
      const res = await apiClient<{ discount: number }>("/api/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code: coupon, subtotal: cartTotal }),
      });
      setDiscount(res.discount);
      setError("");
    } catch (e) {
      setDiscount(0);
      setError(e instanceof Error ? e.message : "Invalid coupon");
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!emailOk) {
      setEmailTouched(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...details,
        email: details.email.trim().toLowerCase(),
      };
      saveLocalDetails(payload);

      const res = await apiClient<{ order: { orderNumber: string } }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: payload.name,
          customerEmail: payload.email,
          addressLine1: payload.addressLine1,
          addressLine2: payload.addressLine2 || undefined,
          city: payload.city,
          state: payload.state,
          pincode: payload.pincode,
          couponCode: coupon || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            weightGrams: i.weightGrams,
            quantity: i.quantity,
          })),
        }),
      });
      clear();
      router.push(`/order/${res.order.orderNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-pad section-space">
      <h1 className="font-display text-4xl text-forest">Checkout</h1>
      <p className="mt-2 text-forest/60">
        No account needed — your details are saved for next time when you use the same email.
      </p>

      <form onSubmit={onSubmit} className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-card">
          {autofilled && (
            <p className="rounded-xl bg-forest/5 px-3 py-2 text-sm text-forest">
              Details loaded from your previous order — edit if anything changed.
            </p>
          )}
          <input
            name="name"
            required
            placeholder="Full name"
            className="input-field"
            autoComplete="name"
            value={details.name}
            onChange={(e) => updateField("name", e.target.value)}
          />
          <div>
            <input
              type="email"
              required
              value={details.email}
              onChange={(e) => updateField("email", e.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="Email"
              className={`input-field ${emailTouched && !emailOk ? "!border-red-400" : emailOk ? "!border-forest" : ""}`}
              autoComplete="email"
            />
            {emailTouched && !emailOk && (
              <p className="mt-1 text-sm text-red-600">Enter a valid email address</p>
            )}
            {emailOk && !autofilled && (
              <p className="mt-1 text-sm text-forest/50">We&apos;ll remember your address for next time</p>
            )}
          </div>
          <input
            name="addressLine1"
            required
            placeholder="Complete address"
            className="input-field"
            autoComplete="street-address"
            value={details.addressLine1}
            onChange={(e) => updateField("addressLine1", e.target.value)}
          />
          <input
            name="addressLine2"
            placeholder="Apartment, landmark (optional)"
            className="input-field"
            value={details.addressLine2}
            onChange={(e) => updateField("addressLine2", e.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              name="city"
              required
              placeholder="City"
              className="input-field"
              autoComplete="address-level2"
              value={details.city}
              onChange={(e) => updateField("city", e.target.value)}
            />
            <input
              name="state"
              required
              placeholder="State"
              className="input-field"
              autoComplete="address-level1"
              value={details.state}
              onChange={(e) => updateField("state", e.target.value)}
            />
            <input
              name="pincode"
              required
              placeholder="PIN code"
              className="input-field"
              autoComplete="postal-code"
              value={details.pincode}
              onChange={(e) => updateField("pincode", e.target.value)}
            />
          </div>
        </div>

        <aside className="h-fit rounded-2xl bg-white p-6 shadow-soft lg:sticky lg:top-28">
          <h2 className="font-display text-2xl text-forest">Summary</h2>
          <p className="mt-4 flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatINR(cartTotal)}</span>
          </p>
          {discount > 0 && (
            <p className="mt-2 flex justify-between text-sm text-forest">
              <span>Discount</span>
              <span>-{formatINR(discount)}</span>
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Coupon"
              className="input-field !py-2 text-sm"
            />
            <button type="button" onClick={applyCoupon} className="btn-secondary !px-3 !py-2 text-sm">
              Apply
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary mt-6 w-full !py-5 text-lg">
            {loading ? "Placing order…" : "Place Order"}
          </button>
        </aside>
      </form>
    </div>
  );
}
