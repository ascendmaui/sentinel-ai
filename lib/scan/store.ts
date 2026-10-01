import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Report } from "./types";

const TTL_MS = 2 * 60 * 60 * 1000;
const MAX_REPORTS = 40;
const DEV_SECRET = "dev-only-scan-report-secret-change-me";

type Entry = { report: Report; expires: number };

const globalStore = globalThis as typeof globalThis & { __seraphimScanReports?: Map<string, Entry> };

function reports(): Map<string, Entry> {
  if (!globalStore.__seraphimScanReports) globalStore.__seraphimScanReports = new Map();
  return globalStore.__seraphimScanReports;
}

function secret(): string {
  const configured = process.env.SCAN_REPORT_SECRET;
  if (configured && configured.length >= 16) return configured;
  return DEV_SECRET;
}

export function signReportId(id: string): string {
  const mac = createHmac("sha256", secret()).update(id).digest("base64url").slice(0, 22);
  return `${id}~${mac}`;
}

export function verifyReportToken(token: string): string | null {
  const split = token.lastIndexOf("~");
  if (split <= 0) return null;
  const id = token.slice(0, split);
  const mac = token.slice(split + 1);
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(id) || !/^[A-Za-z0-9_-]{10,64}$/.test(mac)) return null;
  const expected = createHmac("sha256", secret()).update(id).digest("base64url").slice(0, 22);
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return id;
}

export function newReportToken(): string {
  return signReportId(randomBytes(16).toString("base64url"));
}

function prune(store: Map<string, Entry>): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expires <= now) store.delete(key);
  }
  while (store.size > MAX_REPORTS) {
    const oldest = store.keys().next().value;
    if (!oldest) break;
    store.delete(oldest);
  }
}

export function saveReport(report: Report): void {
  const store = reports();
  prune(store);
  store.set(report.id, { report, expires: Date.now() + TTL_MS });
}

export function getReport(token: string): Report | null {
  if (!verifyReportToken(token)) return null;
  const store = reports();
  const entry = store.get(token);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    store.delete(token);
    return null;
  }
  return entry.report;
}
