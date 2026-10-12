import { BRAND_NAME } from "./brand";

export type TierId = "seraphim" | "cherubim" | "thrones" | "angels";

export type Tier = {
  id: TierId;
  rank: number;
  name: string;
  tagline: string;
  positioning: string; // relative pricing feel, no dollar figures
  cadence: string;
  summary: string;
  included: string[];
  notIncluded: string[];
  forWho: string;
  price: string; // "Starting at" figure per scoped engagement, final quote set in writing
  priceUnit: string;
  timeline: string;
  deliverables: string[];
  fitWhen: string;
};

/**
 * The four service tiers. Every line describes work that is actually delivered by people
 * (plus private local models for scenario design). There is no monitoring platform, no
 * sensors or agents, no self-serve scanner, no SLA and no certification behind any tier.
 * Prices are "Starting at" figures; every engagement is quoted in writing after scoping.
 * Rationale and market sources: brand/seraphim-scan/pricing-rationale.md (workspace).
 */
export const tiers: Tier[] = [
  {
    id: "seraphim",
    price: "$9,500",
    priceUnit: "per scoped engagement",
    timeline: "About 3 to 5 weeks from signed scope to final report, then advisory for 90 days",
    deliverables: [
      "Passive recon summary",
      "Scoped Assessment report with ranked findings and evidence",
      "Remediation plan with owners and verification steps",
      "Retest report confirming each fix",
      "90 days of advisory and scope reviews",
    ],
    rank: 1,
    name: "Seraphim",
    tagline: "The full engagement, from first look to verified fix and beyond.",
    positioning: "Premium, custom scoped",
    cadence: "Scoped engagement with ongoing advisory",
    summary:
      "Our most complete engagement. We take the whole path together: passive recon, a comprehensive Scoped Assessment of your applications and AI agent systems, remediation guidance, retest, and continuing advisory as your stack changes.",
    included: [
      "Passive public recon: DNS and mail authentication, TLS, security headers, certificate transparency",
      "Comprehensive Scoped Assessment across agreed systems, including AI agent tool permissions, secrets exposure, prompt injection paths and sandbox boundaries",
      "Scenario design with private local models, reviewed by a person",
      "Ranked remediation guidance with owners and verification steps",
      "Retest of every fixed finding, and a written record you can hand to your own auditors",
      "Ongoing advisory: scope reviews when your architecture or agents change",
    ],
    notIncluded: [
      "Active exploitation or any testing without written client authorization",
      "Compliance certification or an audit opinion (we give you evidence for your auditor, not a certificate)",
      "Writing or deploying fixes in your systems for you",
      "Anything outside the written scope",
      "A managed security operations center or round-the-clock response",
    ],
    forWho:
      "Teams that run AI agents or customer-facing platforms in production and want one accountable partner from discovery through verified fixes.",
    fitWhen: "You want depth, a long-term partner, and a scope tailored to your stack.",
  },
  {
    id: "cherubim",
    price: "$1,500",
    priceUnit: "per quarterly cycle, minimum two cycles",
    timeline: "One cycle each quarter, written summary within 5 business days of each check",
    deliverables: [
      "Quarterly passive-recon change report",
      "Retest notes on earlier findings",
      "Email alerts for notable changes found in a scheduled check",
    ],
    rank: 2,
    name: "Cherubim",
    tagline: "A recurring watch on what the outside world can see, with periodic retests.",
    positioning: "Recurring subscription, mid to high",
    cadence: "Recurring, on an agreed schedule",
    summary:
      "A continuing service for teams that have already been assessed and want to keep their exposure honest. We re-run passive recon on a schedule, review what changed, retest earlier findings periodically, and report by written report and email.",
    included: [
      "Scheduled passive-recon re-checks of your public footprint",
      "Change review: what appeared, disappeared or drifted since the last report",
      "Periodic retests of previously reported findings",
      "Email alerts for notable changes we spot in a scheduled check, and a written summary each cycle",
      "Short advisory calls to interpret changes and prioritize fixes",
    ],
    notIncluded: [
      "Compliance certification",
      "24/7 monitoring, a security operations center, or real-time blocking",
      "Software agents or sensors installed in your environment",
      "Any active testing outside a signed scope",
    ],
    forWho:
      "Teams with a stable footprint that changes over time (new hosts, new vendors, new agents) and want regular, human-reviewed check-ins.",
    fitWhen: "You have had an assessment and want the picture refreshed on a schedule.",
  },
  {
    id: "thrones",
    price: "$4,500",
    priceUnit: "per scoped engagement",
    timeline: "About 2 to 3 weeks, with one retest round within 60 days",
    deliverables: [
      "Scoped Assessment report for one target",
      "Remediation guidance per finding",
      "Retest report",
      "Final written report",
    ],
    rank: 3,
    name: "Thrones",
    tagline: "One deep assessment, then the hardening work to close what it finds.",
    positioning: "Fixed-scope project, mid",
    cadence: "One-time project",
    summary:
      "A single, deep Scoped Assessment of one defined target, such as one application, one API or one AI agent system, followed by remediation guidance and a retest so the fixes are verified.",
    included: [
      "Passive recon of the target's public surface",
      "One Scoped Assessment inside a written scope and window",
      "Findings with proposed severities and plain-language explanations",
      "Remediation guidance and one retest round",
      "A final written report",
    ],
    notIncluded: [
      "Active exploitation beyond the written scope and window",
      "Compliance certification or an audit opinion",
      "Recurring re-checks after the retest",
      "Coverage of systems beyond the single agreed target",
    ],
    forWho:
      "Teams preparing for a launch, a customer security review or fundraising diligence that need one system looked at properly.",
    fitWhen: "You have one important system and a deadline.",
  },
  {
    id: "angels",
    price: "$950",
    priceUnit: "one-time report",
    timeline: "Report within 5 business days of kickoff",
    deliverables: [
      "Passive recon report on your public footprint",
      "Prioritized top fixes list",
      "One 30-minute walkthrough call",
    ],
    rank: 4,
    name: "Angels",
    tagline: "A light first look at your public exposure. The easy on-ramp.",
    positioning: "Entry-level",
    cadence: "One-time report",
    summary:
      "A lightweight passive-recon report on your public footprint, delivered by us. It is observational only: what can be seen from outside, what looks off, and what to fix first. No active testing.",
    included: [
      "Passive recon only: DNS and mail authentication, TLS, security headers, certificate transparency",
      "A short written report with a prioritized list of what to look at first",
      "One follow-up conversation to walk through it",
    ],
    notIncluded: [
      "Compliance certification or an audit opinion",
      "Any Scoped Assessment or active testing",
      "Retest of fixes (available by moving to Thrones)",
      "A self-serve scanner. Self-serve is not available today.",
    ],
    forWho:
      "Small teams and founders who want a sober, inexpensive first read on their public exposure before deciding what to do next.",
    fitWhen: "You want to start small and see what a report looks like.",
  },
];

