import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { cfg } from "../../../../lib/pipeline/config";
import { getJSON, log, orderPath, putJSON, type Order } from "../../../../lib/pipeline/store";
import { runOrder } from "../../../../lib/pipeline/run";
import { alert } from "../../../../lib/pipeline/mail";
import { safeEq } from "../../../../lib/pipeline/sign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Stripe signature check (v1 scheme, 5 minute tolerance), no SDK needed. */
function verifySig(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]).filter((p) => p.length === 2 && p[0] !== "v1"));
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return sigs.some((s) => safeEq(s, expected));
}

type Lead = { id: string; email: string; website: string; authorized?: boolean; path: string };

export async function POST(req: Request) {
  const payload = await req.text();
  if (!cfg.webhookSecret || !verifySig(payload, req.headers.get("stripe-signature") ?? "", cfg.webhookSecret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const ev = JSON.parse(payload) as { id: string; type: string; livemode: boolean; data: { object: Record<string, unknown> } };
  if (ev.type !== "checkout.session.completed") return NextResponse.json({ ok: true, ignored: ev.type });
  const s = ev.data.object as { id: string; client_reference_id?: string; payment_status?: string; amount_total?: number; customer_details?: { email?: string }; livemode?: boolean };
  if (s.payment_status !== "paid") return NextResponse.json({ ok: true, ignored: "not paid" });
  if ((cfg.stripeMode === "live") !== !!ev.livemode) return NextResponse.json({ ok: true, ignored: "mode mismatch" });

  // Idempotent: one order record per Checkout Session.
  const existing = await getJSON<Order>(orderPath(s.id));
  if (existing) return NextResponse.json({ ok: true, duplicate: true, status: existing.status });

  const leadId = s.client_reference_id ?? "";
  const lead = leadId ? await getJSON<Lead>(`leads/${leadId}.json`) : null;
  const domain = lead?.website ? new URL(lead.website).hostname : "";
  const o: Order = {
    sessionId: s.id, leadId, email: lead?.email || s.customer_details?.email || "", domain,
    authorized: lead?.authorized === true && lead.path === "basic", mode: ev.livemode ? "live" : "test",
    amountTotal: s.amount_total ?? 0, paidAt: new Date().toISOString(), status: "paid", attempts: 0, history: [],
  };
  log(o, "paid", `event ${ev.id}`);
  await putJSON(orderPath(s.id), o);
  if (!lead) await alert(`Paid order without a matching lead: ${s.id}`, `client_reference_id=${leadId || "(none)"}. Nothing will be scanned until the domain and authorization are confirmed.`);
  waitUntil(runOrder(s.id).catch((e) => console.error("[pipeline]", e)));
  return NextResponse.json({ ok: true, order: s.id });
}
