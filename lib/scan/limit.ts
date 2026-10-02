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

export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "local";
}
