import { getBytes } from "../../../../lib/pipeline/store";
import { checkReport } from "../../../../lib/pipeline/sign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  const { sid } = await params;
  const u = new URL(req.url);
  if (!checkReport(sid, u.searchParams.get("exp") ?? "", u.searchParams.get("sig") ?? "")) return new Response("This link is invalid or has expired.", { status: 403 });
  const pdf = await getBytes(`reports/${sid}.pdf`);
  if (!pdf) return new Response("Report not found.", { status: 404 });
  return new Response(Buffer.from(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="seraphim-scan-report.pdf"`, "cache-control": "private, no-store" } });
}