export const tierById = (id: TierId) => tiers.find((t) => t.id === id)!;
export const tierHref = (id: TierId) => `/pricing#${id}`;

/** Comparison matrix. true = included, false = not included, string = short qualifier. */
export const matrix: { row: string; values: Record<TierId, boolean | string> }[] = [
  { row: "Passive public recon", values: { seraphim: true, cherubim: "Scheduled re-checks", thrones: true, angels: true } },
  { row: "Scoped Assessment (written authorization required)", values: { seraphim: "Comprehensive", cherubim: false, thrones: "One target", angels: false } },
  { row: "AI agent review: tool permissions, secrets, prompt injection, sandbox boundaries", values: { seraphim: true, cherubim: false, thrones: "If in scope", angels: false } },
  { row: "Remediation guidance", values: { seraphim: true, cherubim: "Guidance on changes", thrones: true, angels: "Top fixes to look at" } },
  { row: "Retest", values: { seraphim: true, cherubim: "Periodic", thrones: "One round", angels: false } },
  { row: "Change review and email alerts from scheduled checks", values: { seraphim: "On request", cherubim: true, thrones: false, angels: false } },
  { row: "Ongoing advisory", values: { seraphim: true, cherubim: "Short calls", thrones: false, angels: false } },
  { row: "Starting at", values: { seraphim: "$9,500", cherubim: "$1,500 / quarter", thrones: "$4,500", angels: "$950" } },
  { row: "Delivery", values: { seraphim: "Custom", cherubim: "Recurring", thrones: "One-time", angels: "One-time" } },
];

export const helper: { q: string; a: { label: string; tier: TierId }[] }[] = [
  {
    q: "What do you need most right now?",
    a: [
      { label: "A quick, low-cost first read on our public exposure", tier: "angels" },
      { label: "One important system properly assessed and fixed", tier: "thrones" },
      { label: "A regular refresh after we have already been assessed", tier: "cherubim" },
      { label: "A full engagement across apps and AI agents with an ongoing partner", tier: "seraphim" },
    ],
  },
];

export const ENGAGEMENT_TERMS = `${BRAND_NAME} only works with written client authorization. Passive recon uses public information only. Any Scoped Assessment runs strictly inside an agreed written scope and window, and stops at the boundaries you set. Tier descriptions are summaries, not contracts: the scope, deliverables and terms of each engagement are set in writing before work starts.`;
