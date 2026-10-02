import type { ScanTierId } from "../scanTiers";

export const ENGINE_MODE = "passive-v1" as const;

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type CheckStatus = "pass" | "fail" | "info" | "pending" | "requires-engagement" | "not-in-tier";

export type Finding = {
  id: string;
  title: string;
  status: CheckStatus;
  severity: Severity;
  summary: string;
  evidence?: string;
  remediation?: string;
};

export type ReportSection = {
  id: string;
  title: string;
  minimumTier: ScanTierId;
  included: boolean;
  narrative: string;
  findings: Finding[];
};

export type PlanItem = {
  findingId: string;
  severity: Severity;
  action: string;
  owner: string;
  verify: string;
};

export type Report = {
  id: string;
  createdAt: string;
  engine: { mode: typeof ENGINE_MODE; note: string };
  tier: ScanTierId;
  tierName: string;
  className: string;
  companyName: string | null;
  target: {
    input: string;
    finalUrl: string | null;
    host: string;
  };
  authorization: {
    affirmed: true;
    affirmedAt: string;
    statement: string;
  };
  counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    pending: number;
    requiresEngagement: number;
    pass: number;
  };
  headerScore: number | null;
  sections: ReportSection[];
  remediationPlan: PlanItem[] | null;
  retestChecklist: string[] | null;
  limitations: string[];
};

export type HeaderMap = Record<string, string>;

export type CookieFact = {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
};

export type FetchOk = {
  ok: true;
  status: number;
  finalUrl: string;
  redirectHops: string[];
  headers: HeaderMap;
  cookies: CookieFact[];
  body: string;
  truncated: boolean;
  contentType: string | null;
};

export type FetchFail = { ok: false; error: string };

export type FetchResult = FetchOk | FetchFail;

export type TlsOk = {
  ok: true;
  protocol: string | null;
  subject: string | null;
  issuer: string | null;
  validTo: string | null;
  daysRemaining: number | null;
  authorized: boolean;
  authorizationError: string | null;
};

export type TlsResult = TlsOk | { ok: false; error: string };

export type DnsResult = {
  ok: boolean;
  error?: string;
  mailHost: string;
  a: string[];
  aaaa: string[];
  ns: string[];
  mx: string[];
  txt: string[];
  dmarcTxt: string[];
};

export type AuxResult =
  | { state: "skipped"; reason: string }
  | { state: "fail"; error: string }
  | { state: "ok"; status: number; finalUrl: string; body: string; truncated: boolean };

export type CtResult =
  | { state: "pending"; reason: string }
  | { state: "observed"; queryHost: string; names: string[] };

export type Observation = {
  requestedUrl: string;
  host: string;
  homepage: FetchResult;
  tls: TlsResult;
  dns: DnsResult;
  securityTxt: AuxResult;
  robots: AuxResult;
  sitemap: AuxResult;
  ct: CtResult;
};
