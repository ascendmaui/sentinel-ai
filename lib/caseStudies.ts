export type Severity = "Critical" | "High" | "Medium" | "Low" | "Info";

export type Finding = {
  id: string;
  title: string;
  severity: Severity;
  rationale: string;
  what: string;
  before: string;
  after: string;
  fix: string;
  status: string;
};

/**
 * Every finding below is drawn from two documented sources only:
 *  - a read-only code review of the application (drafted 2026-09-25), and
 *  - the application's own remediation log.
 * No active exploitation or scanning is claimed. Wording is intentionally public-safe.
 */
export const findings: Finding[] = [
  {
    id: "F-01",
    title: "Scheduled-maintenance endpoint trusted a platform header",
    severity: "Medium",
    rationale:
      "Reachable without credentials, but the action is bounded: it only expires unpaid ride holds that are already past their time limit.",
    what: "An endpoint that expires unpaid ride holds is meant to be called only by a scheduler holding a shared secret. In production that secret had never been set, so the endpoint fell back to accepting a platform-supplied request header as proof of the caller. The same route also compared credentials with a plain equality check, could expire the same payment session twice when sweeps overlapped, and could echo internal error text.",
    before:
      "No shared secret configured; a header that any client can also send was enough to be treated as the scheduler.",
    after:
      "A random secret is set in production and stored in the database vault. The scheduler presents it as a bearer credential, compared in constant time; the header fallback only applies when no secret is configured. Overlapping sweeps are claimed atomically and errors are generic.",
    fix: "Require a high-entropy shared secret in every environment that serves the route; compare it in constant time; fail closed when it is missing; keep error detail server-side.",
    status:
      "Fixed. Verified: a request with the platform header but no credential returned 401, and a wrong credential returned 401.",
  },
  {
    id: "F-02",
    title: "Pickup date and time interpreted in the server's timezone",
    severity: "High",
    rationale:
      "Directly distorts what riders are charged (surge windows) and when dispatch believes a pickup occurs; ranked highest in the code review.",
    what: "A rider's chosen pickup date and time were parsed without a timezone, so on a server running in UTC an afternoon pickup was evaluated as a morning one. Surge windows were then evaluated against the wrong moment, mis-pricing airport-rush, weekend, and game-day rides.",
    before:
      "Wall-clock time was read in the server's local zone: 2:00 PM local was stored as 2:00 PM UTC, roughly four hours early.",
    after:
      "Civil date and time are read as the product's local wall clock and converted to one absolute instant. The same input now yields the same instant regardless of server timezone. Ambiguous or non-existent daylight-saving hours are handled by an explicit policy (first occurrence; skipped hour rejected). Fare formulas were not changed.",
    fix: "Never parse timezone-naive strings on the server; convert from the product timezone explicitly and test under a UTC runtime.",
    status: "Fixed and merged, with tests covering timezone independence and daylight-saving edges.",
  },
  {
    id: "F-03",
    title: "Scheduled trips always recorded a single passenger",
    severity: "Medium",
    rationale:
      "Party size never reached capacity-aware logic on the scheduling path; impact depends on how dispatch uses the count.",
    what: "The scheduling path hard-coded one passenger for every trip, including weekend party rides, so any downstream check that relies on the stored passenger count treated every party as a single rider.",
    before: "Passenger count was a constant 1 regardless of the request.",
    after:
      "The requested party size is read from the request (defaulting to 1 when absent or invalid) and stored on the trip. Fare inputs are unchanged.",
    fix: "Persist a validated party size; enforce a seat limit as a product decision informed by vehicle capacity.",
    status: "Fixed and merged (persists the requested size). Any hard seat cap remains a product decision.",
  },
  {
    id: "F-04",
    title: "Failed audit-log writes were silently ignored",
    severity: "Low",
    rationale:
      "Weakens auditability and troubleshooting; no direct exposure of data or funds.",
    what: "After a trip was created, the write of its audit event was fire-and-forget: a failure produced no log line and no error, and the request still reported success, so the event history could drift from reality unnoticed.",
    before: "Event insert result never inspected; request returned success either way.",
    after:
      "Event writes go through one helper that always logs failures and returns the error. Scheduling and settlement report a distinct error code; the mid-ride cancellation path keeps its success response (money already moved) but flags the event failure.",
    fix: "Check every audit-write result, log loudly, and choose per path whether failure should block or only flag.",
    status: "Fixed and merged, with tests for the failure path.",
  },
  {
    id: "F-05",
    title: "Student-discount eligibility disagreed between quote and display",
    severity: "Low",
    rationale:
      "Blank-tier edge case; risk is a price shown that differs from the price charged.",
    what: "Two helpers decided student-discount eligibility differently for a blank rider tier: one granted the discount and the other did not, so the displayed price and the checkout price could differ.",
    before: "A blank tier received a discount in the display path but not in the checkout path.",
    after:
      "Both paths use the same rule: only an omitted or explicitly standard tier qualifies. Multipliers and formulas are unchanged.",
    fix: "Use one shared eligibility predicate for every code path that prices a ride.",
    status: "Fixed and merged, with tests asserting both paths agree.",
  },
  {
    id: "F-06",
    title: "Referral payout ledger could record the same trip twice",
    severity: "Medium",
    rationale:
      "Financial integrity: a single completed trip could be paid out more than once.",
    what: "Settling a shared ride inserted a payout-ledger row on every run and the table had no uniqueness rule, so re-running settlement could create duplicate payout entries for one trip and one referral code.",
    before: "Plain insert; no unique key on trip and referral code.",
    after:
      "A unique index on the pair was added and settlement uses an insert-if-absent write that reports \"already recorded\" instead of duplicating. A read-only check of production data found no existing duplicates before the index was added.",
    fix: "Enforce idempotency in the database, not only in application code.",
    status: "Fixed per the remediation log.",
  },
  {
    id: "F-07",
    title: "Charge idempotency key included the amount, allowing a second payment intent",
    severity: "Medium",
    rationale:
      "Could produce a duplicate charge attempt when a fare moved during card authentication.",
    what: "Idempotency keys for several charge types embedded the fare amount. If the fare changed between retries, the key changed and a second payment intent could be created instead of reusing the open one.",
    before: "Key included the charge amount, so a moved fare produced a new key.",
    after:
      "Keys no longer contain the amount. They carry a generation marker that changes only after a successful charge, and an existing payment intent is retrieved and reused (or replaced only if canceled).",
    fix: "Derive idempotency keys from stable identifiers plus a generation counter, and look up existing intents before creating new ones.",
    status: "Fixed per the remediation log.",
  },
  {
    id: "F-08",
    title: "Two row-level security policies referenced each other",
    severity: "Low",
    rationale:
      "Availability defect (sign-in queries errored); the log documents no data exposure.",
    what: "A policy on one table queried a second table whose own policy queried the first, producing an infinite-recursion error that broke sign-in for new sessions.",
    before: "Circular policy dependency between the profile and trip tables.",
    after:
      "The cross-table check was moved into a narrowly scoped privileged helper function, breaking the cycle. An audit of all public-schema policies found no other cycles.",
    fix: "Avoid policy-to-policy cycles; put shared role checks in a locked-down helper and audit policies for recursion.",
    status: "Fixed and applied to the live database; verified in a rolled-back transaction.",
  },
];

