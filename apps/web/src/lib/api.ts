import { API_URL } from "./constants";

type FetchOptions = RequestInit & { token?: string };

export async function api<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (options.token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    next: options.cache === "no-store" ? undefined : { revalidate: 60 },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function apiClient<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (options.token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${options.token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
