import type { CookieFact, HeaderMap } from "./types";

const SECRET_RULES: { kind: string; re: RegExp }[] = [
  { kind: "aws-access-key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { kind: "private-key-block", re: /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/ },
  { kind: "stripe-live-secret", re: /\bsk_live_[0-9a-zA-Z]{10,}\b/ },
  { kind: "anthropic-api-key", re: /\bsk-ant-[a-zA-Z0-9_-]{20,}\b/ },
  { kind: "openai-api-key", re: /\bsk-(?!ant-)(?:proj-|admin-)?[a-zA-Z0-9_-]{20,}\b/ },
  { kind: "google-api-key", re: /\bAIzaSy[0-9A-Za-z_-]{30,35}\b/ },
  { kind: "huggingface-token", re: /\bhf_[a-zA-Z0-9]{34,}\b/ },
  { kind: "github-token", re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { kind: "slack-token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { kind: "sendgrid-api-key", re: /\bSG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}\b/ },
  { kind: "postman-api-key", re: /\bPMAK-[0-9a-f]{24}-[0-9a-f]{34}\b/ },
  { kind: "cohere-api-key", re: /\bco-[a-zA-Z0-9_-]{20,40}\b/ },
  { kind: "replicate-api-token", re: /\br8_[a-zA-Z0-9]{32,40}\b/ },
  { kind: "pinecone-api-key", re: /\bpcsk_[a-zA-Z0-9_-]{40,}\b/ },
  { kind: "gitlab-token", re: /\bglpat-[0-9a-zA-Z_-]{20,}\b/ },
  { kind: "npm-token", re: /\bnpm_[a-zA-Z0-9]{36}\b/ },
  { kind: "assigned-secret", re: /\b(?:api[_-]?key|secret|password|token)\b\s*[:=]\s*['"][^'"\s]{12,}['"]/i },
];

export type SecretHit = { kind: string; redacted: string };

/** Cookie names and flags only. The cookie value is never returned. */
export function summarizeSetCookie(rawValues: string[]): CookieFact[] {
  return rawValues.slice(0, 20).map((raw) => {
    const namePart = raw.split("=", 1)[0] ?? "";
    const name = namePart.trim().slice(0, 80) || "(unnamed)";
    const same = /samesite\s*=\s*(strict|lax|none)/i.exec(raw);
    return {
      name,
      secure: /;\s*secure\b/i.test(raw),
      httpOnly: /httponly/i.test(raw),
      sameSite: same ? same[1].toLowerCase() : null,
    };
  });
}

export function headerMap(headers: Record<string, string | string[] | undefined>): HeaderMap {
  const out: HeaderMap = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (lower === "set-cookie") continue;
    if (typeof value === "string") out[lower] = value.slice(0, 500);
    else if (Array.isArray(value)) out[lower] = value.join(", ").slice(0, 500);
  }
  return out;
}

export function findSecretHits(html: string): SecretHit[] {
  const slice = html.slice(0, 500_000);
  const hits: SecretHit[] = [];
  for (const rule of SECRET_RULES) {
    const match = rule.re.exec(slice);
    if (!match || match.index === undefined) continue;
    hits.push({ kind: rule.kind, redacted: redactAround(slice, match.index, match[0].length) });
  }
  return hits.slice(0, 8);
}

function redactAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 16);
  const end = Math.min(text.length, index + length + 16);
  const match = text.slice(index, index + length);
  const window = text.slice(start, end).replace(/\s+/g, " ");
  return window.replace(match, "[redacted]");
}

export function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([^<]{0,200})/i.exec(html);
  if (!match) return null;
  const title = decodeBasic(match[1]).trim();
  return title || null;
}

export function extractScriptSrcs(html: string): string[] {
  const out: string[] = [];
  const re = /<script\b[^>]*\bsrc\s*=\s*["']([^"']{1,400})["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && out.length < 40) {
    out.push(match[1].trim());
  }
  return out;
}

export function countForms(html: string): number {
  const matches = html.match(/<form\b/gi);
  return matches ? Math.min(matches.length, 999) : 0;
}

