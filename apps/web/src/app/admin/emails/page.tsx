"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { adminFetch } from "../AdminShell";
import { toast } from "@/components/Toast";
import { getApiBaseUrl } from "@/lib/constants";

const VARS: Record<string, { name: string; help: string }[]> = {
  order_confirmation: [
    { name: "customerName", help: "Customer name" },
    { name: "orderNumber", help: "Order number" },
    { name: "total", help: "Order total (₹)" },
    { name: "itemsHtml", help: "HTML list of items" },
    { name: "estimatedDelivery", help: "Delivery estimate" },
  ],
  admin_order_notification: [
    { name: "orderNumber", help: "Order number" },
    { name: "customerName", help: "Customer name" },
    { name: "customerEmail", help: "Customer email" },
    { name: "address", help: "Full delivery address" },
    { name: "addressLine1", help: "Address line 1" },
    { name: "city", help: "City" },
    { name: "state", help: "State" },
    { name: "pincode", help: "Pincode" },
    { name: "itemsHtml", help: "HTML item list" },
    { name: "itemsText", help: "Plain-text item list" },
    { name: "subtotal", help: "Subtotal (₹)" },
    { name: "discount", help: "Discount (₹)" },
    { name: "deliveryCharge", help: "Delivery (₹)" },
    { name: "tax", help: "Tax (₹)" },
    { name: "total", help: "Total (₹)" },
    { name: "couponCode", help: "Coupon used" },
    { name: "adminOrderUrl", help: "Link to this order in admin" },
    { name: "viewOrderHtml", help: "Ready-made Open in admin button" },
    { name: "copySummary", help: "Full order text to copy/paste" },
    { name: "estimatedDelivery", help: "Delivery estimate" },
    { name: "notes", help: "Order notes" },
  ],
  invoice: [
    { name: "customerName", help: "Customer name" },
    { name: "orderNumber", help: "Order number" },
    { name: "total", help: "Total (₹)" },
  ],
  bulk_inquiry_ack: [
    { name: "name", help: "Inquirer name" },
    { name: "productName", help: "Product" },
    { name: "requiredQuantity", help: "Quantity requested" },
  ],
  offer: [
    { name: "title", help: "Campaign title" },
    { name: "body", help: "Campaign body" },
  ],
  festival: [
    { name: "title", help: "Greeting title" },
    { name: "body", help: "Greeting body" },
  ],
};

const SAMPLE: Record<string, Record<string, string>> = {
  order_confirmation: {
    customerName: "Asha Patel",
    orderNumber: "MDF2608240001",
    total: "1299.00",
    itemsHtml: "<ul><li>Almonds (500g) × 1 — ₹899.00</li><li>Cashews (250g) × 1 — ₹400.00</li></ul>",
    estimatedDelivery: "26–28 Aug 2026",
  },
  admin_order_notification: {
    orderNumber: "MDF2608240001",
    customerName: "Asha Patel",
    customerEmail: "asha@example.com",
    address: "12 Park Street, Ahmedabad, Gujarat 380001, India",
    addressLine1: "12 Park Street",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380001",
    itemsHtml: "<ul><li>Almonds (500g) × 1 — ₹899.00</li><li>Cashews (250g) × 1 — ₹400.00</li></ul>",
    itemsText: "Almonds (500g) × 1 — ₹899.00\nCashews (250g) × 1 — ₹400.00",
    subtotal: "1299.00",
    discount: "0.00",
    deliveryCharge: "0.00",
    tax: "0.00",
    total: "1299.00",
    couponCode: "",
    adminOrderUrl: "http://localhost:3000/admin/orders?highlight=MDF2608240001",
    viewOrderHtml:
      '<a href="http://localhost:3000/admin/orders?highlight=MDF2608240001" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#1B4332;color:#fff;text-decoration:none;border-radius:8px">Open order in admin</a>',
    copySummary:
      "Order MDF2608240001\nCustomer: Asha Patel\nEmail: asha@example.com\nAddress: 12 Park Street, Ahmedabad, Gujarat 380001, India\nItems:\nAlmonds (500g) × 1 — ₹899.00\nCashews (250g) × 1 — ₹400.00\nTotal: ₹1299.00",
    estimatedDelivery: "26–28 Aug 2026",
    notes: "",
  },
  invoice: {
    customerName: "Asha Patel",
    orderNumber: "MDF2608240001",
    total: "1299.00",
  },
  bulk_inquiry_ack: {
    name: "Rahul",
    productName: "Premium Almonds",
    requiredQuantity: "10 kg",
  },
  offer: {
    title: "Festival special 10% off",
    body: "Use code WELCOME10 on orders above ₹500.",
  },
  festival: {
    title: "Happy Diwali",
    body: "Warm wishes from MyDryFruits.",
  },
};

