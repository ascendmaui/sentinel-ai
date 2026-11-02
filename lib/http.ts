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
 * Retrieves the first non-empty string value for any of the provided parameter keys.
 * Handles duplicate parameters and falls back gracefully when early keys are present but empty (e.g. ?limit=&take=5).
 */
export function getFirstParam(params: URLSearchParams, ...keys: string[]): string | undefined {
  if (!params || typeof params.get !== "function") return undefined;
  for (const k of keys) {
    if (!k || typeof k !== "string") continue;
    const values = typeof params.getAll === "function" ? params.getAll(k) : [params.get(k)];
    for (const raw of values) {
      if (typeof raw !== "string") continue;
      const v = raw.trim();
      if (v.length > 0) return v;
    }
  }
  return undefined;
}

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
  const raw = getFirstParam(
    params,
    "limit",
    "take",
    "pageSize",
    "page_size",
    "per_page",
    "perPage",
    "size",
    "count",
    "page_limit",
    "pageLimit",
    "rows",
    "rows_per_page",
    "rowsPerPage",
    "limit_count",
    "limitCount",
    "items",
    "items_per_page",
    "itemsPerPage",
    "item_count",
    "itemCount",
    "num_results",
    "numResults",
    "records",
    "records_per_page",
    "recordsPerPage",
    "top",
    "results",
    "max"
  );
  if (!raw || !/^\+?\d+$/.test(raw)) return undefined;
  const num = Number(raw);
  if (!(num > 0)) return undefined;
  return Math.min(num, cap);
}

/**
 * Safely parses an optional integer 1-based page number from URL search parameters (accepts "page", "p", "pageNum", "page_num", "pageNumber", "page_number", "pageNo", or "page_no").
 * Returns undefined if missing, non-numeric, or <= 0. Bounded by max.
 */
export function parsePage(params: URLSearchParams, max = 10000): number | undefined {
  if (!params || typeof params.get !== "function") return undefined;
  const cap = Math.floor(max);
  if (!Number.isFinite(max) || cap <= 0) return undefined;
  const raw = getFirstParam(
    params,
    "page",
    "p",
    "pg",
    "p_num",
    "pNum",
    "pageNum",
    "page_num",
    "pageNumber",
    "page_number",
    "pageNo",
    "page_no",
    "page_id",
    "pageId",
    "page_idx",
    "pageIdx",
    "page_index",
    "pageIndex"
  );
  if (!raw || !/^\+?\d+$/.test(raw)) return undefined;
  const num = Number(raw);
  if (!(num > 0)) return undefined;
  return Math.min(num, cap);
}

/**
 * Safely parses an optional integer offset from URL search parameters (accepts "offset", "skip", "start", "from", "start_at", or "startAt").
 * If neither is present, calculates offset from 1-based "page" / "p" when a page size is available.
 * Returns undefined if missing, non-numeric, or < 0. Bounded by optional max.
 * Only plain base-10 non-negative integers are accepted: partial numerics such as "1e3" or "2.5"
 * are rejected rather than silently truncated by parseInt.
 */
export function parseOffset(params: URLSearchParams, max = 10000, pageSize?: number): number | undefined {
  if (!params || typeof params.get !== "function") return undefined;
  const cap = Math.floor(max);
  if (!Number.isFinite(max) || cap < 0) return undefined;
  const raw = getFirstParam(
    params,
    "offset",
    "skip",
    "start",
    "from",
    "start_at",
    "startAt",
    "start_index",
    "startIndex",
    "start_idx",
    "startIdx",
    "from_index",
    "fromIndex",
    "from_idx",
    "fromIdx",
    "offset_count",
    "offsetCount",
    "offset_idx",
    "offsetIdx",
    "skip_count",
    "skipCount"
  );
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
 * Safely parses an optional sort order from URL search parameters (accepts "order", "sort", "sort_order", "sortOrder", "dir", "direction", "sort_dir", "sortDir", "orderBy", or "order_by").
 * Returns "asc" for ascending/oldest/earliest/first, "desc" for descending/newest/latest/last/reverse, or undefined if omitted/unrecognized.
 */
export function parseSortOrder(params: URLSearchParams, paramName = "order"): SortOrder | undefined {
  if (!params || typeof params.get !== "function" || !paramName || typeof paramName !== "string") return undefined;
  const raw = getFirstParam(
    params,
    paramName,
    "sort",
    "sort_order",
    "sortOrder",
    "dir",
    "direction",
    "sort_dir",
    "sortDir",
    "sort_direction",
    "sortDirection",
    "order_dir",
    "orderDir",
    "order_direction",
    "orderDirection",
    "sort_order_dir",
    "sortOrderDir",
    "sort_by",
    "sortBy",
    "ordering",
    "orderBy",
    "order_by"
  )?.toLowerCase();
  if (!raw) return undefined;
  if (raw === "asc" || raw === "ascending" || raw === "oldest" || raw === "earliest" || raw === "first" || raw === "forward" || raw === "up" || raw === "ascend" || raw === "older" || raw === "chronological" || raw === "chrono" || raw === "1" || raw === "+1") return "asc";
  if (raw === "desc" || raw === "descending" || raw === "newest" || raw === "latest" || raw === "last" || raw === "reverse" || raw === "reversed" || raw === "rev" || raw === "recent" || raw === "backward" || raw === "backwards" || raw === "down" || raw === "descend" || raw === "newer" || raw === "reverse-chronological" || raw === "reverse_chronological" || raw === "-1") return "desc";
  return undefined;
}

/**
 * Safely extracts a trimmed lowercase query string from URL search parameters.
 * When paramName is "q", also accepts "query", "search", "keyword", "term", "filter", or "find".
 * Returns undefined if missing or containing only whitespace.
 */
export function parseSearchQuery(params: URLSearchParams, paramName = "q"): string | undefined {
  if (!params || typeof params.get !== "function" || !paramName || typeof paramName !== "string") return undefined;
  const cleanParam = paramName.trim();
  if (!cleanParam) return undefined;
  const keys =
    cleanParam === "q"
      ? [
          "q",
          "query",
          "search",
          "keyword",
          "term",
          "filter",
          "find",
          "lookup",
          "q_term",
          "qTerm",
          "query_term",
          "queryTerm",
          "search_query",
          "searchQuery",
          "search_term",
          "searchTerm",
          "search_text",
          "searchText",
          "text",
          "filter_text",
          "filterText",
          "keywords",
        ]
      : [cleanParam];
  const raw = getFirstParam(params, ...keys);
  if (!raw) return undefined;
  let trimmed = raw;
  try {
    trimmed = decodeURIComponent(trimmed);
  } catch {
    // keep raw
  }
  trimmed = trimmed.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

