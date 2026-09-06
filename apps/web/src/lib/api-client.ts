"use client";

import { friendlyError, toast } from "@/components/Toast";
import { getApiBaseUrl } from "./constants";

type FetchOptions = RequestInit & {
  token?: string;
  silent?: boolean;
  success?: string;
};

export async function apiClient<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, silent, success, ...rest } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(rest.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as { error?: string }));
    const message = friendlyError(res.status, body.error);
    if (!silent) toast.error(message);
    throw new Error(message);
  }
  const method = (rest.method || "GET").toUpperCase();
  if (success && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    toast.success(success);
  }
  return res.json() as Promise<T>;
}
