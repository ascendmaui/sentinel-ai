import { tiers } from "./tiers";

export const SCAN_DAYS = 3;
export const TIER_IDS = tiers.map((t) => t.id);
export type LeadPath = "scan" | "call" | "basic";

/** Seraphim Scan Basic display values. Payment settings are env-driven (lib/pipeline/config.ts). */
export const BASIC = {
  price: "$99",
  stripeMode: (process.env.NEXT_PUBLIC_STRIPE_MODE ?? "test") as "test" | "live",
};

export type Lead = {
  path: LeadPath;
  name: string;
  email: string;
  company: string;
  role: string;
  website: string;
  tier: string;
  notes: string;
  authorized?: boolean;
  days?: string[];
  times?: string;
  timezone?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FREE_MAIL = /@(gmail|yahoo|hotmail|outlook|icloud|aol|proton|protonmail)\./i;

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** Validates and normalizes raw input. Returns errors keyed by field, or the clean lead. */
export function validateLead(raw: Record<string, unknown>): { ok: true; lead: Lead } | { ok: false; errors: Record<string, string> } {
  const e: Record<string, string> = {};
  const path = raw.path === "scan" || raw.path === "call" || raw.path === "basic" ? raw.path : null;
  if (!path) e.path = "Choose a free preliminary scan or a call.";
  const name = clip(raw.name, 120);
  const email = clip(raw.email, 200).toLowerCase();
  const company = clip(raw.company, 160);
  const role = clip(raw.role, 120);
  let website = clip(raw.website, 300);
  const tier = clip(raw.tier, 20) || "unsure";
  const notes = clip(raw.notes, 3000);
  if (!name && path !== "basic") e.name = "Please add your name.";
  if (!EMAIL_RE.test(email)) e.email = "Please use a valid work email.";
  if (!company && path !== "basic") e.company = "Please add your company.";
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  try {
    const u = new URL(website);
    if (!u.hostname.includes(".")) throw new Error();
    website = u.origin;
  } catch {
    e.website = "Please add your website, for example example.com.";
  }
  if (tier !== "unsure" && !TIER_IDS.includes(tier as never)) e.tier = "Unknown tier.";
  const lead: Lead = { path: path ?? "call", name, email, company, role, website, tier, notes };
  if (path === "scan" || path === "basic") {
    if (raw.authorized !== true) e.authorized = "Please confirm you own or are authorized to request this assessment.";
    lead.authorized = raw.authorized === true;
  }
  if (path === "call") {
    const days = Array.isArray(raw.days) ? raw.days.filter((d): d is string => typeof d === "string").slice(0, 7).map((d) => d.slice(0, 12)) : [];
    if (!days.length) e.days = "Pick at least one day.";
    lead.days = days;
    lead.times = clip(raw.times, 200);
    lead.timezone = clip(raw.timezone, 60);
    if (!lead.times) e.times = "Tell us a time window that works.";
  }
  return Object.keys(e).length ? { ok: false, errors: e } : { ok: true, lead };
}

export const isFreeMail = (email: string) => FREE_MAIL.test(email);
