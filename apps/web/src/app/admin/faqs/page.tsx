"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../AdminShell";

export default function AdminFaqsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  function load() {
    adminFetch<{ items: any[] }>("/api/admin/faqs").then((d) => setItems(d.items));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">FAQ</h1>
      <form
        className="mt-6 space-y-3 rounded-2xl bg-white p-5 shadow-card"
        onSubmit={async (e) => {
          e.preventDefault();
          await adminFetch("/api/admin/faqs", { method: "POST", body: JSON.stringify({ question, answer }) });
          setQuestion("");
          setAnswer("");
          load();
        }}
      >
        <input className="input-field" placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)} required />
        <textarea className="input-field" placeholder="Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} required />
        <button className="btn-primary" type="submit">Add FAQ</button>
      </form>
      <ul className="mt-6 space-y-3">
        {items.map((f) => (
          <li key={f.id} className="flex justify-between rounded-2xl bg-white p-4 shadow-card">
            <div>
              <p className="font-medium">{f.question}</p>
              <p className="text-sm text-forest/60">{f.answer}</p>
            </div>
            <button type="button" className="text-sm text-red-700" onClick={async () => { await adminFetch(`/api/admin/faqs/${f.id}`, { method: "DELETE" }); load(); }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
