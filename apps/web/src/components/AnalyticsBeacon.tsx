"use client";

import { useEffect } from "react";
import { API_URL } from "@/lib/constants";

export function AnalyticsBeacon() {
  useEffect(() => {
    const path = window.location.pathname;
    fetch(`${API_URL}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "page_view", path }),
    }).catch(() => undefined);
  }, []);
  return null;
}
