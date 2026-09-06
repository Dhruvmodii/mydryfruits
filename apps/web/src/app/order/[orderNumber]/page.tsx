"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { formatINR, formatWeight } from "@/lib/constants";

type Order = {
  orderNumber: string;
  customerName: string;
  total: number;
  estimatedDelivery?: string;
  items: { productName: string; weightGrams: number; lineTotal: number; quantity?: number }[];
};

export default function OrderConfirmationPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    apiClient<{ order: Order }>(`/api/orders/${params.orderNumber}`).then((d) => setOrder(d.order));
  }, [params.orderNumber]);

  if (!order) {
    return <div className="container-pad py-24 text-forest/50">Loading order…</div>;
  }

  return (
    <div className="container-pad section-space">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center shadow-soft md:p-12">
        <p className="text-sm uppercase tracking-[0.2em] text-gold">Order confirmed</p>
        <h1 className="mt-3 font-display text-4xl text-forest">Thank you, {order.customerName}</h1>
        <p className="mt-4 text-forest/60">
          Order <span className="font-medium text-forest">{order.orderNumber}</span>
        </p>
        <p className="mt-2 text-forest/60">
          Estimated delivery: <span className="text-forest">{order.estimatedDelivery || "2–4 days"}</span>
        </p>
        <ul className="mt-8 space-y-3 text-left">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex justify-between border-b border-forest/5 pb-3 text-sm">
              <span>
                {item.productName} · {formatWeight(item.weightGrams)}
              </span>
              <span>{formatINR(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 flex justify-between font-display text-2xl text-forest">
          <span>Total</span>
          <span>{formatINR(order.total)}</span>
        </p>
        <p className="mt-4 text-sm text-forest/50">A confirmation email is on its way.</p>
        <Link href="/shop" className="btn-primary mt-8 inline-flex">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
