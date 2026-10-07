import type { TierId } from "./tiers";

/**
 * Automated scan products. These are separate from the human Scoped Assessment
 * tiers in lib/tiers.ts. Higher tiers add report sections. They do not turn on
 * active testing. Anything that would probe, exploit, or authenticate is
 * marked requires-engagement and is not run.
 */
export type ScanTierId = "basic" | "standard" | "advanced" | "full";

export type ScanTier = {
  id: ScanTierId;
  rank: number;
  /** Angelic class name, aligned with the human tier of the same depth. */
  className: string;
  emblem: TierId;
  /** Short product label, for example "Basic". */
  label: string;
  positioning: string;
  tagline: string;
  summary: string;
  runsNow: string[];
  notAutomatic: string[];
  forWho: string;
};

export const SCAN_TIER_ORDER: ScanTierId[] = ["basic", "standard", "advanced", "full"];

export const scanTiers: ScanTier[] = [
  {
    id: "basic",
    rank: 1,
    className: "Angels",
    emblem: "angels",
    label: "Basic",
    positioning: "Entry scan",
    tagline: "A passive public recon report: DNS, TLS, headers, and certificate transparency.",
    summary:
      "The on-ramp. We look only at public DNS, the TLS certificate on port 443, response headers, and a certificate-transparency query when that public lookup responds. No page mining and no active tests.",
    runsNow: [
      "DNS: address, mail, and name-server records, plus SPF and DMARC",
      "TLS certificate on port 443: issuer, expiry, and whether the browser would trust it",
      "Response headers from the URL you submit",
      "Certificate transparency lookup, or a pending mark if that lookup does not answer",
    ],
    notAutomatic: [
      "Header score, cookie flags, and page inventory (Standard)",
      "AI-exposure heuristics, robots, and sitemap (Advanced)",
      "Remediation plan and any active testing (human Scoped Assessment)",
    ],
    forWho: "Founders who want a first, sober read on what the public Internet can already see.",
  },
  {
    id: "standard",
    rank: 2,
    className: "Thrones",
    emblem: "thrones",
    label: "Standard",
    positioning: "Surface scan",
    tagline: "Everything in Basic, plus a header score and the obvious public misconfigurations.",
    summary:
      "Adds a security-header score, cookie flag review, server-banner notes, a short inventory of the fetched page, and a look for security.txt. Still passive. Still one site.",
    runsNow: [
      "Everything in Basic",
      "Numeric security-header score",
      "Set-Cookie flags (name and flags only; values are discarded)",
      "Homepage status, title, and whether a password field is present",
      "Fetch of /.well-known/security.txt on the same host",
    ],
    notAutomatic: [
      "Third-party script inventory, secret-shaped strings in HTML, robots and sitemap (Advanced)",
      "Active testing, authenticated review, and a human retest",
    ],
    forWho: "Teams that want the public surface scored before a launch or a customer security questionnaire.",
  },
  {
    id: "advanced",
    rank: 3,
    className: "Cherubim",
    emblem: "cherubim",
    label: "Advanced",
    positioning: "AI-exposure scan",
    tagline: "Public clues that an AI agent, chat box, or secret is already visible.",
    summary:
      "Adds heuristics over the public HTML only: chat and prompt widgets, third-party script hosts, secret-shaped strings, robots.txt, and sitemap.xml. Nothing is submitted to a model, and no injection payload is sent.",
    runsNow: [
      "Everything in Standard",
      "Third-party script host inventory from the fetched page",
      "Heuristic checklist for public AI or chat surfaces",
      "Secret-shaped strings in the public HTML, with the value redacted",
      "robots.txt and a same-host sitemap.xml",
    ],
    notAutomatic: [
      "Live prompt-injection exercises",
      "Authenticated testing and a remediation engagement",
    ],
    forWho: "Teams shipping an AI feature who want to know what a stranger can already see on the marketing site or app shell.",
  },
  {
    id: "full",
    rank: 4,
    className: "Seraphim",
    emblem: "seraphim",
    label: "Full",
    positioning: "Report package",
    tagline: "The full passive report, a remediation plan template, and a retest checklist.",
    summary:
      "The same passive checks as Advanced, packaged with a remediation plan template and a retest checklist. Deeper work — anything active, authenticated, or off the public page — is listed as requiring a signed human engagement and is not run.",
    runsNow: [
      "Everything in Advanced",
      "Remediation plan template tied to the findings this scan actually produced",
      "Retest checklist you can hand to engineering",
      "An explicit list of assessments that stay manual",
    ],
    notAutomatic: [
      "Port discovery beyond 80 and 443",
      "Authenticated application testing",
      "Live prompt-injection or agent exercises",
      "Cloud-account review and a human retest",
    ],
    forWho: "Teams that want the passive report and a written plan, and may commission a Scoped Assessment for the rest.",
  },
];

export function isScanTierId(value: string): value is ScanTierId {
  return value === "basic" || value === "standard" || value === "advanced" || value === "full";
}

export function scanTierById(id: ScanTierId): ScanTier {
  switch (id) {
    case "basic":
    case "standard":
    case "advanced":
    case "full":
      return scanTiers.find((item) => item.id === id) as ScanTier;
    default: {
      const unexpected: never = id;
      return unexpected;
    }
  }
}

export function tierAtLeast(tier: ScanTierId, minimum: ScanTierId): boolean {
  const rank: Record<ScanTierId, number> = { basic: 1, standard: 2, advanced: 3, full: 4 };
  return rank[tier] >= rank[minimum];
}

export const AUTHORIZATION_STATEMENT =
  "I own this website, or I have written authorization from the owner to request a passive public scan of it. I understand this scan does not perform active testing, port scanning, or authenticated access.";

export const SCAN_HREF = "/scan";

export function scanTierHref(id: ScanTierId): string {
  return `/scan?tier=${id}`;
}
