import { alert, sendMail } from "./mail";
import { buildPdf, gate, NOT_TEXT, SCOPE_TEXT, summaryText } from "./report";
import { findings, recon, verify, type Finding } from "./scan";
import { getJSON, log, orderPath, putBytes, putJSON, type Order } from "./store";
import { reportLink, unsubLink } from "./sign";

const MAX_ATTEMPTS = 3;

/** Full pipeline for one paid order: passive scan, second-check verification, gate, PDF, email.
 * Safe to call more than once: finished orders are skipped. */
export async function runOrder(sid: string): Promise<Order | null> {
  const o = await getJSON<Order>(orderPath(sid));
  if (!o) return null;
  if (["emailed", "email_pending"].includes(o.status) && o.reportPath) {
    if (o.status === "email_pending") return emailReport(o);
    return o;
  }
  if (o.status === "failed" && o.attempts >= MAX_ATTEMPTS) return o;
  if (!o.authorized || !o.domain) {
    o.status = "failed"; o.attempts = MAX_ATTEMPTS; o.lastError = "missing authorization or domain"; log(o, "blocked", o.lastError);
    await putJSON(orderPath(sid), o);
    await alert(`Order blocked: ${sid}`, `Order ${sid} has no authorized domain on file. Nothing was scanned. Check the lead ${o.leadId}.`);
    return o;
  }
  o.status = "scanning"; o.attempts += 1; log(o, "scan_start", o.domain);
  await putJSON(orderPath(sid), o);
  try {
    const r = await recon(o.domain);
    const candidates = findings(r);
    const verified: Finding[] = [];
    for (const f of candidates) if (await verify(o.domain, f)) verified.push(f);
    const dropped = candidates.length - verified.length;
    const texts = [summaryText(o.domain, verified, dropped), SCOPE_TEXT(o.domain), ...NOT_TEXT, ...verified.flatMap((f) => [f.title, f.evidence, f.fix])];
    const problems = gate(verified, texts);
    let final = verified;
    if (problems.length) {
      log(o, "gate_failed", problems.join(" | "));
      final = []; // fall back to an honest clean baseline rather than send anything unvetted
      await alert(`Quality gate tripped for ${o.domain}`, `Order ${sid}: ${problems.join("\n")}\nA clean-baseline report was sent instead.`);
    }
    const pdf = await buildPdf(r, final, problems.length ? candidates.length : dropped, sid.slice(-10));
    o.reportPath = `reports/${sid}.pdf`;
    await putBytes(o.reportPath, pdf, "application/pdf");
    await putJSON(`reports/${sid}.recon.json`, { recon: r, candidates, verified: final, dropped, gateProblems: problems });
    o.verifiedFindings = final.length; o.status = "reported"; log(o, "report_built", `${final.length} verified, ${dropped} dropped, gate ${problems.length ? "failed" : "passed"}`);
    await putJSON(orderPath(sid), o);
    return emailReport(o, pdf);
  } catch (e) {
    o.lastError = (e as Error).message; o.status = o.attempts >= MAX_ATTEMPTS ? "failed" : "paid"; log(o, "error", o.lastError);
    await putJSON(orderPath(sid), o);
    if (o.status === "failed") await alert(`Basic Scan failed: ${o.domain}`, `Order ${sid} failed ${o.attempts} times. Last error: ${o.lastError}. Nothing was sent to the customer.`);
    return o;
  }
}

async function emailReport(o: Order, pdf?: Uint8Array): Promise<Order> {
  const link = reportLink(o.sessionId);
  const n = o.verifiedFindings ?? 0;
  const text = `Hello,

Your Seraphim Scan Basic report for ${o.domain} is ready. ${n ? `It lists ${n} verified observation(s), each with evidence and a fix.` : "No finding reproduced on our second check, so this is a clean baseline report."}

The PDF is attached. You can also download it for the next 14 days here:
${link}

What we did: passive checks only, using public information about the domain you authorized. No active testing.

Questions? Just reply to this email.

Seraphim Scan
https://seraphim-scan.vercel.app

Unsubscribe from follow-up emails: ${unsubLink(o.email)}`;
  const r = await sendMail({ to: o.email, subject: `Your Seraphim Scan Basic report for ${o.domain}`, text, attachments: pdf ? [{ filename: `seraphim-scan-${o.domain}.pdf`, content: Buffer.from(pdf).toString("base64") }] : undefined, headers: { "List-Unsubscribe": `<${unsubLink(o.email)}>` } });
  if (r.sent) { o.status = "emailed"; o.emailedAt = new Date().toISOString(); log(o, "emailed", r.id); }
  else { o.status = "email_pending"; log(o, "email_not_sent", r.error); }
  await putJSON(orderPath(o.sessionId), o);
  await alert(`Paid order ${o.status === "emailed" ? "delivered" : "report ready, email pending"}: ${o.domain}`, `Order ${o.sessionId} for ${o.domain} (${o.email}). ${n} verified finding(s). Status: ${o.status}. Report: ${link}`);
  return o;
}
