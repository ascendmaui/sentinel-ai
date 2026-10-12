import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { BASIC, isFreeMail, validateLead } from "../../../lib/lead";

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
    stripe: v.lead.path === "basic" ? { mode: BASIC.stripeMode, priceId: BASIC.priceId, paymentLink: BASIC.paymentLink, clientReferenceId: "" } : undefined,
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
  console.log(`[lead] NEW ${record.path} ${record.company} <${record.email}> tier=${record.tier} id=${id}`);
  const checkoutUrl =
    record.path === "basic"
      ? `${BASIC.paymentLink}?client_reference_id=${encodeURIComponent(id)}&prefilled_email=${encodeURIComponent(record.email)}`
      : undefined;
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
  await put(`orders/${sid}.json`, JSON.stringify({ session_id: sid, returnedAt: new Date().toISOString(), status: "returned_from_checkout_unverified", mode: BASIC.stripeMode }, null, 2), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
  console.log(`[lead] BASIC checkout return ${sid} (verify in Stripe, then queue passive scan)`);
  return NextResponse.json({ ok: true });
}
