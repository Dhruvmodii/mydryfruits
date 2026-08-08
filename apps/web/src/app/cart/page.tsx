"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/store/cart";
import { formatINR, formatWeight, priceForWeight } from "@/lib/constants";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, clear } = useCart();
  const total = subtotal();

  if (items.length === 0) {
    return (
      <div className="container-pad section-space text-center">
        <h1 className="font-display text-4xl text-forest">Your cart is empty</h1>
        <Link href="/shop" className="btn-primary mt-8 inline-flex">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container-pad section-space">
      <h1 className="font-display text-4xl text-forest">Cart</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {items.map((item) => {
            let unit = priceForWeight(item.pricePerKg, item.weightGrams);
            if (item.discountPercent) unit *= 1 - item.discountPercent / 100;
            return (
              <div
                key={`${item.productId}-${item.weightGrams}`}
                className="flex gap-4 rounded-2xl bg-white p-4 shadow-card"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-cream-dark">
                  {item.imageUrl && (
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="96px" />
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <Link href={`/product/${item.slug}`} className="font-medium text-forest hover:text-gold">
                    {item.name}
                  </Link>
                  <p className="text-sm text-forest/55">{formatWeight(item.weightGrams)}</p>
                  <p className="mt-1 text-forest">{formatINR(unit * item.quantity)}</p>
                  <div className="mt-auto flex items-center gap-3 pt-2">
                    <select
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(item.productId, item.weightGrams, Number(e.target.value))
                      }
                      className="input-field !min-h-[40px] !w-20 !py-1.5 text-sm"
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.weightGrams)}
                      className="text-sm text-red-700/80 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="h-fit rounded-2xl bg-white p-6 shadow-soft lg:sticky lg:top-28">
          <h2 className="font-display text-2xl text-forest">Order summary</h2>
          <div className="mt-4 flex justify-between text-forest">
            <span>Subtotal</span>
            <span className="font-medium">{formatINR(total)}</span>
          </div>
          <p className="mt-2 text-sm text-forest/55">Delivery calculated at checkout. Est. 2–4 days.</p>
          <Link href="/checkout" className="btn-primary mt-6 w-full">
            Place Order
          </Link>
          <Link href="/shop" className="btn-secondary mt-3 w-full">
            Continue Shopping
          </Link>
          <button type="button" onClick={clear} className="mt-4 w-full text-sm text-forest/40 hover:text-forest">
            Clear cart
          </button>
        </aside>
      </div>
    </div>
  );
}
