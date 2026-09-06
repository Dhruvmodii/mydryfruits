"use client";

import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/friendly-error";

export type ToastKind = "success" | "error";
export type ToastItem = { id: string; kind: ToastKind; message: string };

type Listener = (item: ToastItem) => void;
const listeners = new Set<Listener>();

function emit(kind: ToastKind, message: string) {
  const text = String(message || "").trim();
  if (!text) return;
  const item: ToastItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    message: text,
  };
  listeners.forEach((fn) => fn(item));
}

export const toast = {
  success: (message: string) => emit("success", message),
  error: (message: string) => emit("error", message),
};

export { friendlyError };

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast: Listener = (item) => {
      setItems((prev) => [...prev.slice(-4), item]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
      }, 4500);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);

  if (!items.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(100%-2rem,22rem)] flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-xl px-4 py-3 text-sm shadow-lg ${
            t.kind === "success" ? "bg-forest text-white" : "bg-red-800 text-white"
          }`}
          role="status"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
