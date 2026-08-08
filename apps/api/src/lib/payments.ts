import { env } from "../config";

export function isPaymentsEnabled() {
  return env.paymentsEnabled;
}

export function getRazorpayConfig() {
  return {
    enabled: env.paymentsEnabled,
    keyId: env.razorpay.keyId,
    // Never expose keySecret to the client
    configured: Boolean(env.razorpay.keyId && env.razorpay.keySecret),
  };
}

export async function createPaymentOrderStub(amountPaise: number, receipt: string) {
  if (!env.paymentsEnabled) {
    return { enabled: false, message: "Payments disabled — COD / pay-later checkout" };
  }
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    return {
      enabled: false,
      message: "PAYMENTS_ENABLED=true but RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are missing",
    };
  }

  // Ready for Razorpay Orders API when you enable live keys:
  // const Razorpay = require("razorpay");
  // const instance = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
  // return instance.orders.create({ amount: amountPaise, currency: "INR", receipt });
  return {
    enabled: true,
    provider: "razorpay",
    stub: true,
    amountPaise,
    receipt,
    keyId: env.razorpay.keyId,
  };
}