export function hasPasswordField(html: string): boolean {
  return /<input\b[^>]*type\s*=\s*["']password["']/i.test(html.slice(0, 500_000));
}

const AI_WIDGET_HOSTS = [
  "openai.com",
  "chatgpt.com",
  "anthropic.com",
  "claude.ai",
  "intercom.io",
  "intercomcdn.com",
  "drift.com",
  "crisp.chat",
  "tawk.to",
  "voiceflow.com",
  "botpress.cloud",
  "dialogflow.cloud.google.com",
  "elevenlabs.io",
  "vapi.ai",
  "groq.com",
  "replicate.com",
  "cohere.com",
  "pinecone.io",
  "retellai.com",
  "bland.ai",
  "langchain.com",
  "langfuse.com",
];

export type PromptSurface = { label: string };

/** Public-HTML heuristics only. This does not send any prompt to the target. */
export function promptSurfaceHints(html: string, scriptSrcs: string[]): PromptSurface[] {
  const hints: PromptSurface[] = [];
  const lower = html.slice(0, 200_000).toLowerCase();
  if (lower.includes("/v1/chat/completions") || lower.includes("/v1/responses")) {
    hints.push({ label: "Page source references an LLM chat endpoint path." });
  }
  if (/\b(placeholder|aria-label|name)\s*=\s*["'][^"']*(prompt|ask the|chat)[^"']*["']/i.test(lower)) {
    hints.push({ label: "A form control is labeled like a prompt or chat box." });
  }
  for (const src of scriptSrcs) {
    let host = "";
    try {
      host = new URL(src, "https://scan.invalid").hostname.toLowerCase();
    } catch {
      continue;
    }
    const widget = AI_WIDGET_HOSTS.find((item) => host === item || host.endsWith(`.${item}`));
    if (widget) hints.push({ label: `Script loaded from ${widget}.` });
  }
  return hints.slice(0, 8);
}

export function thirdPartyHosts(scriptSrcs: string[], pageHost: string): string[] {
  const hosts = new Set<string>();
  for (const src of scriptSrcs) {
    try {
      const host = new URL(src, `https://${pageHost}`).hostname.toLowerCase();
      if (host && host !== pageHost && !host.endsWith(`.${pageHost}`)) hosts.add(host);
    } catch {
      continue;
    }
  }
  return [...hosts].slice(0, 25);
}

export type SpfIssue = "missing" | "multiple" | "pass-all" | "neutral" | "softfail" | "ok";

export function interpretSpf(txt: string[]): { record: string | null; issue: SpfIssue } {
  const records = txt.filter((item) => item.toLowerCase().startsWith("v=spf1"));
  if (records.length === 0) return { record: null, issue: "missing" };
  if (records.length > 1) return { record: clip(records[0]), issue: "multiple" };
  const record = records[0];
  const lower = record.toLowerCase();
  if (/\+all\b/.test(lower)) return { record: clip(record), issue: "pass-all" };
  if (/\?all\b/.test(lower)) return { record: clip(record), issue: "neutral" };
  if (/~all\b/.test(lower)) return { record: clip(record), issue: "softfail" };
  return { record: clip(record), issue: "ok" };
}

export type DmarcIssue = "missing" | "none" | "quarantine" | "reject" | "other";

export function interpretDmarc(txt: string[]): { record: string | null; issue: DmarcIssue } {
  const record = txt.find((item) => item.toLowerCase().includes("v=dmarc1")) ?? null;
  if (!record) return { record: null, issue: "missing" };
  const policy = /;\s*p\s*=\s*(none|quarantine|reject)\s*(?:;|$)/i.exec(record) ?? /\bp\s*=\s*(none|quarantine|reject)\b/i.exec(record);
  if (!policy) return { record: clip(record), issue: "other" };
  const value = policy[1].toLowerCase();
  if (value === "none" || value === "quarantine" || value === "reject") {
    return { record: clip(record), issue: value };
  }
  return { record: clip(record), issue: "other" };
}

export function robotsDisallowAll(body: string): boolean {
  return /user-agent:\s*\*[^\n]*\n(?:[^\n]*\n){0,6}\s*disallow:\s*\/\s*$/im.test(body.slice(0, 20_000));
}

export function sitemapUrlsFromRobots(body: string): string[] {
  const urls: string[] = [];
  const re = /^sitemap:\s*(\S+)/gim;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) && urls.length < 3) urls.push(match[1]);
  return urls;
}

export function countSitemapLocs(body: string): number {
  const matches = body.match(/<loc>/gi);
  return matches ? matches.length : 0;
}

const HEADER_WEIGHTS: { id: string; weight: number; present: (headers: HeaderMap) => boolean }[] = [
  { id: "hsts", weight: 25, present: (headers) => /max-age=\d+/i.test(headers["strict-transport-security"] ?? "") },
  { id: "csp", weight: 25, present: (headers) => Boolean(headers["content-security-policy"]) },
  { id: "nosniff", weight: 15, present: (headers) => (headers["x-content-type-options"] ?? "").toLowerCase().includes("nosniff") },
  {
    id: "frame",
    weight: 15,
    present: (headers) => Boolean(headers["x-frame-options"]) || /frame-ancestors/i.test(headers["content-security-policy"] ?? ""),
  },
  { id: "referrer", weight: 10, present: (headers) => Boolean(headers["referrer-policy"]) },
  { id: "permissions", weight: 10, present: (headers) => Boolean(headers["permissions-policy"]) },
];

export function headerScore(headers: HeaderMap): number {
  const total = HEADER_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
  const got = HEADER_WEIGHTS.reduce((sum, item) => sum + (item.present(headers) ? item.weight : 0), 0);
  return Math.round((got / total) * 100);
}

function isIpAddress(host: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":");
}

export function mailDomain(host: string): string {
  if (isIpAddress(host)) return host;
  const labels = host.toLowerCase().split(".").filter(Boolean);
  if (labels.length <= 2) return labels.join(".");
  return labels.slice(1).join(".");
}

function clip(value: string): string {
  return value.replace(/\s+/g, " ").slice(0, 300);
}

function decodeBasic(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
