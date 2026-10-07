import { allowScan, clientKey } from "../../../lib/scan/limit";
import { parseScanRequest } from "../../../lib/scan/request";
import { runScan } from "../../../lib/scan/run";
import { newReportToken, saveReport } from "../../../lib/scan/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!allowScan(clientKey(request.headers))) {
    return Response.json({ error: "Too many scans from this network. Wait a few minutes and try again." }, { status: 429 });
  }
  const text = await request.text();
  if (text.length > 8_000) {
    return Response.json({ error: "The request is too large." }, { status: 400 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return Response.json({ error: "Send a JSON request." }, { status: 400 });
  }
  const parsed = parseScanRequest(payload);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const id = newReportToken();
  const report = await runScan({
    id,
    targetUrl: parsed.value.targetUrl,
    companyName: parsed.value.companyName,
    tier: parsed.value.tier,
    affirmedAt: new Date().toISOString(),
  });
  saveReport(report);
  return Response.json({ id: report.id, report });
}
