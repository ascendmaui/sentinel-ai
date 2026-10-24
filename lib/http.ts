/** Shared helpers for API route handlers (app/api/**). Web-standard Request/Response only. */
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "off",
} as const;

export function json(
  data: unknown,
  init: { status?: number; cacheControl?: string; headers?: Record<string, string> } = {}
): Response {
  return new Response(JSON.stringify(data === undefined ? null : data), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": init.cacheControl ?? "no-store",
      ...SECURITY_HEADERS,
      ...(init.headers ?? {}),
    },
  });
}

export const notFound = (what = "resource") =>
  json(
    { error: "not_found", message: `${(typeof what === "string" && what.trim()) || "resource"} not found` },
    { status: 404 }
  );

export const badRequest = (message = "Bad request") =>
  json(
    { error: "bad_request", message: (typeof message === "string" && message.trim()) || "Bad request" },
    { status: 400 }
  );

export function methodNotAllowed(allowed: string[] = ["GET", "HEAD"]): Response {
  return new Response(
    JSON.stringify({ error: "method_not_allowed", message: "Method not allowed" }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        Allow: allowed.join(", "),
        ...SECURITY_HEADERS,
      },
    }
  );
}

/** Short-lived shared caching for read-only content endpoints. */
export const PUBLIC_CACHE = "public, max-age=0, s-maxage=300, stale-while-revalidate=600";

/**
 * Safely parses an optional integer limit from URL search parameters.
 * Returns undefined if missing, non-numeric, or <= 0. Bounded by max.
 * Only plain base-10 integers are accepted: partial numerics such as "1e3", "2.5" or "10abc"
 * are rejected rather than silently truncated by parseInt.
 */
export function parseLimit(params: URLSearchParams, max = 100): number | undefined {
  if (!params || typeof params.get !== "function") return undefined;
  const cap = Math.floor(max);
  if (!Number.isFinite(max) || cap <= 0) return undefined;
  const raw = params.get("limit")?.trim();
  if (!raw || !/^\+?\d+$/.test(raw)) return undefined;
  const num = Number(raw);
  if (!(num > 0)) return undefined;
  return Math.min(num, cap);
}

/**
 * Safely extracts a trimmed lowercase query string from URL search parameters.
 * Returns undefined if missing or containing only whitespace.
 */
export function parseSearchQuery(params: URLSearchParams, paramName = "q"): string | undefined {
  if (!params || typeof params.get !== "function" || !paramName || typeof paramName !== "string") return undefined;
  const raw = params.get(paramName);
  if (!raw) return undefined;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

