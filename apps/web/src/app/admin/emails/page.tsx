"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";

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

  function load() {
    adminFetch<{ items: any[] }>("/api/admin/email-templates").then((d) => {
      setItems(d.items);
      if (d.items[0]) {
        setKey(d.items[0].key);
        setSubject(d.items[0].subject);
        setHtmlBody(d.items[0].htmlBody);
        setName(d.items[0].name);
      }
    });
  }
  useEffect(() => {
    load();
  }, []);

  const isCampaign = key === "offer" || key === "festival";

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Email Builder</h1>
      <p className="mt-2 max-w-2xl text-sm text-forest/60">
        Order confirmation, admin alert, and invoice (with PDF) send automatically on each order.
        Offer and Festival only send when you click Send campaign below.
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
      <div className="mt-4 space-y-3">
        <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
        <input className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        <textarea
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
            });
            alert("Template saved");
            load();
          }}
        >
          Save template
        </button>
      </div>

      {isCampaign && (
        <section className="mt-10 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="font-display text-xl text-forest">Send {key === "offer" ? "Offer" : "Festival"} campaign</h2>
          <p className="mt-1 text-sm text-forest/55">
            Uses {"{{title}}"} and {"{{body}}"} in the template. Leave test email empty to send to all customers + newsletter.
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
                setSending(true);
                try {
                  const res = await adminFetch<{ sent: number; failed: number; total: number }>(
                    `/api/admin/email-templates/${key}/send`,
                    {
                      method: "POST",
                      body: JSON.stringify({
                        title: campaignTitle,
                        body: campaignBody,
                        testEmail: testEmail || undefined,
                      }),
                    }
                  );
                  alert(`Sent ${res.sent}/${res.total} (failed: ${res.failed})`);
                } catch (e) {
                  alert(e instanceof Error ? e.message : "Send failed");
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
