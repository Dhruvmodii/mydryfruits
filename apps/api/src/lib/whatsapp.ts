import { getIntegrations } from "./integrations";

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("91") || phone.trim().startsWith("+") ? digits : `91${digits}`;
}

async function sendMetaWhatsApp(token: string, phoneNumberId: string, to: string, message: string) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhone(to),
      type: "text",
      text: { body: message },
    }),
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Meta WhatsApp error: ${JSON.stringify(data).slice(0, 300)}`);
  return { mode: "meta" as const, data };
}

async function sendTwilioWhatsApp(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  message: string
) {
  const toWa = to.startsWith("whatsapp:") ? to : `whatsapp:+${normalizePhone(to)}`;
  const fromWa = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
  const body = new URLSearchParams({
    To: toWa,
    From: fromWa,
    Body: message,
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(8000),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Twilio WhatsApp error: ${JSON.stringify(data).slice(0, 300)}`);
  return { mode: "twilio" as const, sid: (data as { sid?: string }).sid };
}

/** Sends WhatsApp when Integrations → WhatsApp is enabled and API key is set. */
export async function sendWhatsApp(to: string, message: string) {
  const { whatsapp } = await getIntegrations();
  if (!whatsapp.enabled || !whatsapp.apiKey?.trim() || !to?.trim()) {
    console.log(`[whatsapp:skip] enabled=${whatsapp.enabled} to=${to} msg=${message.slice(0, 80)}`);
    return { queued: false, mode: "skipped" as const };
  }

  const apiKey = whatsapp.apiKey.trim();
  if (whatsapp.provider === "twilio") {
    if (!whatsapp.apiSecret?.trim() || !whatsapp.phoneNumberId?.trim()) {
      throw new Error("Twilio WhatsApp needs API Secret and From number (Phone Number ID field)");
    }
    return sendTwilioWhatsApp(
      apiKey,
      whatsapp.apiSecret.trim(),
      whatsapp.phoneNumberId.trim(),
      to,
      message
    );
  }

  if (!whatsapp.phoneNumberId?.trim()) {
    throw new Error("Meta WhatsApp needs Phone Number ID");
  }
  return sendMetaWhatsApp(apiKey, whatsapp.phoneNumberId.trim(), to, message);
}
