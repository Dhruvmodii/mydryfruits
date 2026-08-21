"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";
import { getApiBaseUrl } from "@/lib/constants";

const emptyIntegrations = {
  sendgrid: { apiKey: "", fromEmail: "", fromName: "MyDryFruits" },
  sms: { enabled: false, provider: "msg91", apiKey: "", apiSecret: "", senderId: "" },
  whatsapp: { enabled: false, provider: "meta", apiKey: "", apiSecret: "", phoneNumberId: "" },
};

export default function AdminSettingsPage() {
  const [business, setBusiness] = useState<any>({});
  const [policies, setPolicies] = useState<any>({});
  const [social, setSocial] = useState<any>({});
  const [about, setAbout] = useState<any>({});
  const [branding, setBranding] = useState<{ faviconUrl?: string }>({});
  const [integrations, setIntegrations] = useState<any>(emptyIntegrations);
  const [faviconBusy, setFaviconBusy] = useState(false);
  const [faviconMsg, setFaviconMsg] = useState("");

  useEffect(() => {
    adminFetch<{ settings: any }>("/api/admin/settings").then((d) => {
      setBusiness(d.settings.business || {});
      setPolicies(d.settings.policies || {});
      setSocial(d.settings.social || {});
      setAbout(d.settings.about || {});
      setBranding(d.settings.branding || {});
      setIntegrations({
        ...emptyIntegrations,
        ...(d.settings.integrations || {}),
        sendgrid: { ...emptyIntegrations.sendgrid, ...(d.settings.integrations?.sendgrid || {}) },
        sms: { ...emptyIntegrations.sms, ...(d.settings.integrations?.sms || {}) },
        whatsapp: { ...emptyIntegrations.whatsapp, ...(d.settings.integrations?.whatsapp || {}) },
      });
    });
  }, []);

  async function save(key: string, value: unknown) {
    await adminFetch(`/api/admin/settings/${key}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    });
    alert("Saved");
  }

  async function uploadFavicon(file: File) {
    setFaviconMsg("");
    if (file.size > 100 * 1024) {
      setFaviconMsg("File is over 100KB. Compress or use a smaller PNG/ICO.");
      return;
    }
    setFaviconBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("mydryfruits_admin_token");
      const res = await fetch(`${getApiBaseUrl()}/api/admin/branding/favicon`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Upload failed");
      setBranding(body.branding || {});
      setFaviconMsg("Saved. Hard-refresh the site tab (Ctrl+F5) to see the new icon.");
    } catch (e) {
      setFaviconMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setFaviconBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-forest">Settings</h1>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <h2 className="font-display text-xl text-forest">Browser tab icon</h2>
        <p className="mt-1 text-sm text-forest/55">
          This is the small logo in the browser title bar. Max <strong>100KB</strong> (PNG or ICO
          recommended). Replacing overwrites the old file so disk stays small on free AWS.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {branding.faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.faviconUrl}
              alt="Current favicon"
              className="h-12 w-12 rounded-lg border border-forest/10 bg-cream object-contain p-1"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-forest text-sm font-bold text-gold">
              M
            </div>
          )}
          <input
            type="file"
            accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/jpeg,image/webp,image/svg+xml,.ico"
            disabled={faviconBusy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadFavicon(file);
            }}
          />
          {branding.faviconUrl ? (
            <button
              type="button"
              className="text-sm text-red-700"
              disabled={faviconBusy}
              onClick={async () => {
                await adminFetch("/api/admin/branding/favicon", { method: "DELETE" });
                setBranding({ ...branding, faviconUrl: "" });
                setFaviconMsg("Removed custom icon. Default “M” icon will show.");
              }}
            >
              Remove custom icon
            </button>
          ) : null}
        </div>
        {faviconMsg ? <p className="mt-2 text-sm text-forest/70">{faviconMsg}</p> : null}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <h2 className="font-display text-xl text-forest">Business</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(["name", "email", "phone", "address", "gst", "currency"] as const).map((k) => (
            <input
              key={k}
              className="input-field"
              placeholder={k}
              value={business[k] || ""}
              onChange={(e) => setBusiness({ ...business, [k]: e.target.value })}
            />
          ))}
          <input
            className="input-field"
            type="number"
            placeholder="Delivery charge"
            value={business.deliveryCharge ?? ""}
            onChange={(e) => setBusiness({ ...business, deliveryCharge: Number(e.target.value) })}
          />
          <input
            className="input-field"
            type="number"
            placeholder="Free delivery above"
            value={business.freeDeliveryAbove ?? ""}
            onChange={(e) => setBusiness({ ...business, freeDeliveryAbove: Number(e.target.value) })}
          />
          <input
            className="input-field"
            type="number"
            placeholder="Tax %"
            value={business.taxPercent ?? ""}
            onChange={(e) => setBusiness({ ...business, taxPercent: Number(e.target.value) })}
          />
          <input
            className="input-field"
            type="number"
            placeholder="Years in business"
            value={business.yearsInBusiness ?? ""}
            onChange={(e) => setBusiness({ ...business, yearsInBusiness: Number(e.target.value) })}
          />
        </div>
        <button type="button" className="btn-primary mt-4" onClick={() => save("business", business)}>
          Save business
        </button>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <h2 className="font-display text-xl text-forest">Email — SendGrid</h2>
        <p className="mt-1 text-sm text-forest/55">
          Paste your SendGrid API key to send order emails. Leaves SMTP/.env unused when set.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            className="input-field md:col-span-2"
            type="password"
            autoComplete="off"
            placeholder="SendGrid API key (SG.…)"
            value={integrations.sendgrid.apiKey || ""}
            onChange={(e) =>
              setIntegrations({
                ...integrations,
                sendgrid: { ...integrations.sendgrid, apiKey: e.target.value },
              })
            }
          />
          <input
            className="input-field"
            type="email"
            placeholder="From email (verified in SendGrid)"
            value={integrations.sendgrid.fromEmail || ""}
            onChange={(e) =>
              setIntegrations({
                ...integrations,
                sendgrid: { ...integrations.sendgrid, fromEmail: e.target.value },
              })
            }
          />
          <input
            className="input-field"
            placeholder="From name"
            value={integrations.sendgrid.fromName || ""}
            onChange={(e) =>
              setIntegrations({
                ...integrations,
                sendgrid: { ...integrations.sendgrid, fromName: e.target.value },
              })
            }
          />
        </div>
        <button
          type="button"
          className="btn-primary mt-4"
          onClick={() => save("integrations", integrations)}
        >
          Save SendGrid
        </button>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-forest">SMS</h2>
            <p className="mt-1 text-sm text-forest/55">
              When enabled, new-order alerts go to Business phone. MSG91 or Twilio.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-forest">
            <input
              type="checkbox"
              checked={!!integrations.sms.enabled}
              onChange={(e) =>
                setIntegrations({
                  ...integrations,
                  sms: { ...integrations.sms, enabled: e.target.checked },
                })
              }
            />
            Enabled
          </label>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select
            className="input-field"
            value={integrations.sms.provider || "msg91"}
            onChange={(e) =>
              setIntegrations({
                ...integrations,
                sms: { ...integrations.sms, provider: e.target.value },
              })
            }
          >
            <option value="msg91">MSG91</option>
            <option value="twilio">Twilio</option>
          </select>
          <input
            className="input-field"
            placeholder={integrations.sms.provider === "twilio" ? "Account SID" : "Auth key / API key"}
            type="password"
            autoComplete="off"
            value={integrations.sms.apiKey || ""}
            onChange={(e) =>
              setIntegrations({
                ...integrations,
                sms: { ...integrations.sms, apiKey: e.target.value },
              })
            }
          />
          {integrations.sms.provider === "twilio" && (
            <input
              className="input-field"
              placeholder="Auth Token"
              type="password"
              autoComplete="off"
              value={integrations.sms.apiSecret || ""}
              onChange={(e) =>
                setIntegrations({
                  ...integrations,
                  sms: { ...integrations.sms, apiSecret: e.target.value },
                })
              }
            />
          )}
          <input
            className="input-field"
            placeholder={
              integrations.sms.provider === "twilio" ? "From number (+91…)" : "Sender ID (e.g. DRYFRT)"
            }
            value={integrations.sms.senderId || ""}
            onChange={(e) =>
              setIntegrations({
                ...integrations,
                sms: { ...integrations.sms, senderId: e.target.value },
              })
            }
          />
        </div>
        <button
          type="button"
          className="btn-primary mt-4"
          onClick={() => save("integrations", integrations)}
        >
          Save SMS
        </button>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-forest">WhatsApp</h2>
            <p className="mt-1 text-sm text-forest/55">
              When enabled, new-order alerts go to Business phone via Meta Cloud API or Twilio.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-forest">
            <input
              type="checkbox"
              checked={!!integrations.whatsapp.enabled}
              onChange={(e) =>
                setIntegrations({
                  ...integrations,
                  whatsapp: { ...integrations.whatsapp, enabled: e.target.checked },
                })
              }
            />
            Enabled
          </label>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select
            className="input-field"
            value={integrations.whatsapp.provider || "meta"}
            onChange={(e) =>
              setIntegrations({
                ...integrations,
                whatsapp: { ...integrations.whatsapp, provider: e.target.value },
              })
            }
          >
            <option value="meta">Meta Cloud API</option>
            <option value="twilio">Twilio</option>
          </select>
          <input
            className="input-field"
            placeholder={
              integrations.whatsapp.provider === "twilio" ? "Account SID" : "Access token / API key"
            }
            type="password"
            autoComplete="off"
            value={integrations.whatsapp.apiKey || ""}
            onChange={(e) =>
              setIntegrations({
                ...integrations,
                whatsapp: { ...integrations.whatsapp, apiKey: e.target.value },
              })
            }
          />
          {integrations.whatsapp.provider === "twilio" && (
            <input
              className="input-field"
              placeholder="Auth Token"
              type="password"
              autoComplete="off"
              value={integrations.whatsapp.apiSecret || ""}
              onChange={(e) =>
                setIntegrations({
                  ...integrations,
                  whatsapp: { ...integrations.whatsapp, apiSecret: e.target.value },
                })
              }
            />
          )}
          <input
            className="input-field"
            placeholder={
              integrations.whatsapp.provider === "twilio"
                ? "From (whatsapp:+1415…)"
                : "Phone number ID"
            }
            value={integrations.whatsapp.phoneNumberId || ""}
            onChange={(e) =>
              setIntegrations({
                ...integrations,
                whatsapp: { ...integrations.whatsapp, phoneNumberId: e.target.value },
              })
            }
          />
        </div>
        <button
          type="button"
          className="btn-primary mt-4"
          onClick={() => save("integrations", integrations)}
        >
          Save WhatsApp
        </button>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <h2 className="font-display text-xl text-forest">About</h2>
        <input className="input-field mt-3" value={about.title || ""} onChange={(e) => setAbout({ ...about, title: e.target.value })} placeholder="Title" />
        <textarea className="input-field mt-3 min-h-[120px]" value={about.body || ""} onChange={(e) => setAbout({ ...about, body: e.target.value })} />
        <button type="button" className="btn-primary mt-4" onClick={() => save("about", about)}>Save about</button>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <h2 className="font-display text-xl text-forest">Policies</h2>
        {(["privacy", "refund", "terms"] as const).map((k) => (
          <textarea
            key={k}
            className="input-field mt-3 min-h-[100px]"
            placeholder={k}
            value={policies[k] || ""}
            onChange={(e) => setPolicies({ ...policies, [k]: e.target.value })}
          />
        ))}
        <button type="button" className="btn-primary mt-4" onClick={() => save("policies", policies)}>Save policies</button>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <h2 className="font-display text-xl text-forest">Social</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {(["instagram", "facebook", "whatsapp"] as const).map((k) => (
            <input key={k} className="input-field" placeholder={k} value={social[k] || ""} onChange={(e) => setSocial({ ...social, [k]: e.target.value })} />
          ))}
        </div>
        <button type="button" className="btn-primary mt-4" onClick={() => save("social", social)}>Save social</button>
      </section>

      <p className="text-sm text-forest/50">
        Payments are disabled (`PAYMENTS_ENABLED=false`). Razorpay hooks are ready for a future enable.
      </p>
    </div>
  );
}