export const severityCounts = findings.reduce<Record<string, number>>((acc, f) => {
  acc[f.severity] = (acc[f.severity] ?? 0) + 1;
  return acc;
}, {});

export type Remediation = {
  id: string;
  title: string;
  severity: Severity;
  found: string;
  changed: string;
  checked: string;
};

/**
 * Remediation summary. Each "checked" line states what was confirmed on 2026-09-29 by reading the
 * application's current main branch source (read-only) and running its own automated test suite.
 * Nothing here was confirmed by probing the running application.
 */
export const remediation: Remediation[] = [
  {
    id: "F-01",
    title: "Scheduled-maintenance endpoint trusted a platform header",
    severity: "Medium",
    found: "With no shared secret configured in production, the endpoint accepted a spoofable platform header as proof of the scheduler.",
    changed: "Constant-time bearer comparison; the header is honored only on the hosting platform and only when no usable secret exists; overlapping sweeps are claimed atomically; generic error responses. A random secret was set in production and the scheduler wired to present it.",
    checked: "Code and unit tests confirmed on current main. The production 401 checks are from the application's remediation log, not re-run.",
  },
  {
    id: "F-02",
    title: "Pickup date and time interpreted in the server's timezone",
    severity: "High",
    found: "Timezone-naive pickup times were parsed in the server zone, shifting surge windows by hours.",
    changed: "Date and time are read as the product's local wall clock and converted to a single instant; daylight-saving edge cases have an explicit policy. Fare formulas unchanged.",
    checked: "Code confirmed on current main; tests pass under both a UTC and a US-Eastern runtime.",
  },
  {
    id: "F-03",
    title: "Scheduled trips always recorded a single passenger",
    severity: "Medium",
    found: "The scheduling path stored one passenger regardless of party size.",
    changed: "The requested party size is validated (default 1) and stored on the trip. A hard seat cap was not added and remains a product decision.",
    checked: "Code and tests confirmed on current main.",
  },
  {
    id: "F-04",
    title: "Failed audit-log writes were silently ignored",
    severity: "Low",
    found: "Trip event inserts were fire-and-forget, so a failed write left no log line or error.",
    changed: "Server-side event writes go through one helper that logs and returns the error; scheduling and settlement return a distinct error code. Two client-side write sites (driver accept, driver desk) also log and surface failures.",
    checked: "Code and tests confirmed on current main.",
  },
  {
    id: "F-05",
    title: "Student-discount eligibility disagreed between quote and display",
    severity: "Low",
    found: "A blank rider tier got the discount in one path and not in the other.",
    changed: "Both paths apply the same rule: only an omitted or standard tier qualifies.",
    checked: "Code and tests confirmed on current main.",
  },
  {
    id: "F-06",
    title: "Referral payout ledger could record the same trip twice",
    severity: "Medium",
    found: "Settlement inserted a ledger row on every run with no uniqueness rule.",
    changed: "A unique index on trip and referral code, and an insert-if-absent write that reports \"already recorded\".",
    checked: "Migration, settlement code, and tests confirmed on current main. The absence of pre-existing duplicates in production is from the remediation log, not re-run.",
  },
  {
    id: "F-07",
    title: "Charge idempotency key included the amount",
    severity: "Medium",
    found: "A fare that moved during card authentication produced a new key and a second payment intent.",
    changed: "Keys are built from stable identifiers plus a generation marker that changes only after a successful charge; the existing payment intent is retrieved and reused.",
    checked: "Key-building code and tests confirmed on current main. Behavior against the live payment processor was not exercised.",
  },
  {
    id: "F-08",
    title: "Two row-level security policies referenced each other",
    severity: "Low",
    found: "A circular policy dependency between the profile and trip tables broke sign-in queries.",
    changed: "The cross-table check moved into a narrowly scoped privileged helper function.",
    checked: "Migration present on current main. That it is applied to the live database is from the remediation log, not re-checked.",
  },
];
