import { prisma } from "./prisma";
import { env } from "../config";

export type SendGridConfig = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
};

export type SmsConfig = {
  enabled: boolean;
  provider: "msg91" | "twilio";
  apiKey: string;
  /** Twilio auth token (or unused for MSG91) */
  apiSecret: string;
  /** MSG91 sender ID or Twilio From number */
  senderId: string;
};

export type WhatsAppConfig = {
  enabled: boolean;
  provider: "meta" | "twilio";
  apiKey: string;
  /** Twilio auth token when provider is twilio */
  apiSecret: string;
  /** Meta phone number ID, or Twilio WhatsApp From (e.g. whatsapp:+1415…) */
  phoneNumberId: string;
};

export type IntegrationsConfig = {
  sendgrid: SendGridConfig;
  sms: SmsConfig;
  whatsapp: WhatsAppConfig;
};

export const DEFAULT_INTEGRATIONS: IntegrationsConfig = {
  sendgrid: {
    apiKey: "",
    fromEmail: "",
    fromName: "MyDryFruits",
  },
  sms: {
    enabled: false,
    provider: "msg91",
    apiKey: "",
    apiSecret: "",
    senderId: "",
  },
  whatsapp: {
    enabled: false,
    provider: "meta",
    apiKey: "",
    apiSecret: "",
    phoneNumberId: "",
  },
};

export async function getIntegrations(): Promise<IntegrationsConfig> {
  const row = await prisma.siteSetting.findUnique({ where: { key: "integrations" } });
  const value = (row?.value || {}) as Partial<IntegrationsConfig>;
  const fromDb = {
    sendgrid: { ...DEFAULT_INTEGRATIONS.sendgrid, ...(value.sendgrid || {}) },
    sms: { ...DEFAULT_INTEGRATIONS.sms, ...(value.sms || {}) },
    whatsapp: { ...DEFAULT_INTEGRATIONS.whatsapp, ...(value.whatsapp || {}) },
  };

  // Environment variables win over admin DB settings (production-friendly)
  return {
    ...fromDb,
    sendgrid: {
      apiKey: env.sendgrid.apiKey || fromDb.sendgrid.apiKey,
      fromEmail: env.sendgrid.fromEmail || fromDb.sendgrid.fromEmail,
      fromName: env.sendgrid.fromName || fromDb.sendgrid.fromName || "MyDryFruits",
    },
  };
}

export async function ensureIntegrationsSetting() {
  await prisma.siteSetting.upsert({
    where: { key: "integrations" },
    create: { key: "integrations", value: DEFAULT_INTEGRATIONS },
    update: {},
  });
}
