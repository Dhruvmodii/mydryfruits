import nodemailer from "nodemailer";
import { env } from "../config";
import { prisma } from "./prisma";
import { getIntegrations } from "./integrations";

const SEND_TIMEOUT_MS = 20000;

function renderTemplate(html: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`{{${key}}}`, "g"), value ?? ""),
    html
  );
}

function parseFrom(from: string) {
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: "", email: from };
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function sendViaSendGrid(opts: {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  to: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const recipients = (Array.isArray(opts.to) ? opts.to : [opts.to])
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(recipients)];
  if (!unique.length) throw new Error("No email recipients");

  const body: Record<string, unknown> = {
    personalizations: [{ to: unique.map((email) => ({ email })) }],
    from: {
      email: opts.fromEmail,
      name: opts.fromName || "MyDryFruits",
    },
    reply_to: {
      email: opts.replyTo || opts.fromEmail,
      name: opts.fromName || "MyDryFruits",
    },
    subject: opts.subject,
    content: [
      { type: "text/plain", value: htmlToText(opts.html) || opts.subject },
      { type: "text/html", value: opts.html },
    ],
    tracking_settings: {
      click_tracking: { enable: false, enable_text: false },
      open_tracking: { enable: false },
    },
    mail_settings: {
      sandbox_mode: { enable: false },
    },
    categories: ["mydryfruits", "transactional"],
  };

  if (opts.attachments?.length) {
    body.attachments = opts.attachments.map((a) => ({
      content: a.content.toString("base64"),
      filename: a.filename,
      type: a.filename.endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
      disposition: "attachment",
    }));
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SendGrid error ${res.status}: ${text.slice(0, 500)}`);
  }
}

async function getSmtpTransporter() {
  if (!env.smtp.host) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    connectionTimeout: SEND_TIMEOUT_MS,
    greetingTimeout: SEND_TIMEOUT_MS,
    socketTimeout: SEND_TIMEOUT_MS,
  });
}

async function deliverEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  try {
    const integrations = await getIntegrations();
    const sg = integrations.sendgrid;
    const envFrom = parseFrom(env.smtp.from);
    const fromEmail = sg.fromEmail || envFrom.email || "orders@mydryfruits.com";
    const fromName = sg.fromName || envFrom.name || "MyDryFruits";
    const recipients = Array.isArray(opts.to) ? opts.to : [opts.to];

    if (sg.apiKey?.trim()) {
      await sendViaSendGrid({
        apiKey: sg.apiKey.trim(),
        fromEmail,
        fromName,
        replyTo: fromEmail,
        to: recipients,
        subject: opts.subject,
        html: opts.html,
        attachments: opts.attachments,
      });
      console.log(`[email:sendgrid] to=${recipients.join(",")} subject=${opts.subject}`);
      return { queued: true, mode: "sendgrid" as const };
    }

    const transporter = await getSmtpTransporter();
    if (!transporter) {
      console.log(`[email:console] to=${recipients.join(",")} subject=${opts.subject}`);
      console.log(opts.html.slice(0, 500));
      return { queued: true, mode: "console" as const };
    }

    await withTimeout(
      transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        replyTo: fromEmail,
        to: recipients.join(", "),
        subject: opts.subject,
        text: htmlToText(opts.html),
        html: opts.html,
        attachments: opts.attachments,
      }),
      SEND_TIMEOUT_MS,
      "SMTP"
    );
    console.log(`[email:smtp] to=${recipients.join(",")} subject=${opts.subject}`);
    return { queued: true, mode: "smtp" as const };
  } catch (err) {
    console.error(`[email:fail] to=${opts.to} subject=${opts.subject}`, err);
    return { queued: false, mode: "failed" as const, error: err };
  }
}

export async function sendTemplatedEmail(opts: {
  to: string | string[];
  templateKey: string;
  vars: Record<string, string>;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const template = await prisma.emailTemplate.findUnique({ where: { key: opts.templateKey } });
  const subject = template
    ? renderTemplate(template.subject, opts.vars)
    : opts.vars.subject || "MyDryFruits";
  const html = template
    ? renderTemplate(template.htmlBody, opts.vars)
    : `<pre>${JSON.stringify(opts.vars, null, 2)}</pre>`;

  return deliverEmail({
    to: opts.to,
    subject,
    html,
    attachments: opts.attachments,
  });
}

export async function sendRawEmail(to: string | string[], subject: string, html: string) {
  await deliverEmail({ to, subject, html });
}
