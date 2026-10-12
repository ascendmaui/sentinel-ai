/** All payment and email settings are env-driven so live keys can be dropped in without code changes. */
import { SITE_URL } from "../brand";

/** Base URL of the deployed site (SITE_URL env, else the Vercel origin). */
export const SITE = SITE_URL;
export const cfg = {
  stripeMode: (process.env.STRIPE_MODE ?? "test") as "test" | "live",
  stripeSecret: process.env.STRIPE_SECRET_KEY ?? "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  paymentLink: process.env.BASIC_PAYMENT_LINK ?? "https://buy.stripe.com/test_4gM14p7Qt8rlfaA0fiawo01",
  priceId: process.env.BASIC_PRICE_ID ?? "price_1UPpvtPIyQnq01k2oGq2wTil",
  resendKey: process.env.RESEND_API_KEY ?? "",
  mailFrom: process.env.MAIL_FROM ?? "Seraphim Scan <onboarding@resend.dev>",
  alertEmail: process.env.ALERT_EMAIL ?? "ascendmaui@gmail.com",
  signing: process.env.REPORT_SIGNING_SECRET ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
};
