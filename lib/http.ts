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
  let body: string;
  try {
    const serialized = JSON.stringify(data === undefined ? null : data);
    body = serialized === undefined ? "null" : serialized;
  } catch {
    body = JSON.stringify({ error: "internal_error", message: "Serialization failed" });
    return new Response(body, {
      status: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        ...SECURITY_HEADERS,
        ...(init.headers ?? {}),
      },
    });
  }
  return new Response(body, {
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
 * Accepts "limit", "take", "pageSize", "page_size", "per_page", "size", "count", or "max".
 * Returns undefined if missing, non-numeric, or <= 0. Bounded by max.
 * Only plain base-10 integers are accepted: partial numerics such as "1e3", "2.5" or "10abc"
 * are rejected rather than silently truncated by parseInt.
 */
export function parseLimit(params: URLSearchParams, max = 100): number | undefined {
  if (!params || typeof params.get !== "function") return undefined;
  const cap = Math.floor(max);
  if (!Number.isFinite(max) || cap <= 0) return undefined;
  const raw = (
    params.get("limit") ??
    params.get("take") ??
    params.get("pageSize") ??
    params.get("page_size") ??
    params.get("per_page") ??
    params.get("size") ??
    params.get("count") ??
    params.get("max")
  )?.trim();
  if (!raw || !/^\+?\d+$/.test(raw)) return undefined;
  const num = Number(raw);
  if (!(num > 0)) return undefined;
  return Math.min(num, cap);
}

/**
 * Safely parses an optional integer 1-based page number from URL search parameters (accepts "page", "p", "pageNum", or "page_num").
 * Returns undefined if missing, non-numeric, or <= 0. Bounded by max.
 */
export function parsePage(params: URLSearchParams, max = 10000): number | undefined {
  if (!params || typeof params.get !== "function") return undefined;
  const cap = Math.floor(max);
  if (!Number.isFinite(max) || cap <= 0) return undefined;
  const raw = (
    params.get("page") ??
    params.get("p") ??
    params.get("pageNum") ??
    params.get("page_num")
  )?.trim();
  if (!raw || !/^\+?\d+$/.test(raw)) return undefined;
  const num = Number(raw);
  if (!(num > 0)) return undefined;
  return Math.min(num, cap);
}

/**
 * Safely parses an optional integer offset from URL search parameters (accepts "offset", "skip", "start", or "from").
 * If neither is present, calculates offset from 1-based "page" / "p" when a page size is available.
 * Returns undefined if missing, non-numeric, or < 0. Bounded by optional max.
 * Only plain base-10 non-negative integers are accepted: partial numerics such as "1e3" or "2.5"
 * are rejected rather than silently truncated by parseInt.
 */
export function parseOffset(params: URLSearchParams, max = 10000, pageSize?: number): number | undefined {
  if (!params || typeof params.get !== "function") return undefined;
  const cap = Math.floor(max);
  if (!Number.isFinite(max) || cap < 0) return undefined;
  const raw = (
    params.get("offset") ??
    params.get("skip") ??
    params.get("start") ??
    params.get("from")
  )?.trim();
  if (raw) {
    if (!/^\+?\d+$/.test(raw)) return undefined;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) return undefined;
    return Math.min(num, cap);
  }
  const page = parsePage(params, max);
  if (page && page > 0) {
    const size = pageSize ?? parseLimit(params, max);
    if (size && size > 0) {
      return Math.min((page - 1) * size, cap);
    }
  }
  return undefined;
}

export type SortOrder = "asc" | "desc";

/**
 * Safely parses an optional sort order from URL search parameters (accepts "order", "sort", "dir", "direction", or "orderBy").
 * Returns "asc" for ascending/oldest, "desc" for descending/newest/reverse, or undefined if omitted/unrecognized.
 */
export function parseSortOrder(params: URLSearchParams, paramName = "order"): SortOrder | undefined {
  if (!params || typeof params.get !== "function" || !paramName || typeof paramName !== "string") return undefined;
  const raw = (
    params.get(paramName) ??
    params.get("sort") ??
    params.get("dir") ??
    params.get("direction") ??
    params.get("orderBy") ??
    params.get("order_by")
  )?.trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === "asc" || raw === "ascending" || raw === "oldest" || raw === "first") return "asc";
  if (raw === "desc" || raw === "descending" || raw === "newest" || raw === "last" || raw === "reverse") return "desc";
  return undefined;
}

/**
 * Safely extracts a trimmed lowercase query string from URL search parameters.
 * When paramName is "q", also accepts "query", "search", or "keyword".
 * Returns undefined if missing or containing only whitespace.
 */
export function parseSearchQuery(params: URLSearchParams, paramName = "q"): string | undefined {
  if (!params || typeof params.get !== "function" || !paramName || typeof paramName !== "string") return undefined;
  let raw = params.get(paramName);
  if (!raw && paramName === "q") {
    raw = params.get("query") ?? params.get("search") ?? params.get("keyword");
  }
  if (!raw) return undefined;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

