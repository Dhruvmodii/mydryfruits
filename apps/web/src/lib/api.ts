import { getApiBaseUrl } from "./constants";

type FetchOptions = RequestInit & {
  token?: string;
};

/** Server-safe fetch (no toast). Used by layouts / RSC. */
export async function api<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...rest } = options;
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
    next: rest.cache === "no-store" ? undefined : { revalidate: 60 },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({} as { error?: string }));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
