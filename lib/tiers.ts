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
  fitWhen: string;
};

/**
 * Human Scoped Assessment tiers. Every line is work delivered by people (plus private
 * local models for scenario design). These are not the automated scan products in
 * lib/scanTiers.ts. There is no monitoring platform, no sensors installed in a client
 * environment, no SLA, and no certification behind any tier. No prices are published.
 */
export const tiers: Tier[] = [
  {
    id: "seraphim",
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
      "Anything outside the written scope",
      "A managed security operations center or round-the-clock response",
    ],
    forWho:
      "Teams that run AI agents or customer-facing platforms in production and want one accountable partner from discovery through verified fixes.",
    fitWhen: "You want depth, a long-term partner, and a scope tailored to your stack.",
  },
  {
    id: "cherubim",
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
      "Recurring re-checks after the retest",
      "Coverage of systems beyond the single agreed target",
    ],
    forWho:
      "Teams preparing for a launch, a customer security review or fundraising diligence that need one system looked at properly.",
    fitWhen: "You have one important system and a deadline.",
  },
  {
    id: "angels",
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
      "Any Scoped Assessment or active testing",
      "Retest of fixes (available by moving to Thrones)",
      "The automated passive scan. That is a separate product on the Scan page, and it does not include this conversation.",
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

export const ENGAGEMENT_TERMS = `${BRAND_NAME} runs automated scans only after you affirm you are authorized, and those scans stay passive. A human Scoped Assessment still requires written client authorization. It runs inside an agreed scope and window, and stops at the boundaries you set. Tier descriptions are summaries, not contracts: the scope, deliverables and terms of each engagement are set in writing before work starts.`;
