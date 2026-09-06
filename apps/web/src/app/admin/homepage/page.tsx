"use client";

import { useEffect, useRef, useState } from "react";
import { adminFetch } from "../AdminShell";
import { toast } from "@/components/Toast";
import { getApiBaseUrl } from "@/lib/constants";

export default function AdminHomepagePage() {
  const [items, setItems] = useState<any[]>([]);
  const [key, setKey] = useState("hero");
  const [json, setJson] = useState("{}");
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function insertAtCursor(snippet: string) {
    const el = textareaRef.current;
    if (!el) {
      setJson((h) => h + snippet);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = json.slice(0, start) + snippet + json.slice(end);
    setJson(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function insertImage(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be 2MB or smaller. Compress it and try again.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("mydryfruits_admin_token");
      const res = await fetch(`${getApiBaseUrl()}/api/admin/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Image upload failed");
      const url = body.asset?.url;
      if (!url) throw new Error("Upload succeeded but no image URL was returned.");
      insertAtCursor(JSON.stringify(url));
      toast.success("Image URL inserted. Place it in the JSON field that needs a picture.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Homepage Builder</h1>
      <p className="mt-2 text-sm text-forest/60">
        Edit hero, trust, seasonal, benefits JSON. For a rotating banner, use a <code>slides</code> array
        in <strong>hero</strong>, then Save section. Hard-refresh the homepage (Ctrl+F5) to see it.
      </p>
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
      <div className="mt-4">
        <label className="btn-secondary !min-h-[40px] !px-4 !py-2 cursor-pointer text-sm">
          {uploading ? "Uploading…" : "Insert image URL"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void insertImage(file);
            }}
          />
        </label>
      </div>
      <textarea
        ref={textareaRef}
        className="input-field mt-4 min-h-[320px] font-mono text-sm"
        value={json}
        onChange={(e) => setJson(e.target.value)}
      />
      <button
        type="button"
        className="btn-primary mt-4"
        onClick={async () => {
          let content: unknown;
          try {
            content = JSON.parse(json);
          } catch {
            toast.error("JSON is not valid. Fix the syntax (missing comma or quote) before saving.");
            return;
          }
          await adminFetch(`/api/admin/homepage/${key}`, {
            method: "PUT",
            body: JSON.stringify({ content, enabled: true, title: key }),
            success: "Homepage section saved successfully",
          });
          load();
        }}
      >
        Save section
      </button>
    </div>
  );
}
