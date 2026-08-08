import { getIntegrations } from "./integrations";

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

async function sendMsg91(apiKey: string, senderId: string, to: string, message: string) {
  const mobiles = to.replace(/\D/g, "");
  const url = new URL("https://api.msg91.com/api/sendhttp.php");
  url.searchParams.set("authkey", apiKey);
  url.searchParams.set("mobiles", mobiles);
  url.searchParams.set("message", message);
  url.searchParams.set("sender", senderId || "DRYFRT");
  url.searchParams.set("route", "4");
  url.searchParams.set("country", "91");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`MSG91 error: ${text.slice(0, 200)}`);
  return { mode: "msg91" as const, response: text };
}

async function sendTwilioSms(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  message: string
) {
  const body = new URLSearchParams({
    To: normalizePhone(to),
    From: from,
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
  if (!res.ok) throw new Error(`Twilio SMS error: ${JSON.stringify(data).slice(0, 300)}`);
  return { mode: "twilio" as const, sid: (data as { sid?: string }).sid };
}

/** Sends SMS when Integrations → SMS is enabled and API key is set. */
export async function sendSms(to: string, message: string) {
  const { sms } = await getIntegrations();
  if (!sms.enabled || !sms.apiKey?.trim() || !to?.trim()) {
    console.log(`[sms:skip] enabled=${sms.enabled} to=${to} msg=${message.slice(0, 80)}`);
    return { queued: false, mode: "skipped" as const };
  }

  const apiKey = sms.apiKey.trim();
  if (sms.provider === "twilio") {
    if (!sms.apiSecret?.trim() || !sms.senderId?.trim()) {
      throw new Error("Twilio SMS needs API Secret (Auth Token) and Sender ID (From number)");
    }
    return sendTwilioSms(apiKey, sms.apiSecret.trim(), sms.senderId.trim(), to, message);
  }

  return sendMsg91(apiKey, sms.senderId.trim(), to, message);
}
