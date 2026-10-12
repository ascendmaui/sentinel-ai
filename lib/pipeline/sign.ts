import crypto from "node:crypto";
import { cfg, SITE } from "./config";

const mac = (s: string) => crypto.createHmac("sha256", cfg.signing || "unset").update(s).digest("hex").slice(0, 40);
export const safeEq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Signed, expiring report link (default 14 days). */
export function reportLink(sid: string, days = 14) {
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  return `${SITE}/api/report/${encodeURIComponent(sid)}?exp=${exp}&sig=${mac(`report:${sid}:${exp}`)}`;
}
export const checkReport = (sid: string, exp: string, sig: string) => Number(exp) * 1000 > Date.now() && safeEq(sig, mac(`report:${sid}:${exp}`));

export const unsubLink = (email: string) => `${SITE}/api/unsubscribe?e=${encodeURIComponent(email)}&sig=${mac(`unsub:${email.toLowerCase()}`)}`;
export const checkUnsub = (email: string, sig: string) => safeEq(sig, mac(`unsub:${email.toLowerCase()}`));
export const emailKey = (email: string) => crypto.createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 32);