const ADMIN_LAYOUT = `<div style="font-family:Georgia,serif;color:#1a2e1a">
  <h2 style="color:#1B4332">New order {{orderNumber}}</h2>
  <p><strong>{{customerName}}</strong> · {{customerEmail}}</p>
  <p>{{address}}</p>
  <h3>Items</h3>
  {{itemsHtml}}
  <p>Subtotal: ₹{{subtotal}}<br/>Discount: ₹{{discount}}<br/>Delivery: ₹{{deliveryCharge}}<br/><strong>Total: ₹{{total}}</strong></p>
  {{viewOrderHtml}}
  <p style="margin-top:16px;font-size:13px;color:#555">Copy this summary:</p>
  <pre style="background:#f7f4ee;padding:12px;white-space:pre-wrap;font-size:12px">{{copySummary}}</pre>
</div>`;

function applyVars(html: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`{{${k}}}`, "g"), v ?? ""),
    html
  );
}

export default function AdminEmailsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [key, setKey] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [name, setName] = useState("");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignBody, setCampaignBody] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function load() {
    adminFetch<{ items: any[] }>("/api/admin/email-templates").then((d) => {
      setItems(d.items);
      const current = d.items.find((i) => i.key === key) || d.items[0];
      if (current) {
        setKey(current.key);
        setSubject(current.subject);
        setHtmlBody(current.htmlBody);
        setName(current.name);
      }
    });
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCampaign = key === "offer" || key === "festival";
  const vars = VARS[key] || [];
  const sample = SAMPLE[key] || {};

  const previewSubject = useMemo(
    () => applyVars(subject, isCampaign ? { title: campaignTitle || sample.title || "", body: campaignBody || sample.body || "" } : sample),
    [subject, sample, isCampaign, campaignTitle, campaignBody]
  );
  const previewHtml = useMemo(
    () =>
      applyVars(
        htmlBody,
        isCampaign ? { title: campaignTitle || sample.title || "", body: campaignBody || sample.body || "" } : sample
      ),
    [htmlBody, sample, isCampaign, campaignTitle, campaignBody]
  );

  function insertAtCursor(snippet: string) {
    const el = textareaRef.current;
    if (!el) {
      setHtmlBody((h) => h + snippet);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = htmlBody.slice(0, start) + snippet + htmlBody.slice(end);
    setHtmlBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function insertImage(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be 2MB or smaller.");
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
      insertAtCursor(`<img src="${url}" alt="" style="max-width:100%;height:auto;" />`);
      toast.success("Image added to the template.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Email Builder</h1>
      <p className="mt-2 max-w-2xl text-sm text-forest/60">
        Edit the HTML, then check the live preview on the right. Order, admin, and invoice emails send automatically.
        Offer and Festival only send when you click Send campaign.
      </p>
      <select
        className="input-field mt-4 max-w-md"
        value={key}
        onChange={(e) => {
          const t = items.find((i) => i.key === e.target.value);
          if (!t) return;
          setKey(t.key);
          setSubject(t.subject);
          setHtmlBody(t.htmlBody);
          setName(t.name);
        }}
      >
        {items.map((i) => (
          <option key={i.key} value={i.key}>
            {i.name}
          </option>
        ))}
      </select>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
          <input className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-secondary !min-h-[40px] !px-4 !py-2 cursor-pointer text-sm">
              {uploading ? "Uploading…" : "Insert image"}
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
            {key === "admin_order_notification" ? (
              <button type="button" className="text-sm text-forest underline" onClick={() => setHtmlBody(ADMIN_LAYOUT)}>
                Use recommended new-order layout
              </button>
            ) : null}
          </div>
          <textarea
            ref={textareaRef}
            className="input-field min-h-[280px] font-mono text-sm"
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              await adminFetch(`/api/admin/email-templates/${key}`, {
                method: "PUT",
                body: JSON.stringify({ name, subject, htmlBody }),
                success: "Email template saved successfully",
              });
              load();
            }}
          >
            Save template
          </button>
          {vars.length ? (
            <div className="rounded-2xl bg-white p-4 shadow-card">
              <p className="text-sm font-medium text-forest">Variables for this template</p>
              <p className="mt-1 text-xs text-forest/50">Click to insert at the cursor. Preview uses sample data.</p>
              <ul className="mt-3 space-y-1 text-sm">
                {vars.map((v) => (
                  <li key={v.name}>
                    <button
                      type="button"
                      className="font-mono text-forest underline"
                      onClick={() => insertAtCursor(`{{${v.name}}}`)}
                    >
                      {`{{${v.name}}}`}
                    </button>
                    <span className="text-forest/50"> — {v.help}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div>
          <p className="text-sm font-medium text-forest">Preview (how the email looks)</p>
          <p className="mt-1 text-xs text-forest/50">Subject: {previewSubject || "(empty)"}</p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-card">
            <iframe title="Email preview" className="h-[520px] w-full bg-white" srcDoc={previewHtml || "<p style='padding:16px;color:#888'>Start editing HTML to see a preview.</p>"} />
          </div>
        </div>
      </div>

      {isCampaign && (
        <section className="mt-10 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="font-display text-xl text-forest">Send {key === "offer" ? "Offer" : "Festival"} campaign</h2>
          <p className="mt-1 text-sm text-forest/55">
            Uses {"{{title}}"} and {"{{body}}"}. Leave test email empty to send to all customers + newsletter.
          </p>
          <div className="mt-4 space-y-3">
            <input
              className="input-field"
              placeholder="Campaign title"
              value={campaignTitle}
              onChange={(e) => setCampaignTitle(e.target.value)}
            />
            <textarea
              className="input-field min-h-[100px]"
              placeholder="Campaign body / message"
              value={campaignBody}
              onChange={(e) => setCampaignBody(e.target.value)}
            />
            <input
              className="input-field"
              type="email"
              placeholder="Test email only (optional)"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={sending || !campaignTitle.trim()}
              onClick={async () => {
                if (!campaignTitle.trim()) {
                  toast.error("Add a campaign title before sending.");
                  return;
                }
                setSending(true);
                try {
                  const res = await adminFetch<{ sent: number; failed: number; total: number }>(
                    `/api/admin/email-templates/${key}/send`,
                    {
                      method: "POST",
                      success: false,
                      body: JSON.stringify({
                        title: campaignTitle,
                        body: campaignBody,
                        testEmail: testEmail || undefined,
                      }),
                    }
                  );
                  toast.success(
                    `Sent ${res.sent} of ${res.total} emails${res.failed ? ` (${res.failed} failed)` : ""}.`
                  );
                } catch {
                  /* error toast from adminFetch */
                } finally {
                  setSending(false);
                }
              }}
            >
              {sending ? "Sending…" : testEmail ? "Send test" : "Send to all customers"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
