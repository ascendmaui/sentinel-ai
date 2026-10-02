import { AUTHORIZATION_STATEMENT, isScanTierId, type ScanTierId } from "../scanTiers";
import { parsePublicUrl } from "./ssrf";

export type ScanRequest = {
  targetUrl: string;
  companyName: string | null;
  tier: ScanTierId;
  authorization: true;
};

export function cleanCompanyName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001F\u007F<>/]/g, "").trim().slice(0, 120);
  return cleaned.length ? cleaned : null;
}

export function parseScanRequest(body: unknown): { ok: true; value: ScanRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Send a JSON request." };
  const record = body as Record<string, unknown>;
  if (record.authorization !== true) {
    return { ok: false, error: "Confirm that you are authorized to scan this website before it can run." };
  }
  if (typeof record.tier !== "string" || !isScanTierId(record.tier)) {
    return { ok: false, error: "Choose a scan tier." };
  }
  if (typeof record.targetUrl !== "string") return { ok: false, error: "Enter a website URL." };
  const parsed = parsePublicUrl(record.targetUrl);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    value: {
      targetUrl: parsed.target.url.toString(),
      companyName: cleanCompanyName(record.companyName),
      tier: record.tier,
      authorization: true,
    },
  };
}

export { AUTHORIZATION_STATEMENT };
