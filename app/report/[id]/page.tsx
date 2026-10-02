import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportScreen } from "../../../components/ReportScreen";
import { BRAND_NAME } from "../../../lib/brand";
import { getReport, verifyReportToken } from "../../../lib/scan/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scan report",
  description: `A passive public scan report from ${BRAND_NAME}.`,
  robots: { index: false, follow: false },
};

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = decodeURIComponent(id);
  if (!verifyReportToken(token)) notFound();
  const report = getReport(token);
  return <ReportScreen token={token} initial={report} />;
}
