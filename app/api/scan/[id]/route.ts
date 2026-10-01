import { getReport, verifyReportToken } from "../../../../lib/scan/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = decodeURIComponent(id);
  if (!verifyReportToken(token)) {
    return Response.json({ error: "Report not found." }, { status: 404 });
  }
  const report = getReport(token);
  if (!report) return Response.json({ error: "This report is no longer on this server." }, { status: 404 });
  return Response.json({ report });
}
