const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 6;

const globalBuckets = globalThis as typeof globalThis & { __seraphimScanBuckets?: Map<string, number[]> };

function buckets(): Map<string, number[]> {
  if (!globalBuckets.__seraphimScanBuckets) globalBuckets.__seraphimScanBuckets = new Map();
  return globalBuckets.__seraphimScanBuckets;
}

/** Simple in-memory limiter. A future worker can replace this; it is not shared across serverless isolates. */
export function allowScan(key: string, now = Date.now()): boolean {
  const store = buckets();
  const recent = (store.get(key) ?? []).filter((stamp) => now - stamp < WINDOW_MS);
  if (recent.length >= LIMIT) {
    store.set(key, recent);
    return false;
  }
  recent.push(now);
  store.set(key, recent);
  return true;
}

function normalizeIp(raw: string): string {
  const trimmed = raw.trim();
  const bracketMatch = /^\[([a-f0-9:]+)\](?::\d+)?$/i.exec(trimmed);
  if (bracketMatch) return bracketMatch[1].toLowerCase();
  const portMatch = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d+$/.exec(trimmed);
  if (portMatch) return portMatch[1];
  return trimmed;
}

export function clientKey(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return normalizeIp(cf);
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return normalizeIp(forwarded);
  const real = headers.get("x-real-ip")?.trim();
  if (real) return normalizeIp(real);
  return "local";
}
