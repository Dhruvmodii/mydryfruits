"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";

export default function AdminHomepagePage() {
  const [items, setItems] = useState<any[]>([]);
  const [key, setKey] = useState("hero");
  const [json, setJson] = useState("{}");

  function load() {
    adminFetch<{ items: any[] }>("/api/admin/homepage").then((d) => {
      setItems(d.items);
      const current = d.items.find((i) => i.key === key) || d.items[0];
      if (current) {
        setKey(current.key);
        setJson(JSON.stringify(current.content, null, 2));
      }
    });
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Homepage Builder</h1>
      <p className="mt-2 text-sm text-forest/60">Edit hero, trust, seasonal, benefits JSON sections.</p>
      <select
        className="input-field mt-4 max-w-xs"
        value={key}
        onChange={(e) => {
          const k = e.target.value;
          setKey(k);
          const section = items.find((i) => i.key === k);
          if (section) setJson(JSON.stringify(section.content, null, 2));
        }}
      >
        {items.map((i) => (
          <option key={i.key} value={i.key}>{i.key}</option>
        ))}
      </select>
      <textarea className="input-field mt-4 min-h-[320px] font-mono text-sm" value={json} onChange={(e) => setJson(e.target.value)} />
      <button
        type="button"
        className="btn-primary mt-4"
        onClick={async () => {
          await adminFetch(`/api/admin/homepage/${key}`, {
            method: "PUT",
            body: JSON.stringify({ content: JSON.parse(json), enabled: true, title: key }),
          });
          load();
          alert("Saved");
        }}
      >
        Save section
      </button>
    </div>
  );
}
