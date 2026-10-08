import { BRAND_NAME } from "../../../lib/brand";
import { json } from "../../../lib/http";

export const dynamic = "force-dynamic";

/** Liveness probe. Reports no secrets: only the service name, environment label and public commit SHA. */
export function GET() {
  return json({
    status: "ok",
    service: BRAND_NAME,
    environment: process.env.VERCEL_ENV || "local",
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || null,
  });
}
