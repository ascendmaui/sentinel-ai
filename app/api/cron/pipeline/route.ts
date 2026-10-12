import { NextResponse } from "next/server";
import { cfg } from "../../../../lib/pipeline/config";
import { getJSON, listPaths, log, putJSON, type Order } from "../../../../lib/pipeline/store";
import { runOrder } from "../../../../lib/pipeline/run";
import { sendMail } from "../../../../lib/pipeline/mail";
import { emailKey, safeEq, unsubLink } from "../../../../lib/pipeline/sign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Daily: retry paid orders that have not been reported, then send the one-time 3-day follow-up. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!cfg.cronSecret || !safeEq(auth, `Bearer ${cfg.cronSecret}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const days = Math.max(0, Number(url.searchParams.get("followupAfterDays") ?? 3));
  const only = url.searchParams.get("session");
  const out: Record<string, string> = {};
  const paths = only ? [`orders/paid/${only}.json`] : await listPaths("orders/paid/");
  for (const p of paths) {
    let o = await getJSON<Order>(p);
    if (!o) continue;
    if (["paid", "scanning", "reported", "email_pending"].includes(o.status) || (o.status === "failed" && o.attempts < 3)) {
      o = (await runOrder(o.sessionId)) ?? o;
      out[o.sessionId] = `pipeline:${o.status}`;
    }
    if (o.status === "emailed" && !o.followupSentAt && o.emailedAt && Date.now() - new Date(o.emailedAt).getTime() >= days * 86400000) {
      const unsub = await getJSON<{ at: string }>(`unsub/${emailKey(o.email)}.json`);
      if (unsub) { o.followupSentAt = "skipped_unsubscribed"; log(o, "followup_skipped", "unsubscribed"); }
      else {
        const r = await sendMail({
          to: o.email,
          subject: `Next steps after your Seraphim Scan Basic report for ${o.domain}`,
          text: `Hello,\n\nA few days ago we sent your Seraphim Scan Basic report for ${o.domain}. If you would like a person to go further, two options:\n\n- Angels, from $950: a fuller human-written passive review with a walkthrough call.\n- Thrones, from $4,500: a Scoped Assessment of one system with written authorization, remediation guidance and a retest.\n\nStart here: https://seraphim-scan.vercel.app/start\n\nNo pressure, and this is the only follow-up we will send.\n\nSeraphim Scan\n\nUnsubscribe: ${unsubLink(o.email)}`,
          headers: { "List-Unsubscribe": `<${unsubLink(o.email)}>` },
        });
        if (r.sent) { o.followupSentAt = new Date().toISOString(); log(o, "followup_sent", r.id); }
        else log(o, "followup_not_sent", r.error);
      }
      await putJSON(p, o);
      out[o.sessionId] = `${out[o.sessionId] ?? ""} followup:${o.followupSentAt ?? "pending"}`;
    }
  }
  return NextResponse.json({ ok: true, checked: paths.length, results: out });
}
