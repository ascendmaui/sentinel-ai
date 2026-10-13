import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isFreeMail, validateLead } from "../../../lib/lead";
import { cfg, SITE } from "../../../lib/pipeline/config";
import { alert } from "../../../lib/pipeline/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Best-effort per-instance rate limit: 5 submissions per IP per 10 minutes. */
const hits = new Map<string, number[]>();
const WINDOW = 10 * 60 * 1000;
const LIMIT = 5;
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > LIMIT;
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return NextResponse.json({ ok: false, error: "Too many requests. Please try again in a few minutes." }, { status: 429 });

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Honeypot plus minimum fill time: bots get a quiet success and nothing is stored.
  const started = typeof raw.startedAt === "number" ? raw.startedAt : 0;
  if ((typeof raw.company_url === "string" && raw.company_url) || !started || Date.now() - started < 3000) {
    return NextResponse.json({ ok: true, id: "received" });
  }

  const v = validateLead(raw);
  if (!v.ok) return NextResponse.json({ ok: false, errors: v.errors }, { status: 422 });

  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id,
    receivedAt: new Date().toISOString(),
    status: v.lead.path === "scan" ? "scan_queued_for_review" : v.lead.path === "basic" ? "basic_checkout_started" : "call_requested",
    stripe: v.lead.path === "basic" ? { mode: cfg.stripeMode, priceId: cfg.priceId, clientReferenceId: "" } : undefined,
    freeMail: isFreeMail(v.lead.email),
    test: raw.test === true,
    ...v.lead,
    meta: { ip, ua: (req.headers.get("user-agent") ?? "").slice(0, 200), referer: req.headers.get("referer") ?? "" },
  };

  if (record.stripe) record.stripe.clientReferenceId = id;
  try {
    await put(`leads/${id}.json`, JSON.stringify(record, null, 2), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
    });
  } catch (err) {
    console.error("[lead] storage failed", err);
    return NextResponse.json({ ok: false, error: "We could not save your request. Please email ascendmaui@gmail.com." }, { status: 500 });
  }

  // No mail provider is configured for this project, so notification is a structured log line.
  // Nothing is scanned here: preliminary scans are passive and queued for human review.
  console.log(`[lead] NEW ${record.path} ${record.company} <${record.email.replace(/^(.).*(@.*)$/, "$1***$2")}> tier=${record.tier} id=${id}`);
  let checkoutUrl: string | undefined;
  if (record.path === "basic") {
    checkoutUrl = await createCheckout(id, record.email).catch((e) => {
      console.error("[lead] checkout session failed, using payment link", e);
      return undefined;
    });
    checkoutUrl ??= `${cfg.paymentLink}?client_reference_id=${encodeURIComponent(id)}&prefilled_email=${encodeURIComponent(record.email)}`;
  }
  await alert(`New ${record.path} lead: ${record.company || record.website}`, `${record.name || "(no name)"} <${record.email.replace(/^(.).*(@.*)$/, "$1***$2")}>\nCompany: ${record.company}\nRole: ${record.role}\nWebsite: ${record.website}\nTier: ${record.tier}\nPath: ${record.path}${record.days ? `\nDays: ${record.days.join(", ")} ${record.times} ${record.timezone}` : ""}\nNotes: ${record.notes}\nLead id: ${id}${record.test ? "\n(TEST submission)" : ""}`).catch(() => {});
  return NextResponse.json({ ok: true, id, checkoutUrl });
}

/** Return from Stripe Checkout. Records the session id against the lead. Payment is NOT treated as verified
 * here: there is no Stripe secret or webhook on this project yet, so the order is reconciled in the Stripe
 * dashboard before the passive scan is queued. */
export async function PATCH(req: Request) {
  let raw: Record<string, unknown>;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const sid = typeof raw.session_id === "string" ? raw.session_id.slice(0, 200) : "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) return NextResponse.json({ ok: false }, { status: 400 });
  await put(`orders/returns/${sid}.json`, JSON.stringify({ session_id: sid, returnedAt: new Date().toISOString(), status: "returned_from_checkout_unverified", mode: cfg.stripeMode }, null, 2), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
  console.log(`[lead] BASIC checkout return ${sid} (verify in Stripe, then queue passive scan)`);
  return NextResponse.json({ ok: true });
}


/** With STRIPE_SECRET_KEY set, create a Checkout Session with explicit success and cancel URLs.
 * Without it (current test sandbox), fall back to the BASIC_PAYMENT_LINK Payment Link. */
async function createCheckout(leadId: string, email: string): Promise<string | undefined> {
  if (!cfg.stripeSecret) return undefined;
  const body = new URLSearchParams({
    mode: "payment",
    "line_items[0][price]": cfg.priceId,
    "line_items[0][quantity]": "1",
    client_reference_id: leadId,
    customer_email: email,
    success_url: `${SITE}/start/thanks?path=basic&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE}/start?path=basic`,
    "metadata[product]": "seraphim-scan-basic",
    "metadata[lead_id]": leadId,
  });
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { authorization: `Bearer ${cfg.stripeSecret}`, "content-type": "application/x-www-form-urlencoded" }, body });
  const j = (await r.json()) as { url?: string; error?: { message: string } };
  if (!r.ok || !j.url) throw new Error(j.error?.message ?? `stripe ${r.status}`);
  return j.url;
}
