"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/lib/types";
import { priceForWeight } from "@/lib/constants";

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, weightGrams: number) => void;
  updateQuantity: (productId: string, weightGrams: number, quantity: number) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const items = [...get().items];
        const idx = items.findIndex(
          (i) => i.productId === item.productId && i.weightGrams === item.weightGrams
        );
        if (idx >= 0) {
          items[idx] = {
            ...items[idx],
            quantity: Math.min(20, items[idx].quantity + item.quantity),
          };
        } else {
          items.push(item);
        }
        set({ items });
      },
      removeItem: (productId, weightGrams) => {
        set({
          items: get().items.filter(
            (i) => !(i.productId === productId && i.weightGrams === weightGrams)
          ),
        });
      },
      updateQuantity: (productId, weightGrams, quantity) => {
        set({
          items: get().items.map((i) =>
            i.productId === productId && i.weightGrams === weightGrams
              ? { ...i, quantity: Math.max(1, Math.min(20, quantity)) }
              : i
          ),
        });
      },
      clear: () => set({ items: [] }),
      subtotal: () =>
        get().items.reduce((sum, i) => {
          let unit = priceForWeight(i.pricePerKg, i.weightGrams);
          if (i.discountPercent) unit = unit * (1 - i.discountPercent / 100);
          return sum + unit * i.quantity;
        }, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "mydryfruits-cart" }
  )
);
