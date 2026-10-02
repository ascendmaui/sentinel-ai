import { BRAND_NAME } from "../brand";
import { scanTierById, tierAtLeast, type ScanTierId } from "../scanTiers";
import {
  countForms,
  countSitemapLocs,
  extractScriptSrcs,
  extractTitle,
  findSecretHits,
  hasPasswordField,
  headerScore,
  interpretDmarc,
  interpretSpf,
  promptSurfaceHints,
  robotsDisallowAll,
  thirdPartyHosts,
} from "./parse";
import { ENGINE_MODE, type CheckStatus, type Finding, type Observation, type PlanItem, type Report, type ReportSection, type Severity } from "./types";

const LIMITATIONS = [
  "This is a passive public scan. It does not prove that vulnerabilities are absent.",
  "Active testing, authenticated review, port discovery, and live prompt-injection exercises are not run.",
  "v1 keeps the report in memory on the server that produced it, and in this browser. There is no database yet, so the link can expire.",
  "Certificate transparency uses a public log query and is marked pending when that query does not answer.",
  "Mail authentication checks guess the organizational domain by dropping one left-hand label. They are not a full public-suffix lookup.",
  "The authorization checkbox is your affirmation. It is not a signed statement of work. A human Scoped Assessment still needs a written scope.",
];

export function buildReport(input: {
  id: string;
  createdAt: string;
  tier: ScanTierId;
  companyName: string | null;
  affirmedAt: string;
  statement: string;
  observation: Observation;
}): Report {
  const tier = scanTierById(input.tier);
  const sections = [
    transportSection(input.observation, input.tier),
    headerSection(input.observation, input.tier),
    surfaceSection(input.observation, input.tier),
    aiSection(input.observation, input.tier),
    manualSection(input.tier),
  ];
  const findings = sections.flatMap((section) => section.findings);
  const remediationPlan = tierAtLeast(input.tier, "full") ? planFrom(findings) : null;
  const retestChecklist = tierAtLeast(input.tier, "full") ? checklistFrom(findings) : null;
  const score = tierAtLeast(input.tier, "standard") && input.observation.homepage.ok
    ? headerScore(input.observation.homepage.headers)
    : null;

  return {
    id: input.id,
    createdAt: input.createdAt,
    engine: {
      mode: ENGINE_MODE,
      note: `${BRAND_NAME} passive scan. Deterministic checks only; no model is asked to invent findings.`,
    },
    tier: tier.id,
    tierName: tier.label,
    className: tier.className,
    companyName: input.companyName,
    target: {
      input: input.observation.requestedUrl,
      finalUrl: input.observation.homepage.ok ? input.observation.homepage.finalUrl : null,
      host: input.observation.host,
    },
    authorization: {
      affirmed: true,
      affirmedAt: input.affirmedAt,
      statement: input.statement,
    },
    counts: countFindings(findings),
    headerScore: score,
    sections,
    remediationPlan,
    retestChecklist,
    limitations: LIMITATIONS,
  };
}

function transportSection(observation: Observation, tier: ScanTierId): ReportSection {
  const findings: Finding[] = [];
  if (!observation.dns.ok) {
    findings.push(pending("dns-lookup", "DNS lookup", observation.dns.error ?? "DNS lookup did not complete."));
  } else {
    findings.push({
      id: "dns-addresses",
      title: "Public addresses",
      status: observation.dns.a.length + observation.dns.aaaa.length > 0 ? "info" : "fail",
      severity: observation.dns.a.length + observation.dns.aaaa.length > 0 ? "info" : "medium",
      summary: observation.dns.a.length + observation.dns.aaaa.length > 0
        ? "The hostname published address records."
        : "No public address records were returned.",
      evidence: clip(`A ${observation.dns.a.join(", ") || "—"}; AAAA ${observation.dns.aaaa.join(", ") || "—"}; NS ${observation.dns.ns.join(", ") || "—"}`),
      remediation: "Publish the addresses your site should answer on, and remove stale ones.",
    });
    const spf = interpretSpf(observation.dns.txt);
    findings.push(spfFinding(spf.issue, spf.record));
    const dmarc = interpretDmarc(observation.dns.dmarcTxt);
    findings.push(dmarcFinding(dmarc.issue, dmarc.record, observation.dns.mailHost));
    if (observation.dns.mx.length === 0) {
      findings.push({
        id: "dns-mx",
        title: "Mail exchangers",
        status: "info",
        severity: "info",
        summary: `No MX records were published at ${observation.dns.mailHost}. That is normal for a site that does not receive mail on this name.`,
      });
    } else {
      findings.push({
        id: "dns-mx",
        title: "Mail exchangers",
        status: "info",
        severity: "info",
        summary: "MX records were published.",
        evidence: clip(observation.dns.mx.join(", ")),
      });
    }
  }

  if (!observation.tls.ok) {
    findings.push(pending("tls-handshake", "TLS certificate", observation.tls.error));
  } else {
    findings.push(tlsExpiryFinding(observation.tls.daysRemaining, observation.tls.validTo));
    findings.push({
      id: "tls-trust",
      title: "Certificate trust",
      status: observation.tls.authorized ? "pass" : "fail",
      severity: observation.tls.authorized ? "info" : "high",
      summary: observation.tls.authorized
        ? "The certificate chained to a trusted root during this handshake."
        : "The certificate was not trusted during this handshake.",
      evidence: clip([observation.tls.subject, observation.tls.issuer, observation.tls.authorizationError].filter(Boolean).join(" · ")),
      remediation: observation.tls.authorized ? undefined : "Install a publicly trusted certificate for this hostname and serve the intermediate chain.",
    });
    const protocol = observation.tls.protocol;
    const oldProtocol = protocol === "TLSv1" || protocol === "TLSv1.1" || protocol === "SSLv3";
    findings.push({
      id: "tls-protocol",
      title: "TLS protocol",
      status: !protocol ? "pending" : oldProtocol ? "fail" : "pass",
      severity: oldProtocol ? "high" : "info",
      summary: protocol ? `Negotiated ${protocol}.` : "The handshake did not report a protocol.",
      remediation: oldProtocol ? "Disable TLS 1.0 and 1.1. Prefer TLS 1.2 or 1.3." : undefined,
    });
  }

  if (observation.ct.state === "pending") {
    findings.push(pending("ct-lookup", "Certificate transparency", observation.ct.reason));
  } else {
    findings.push({
      id: "ct-lookup",
      title: "Certificate transparency",
      status: "info",
      severity: "info",
      summary: observation.ct.names.length
        ? `Public logs returned ${observation.ct.names.length} name${observation.ct.names.length === 1 ? "" : "s"} for ${observation.ct.queryHost}.`
        : `The public log query for ${observation.ct.queryHost} returned no names in the sample we kept.`,
      evidence: observation.ct.names.length ? clip(observation.ct.names.join(", ")) : undefined,
      remediation: "Review unexpected names. Certificate transparency shows names that have been issued, including ones you may have forgotten.",
    });
  }

  return {
    id: "transport",
    title: "DNS, TLS, and certificate transparency",
    minimumTier: "basic",
    included: tierAtLeast(tier, "basic"),
    narrative: "Passive records and the certificate presented on port 443. No other ports are contacted.",
    findings,
  };
}

function headerSection(observation: Observation, tier: ScanTierId): ReportSection {
  if (!observation.homepage.ok) {
    return {
      id: "headers",
      title: "Security headers",
      minimumTier: "basic",
      included: true,
      narrative: "The homepage request did not complete, so headers could not be scored.",
      findings: [pending("homepage-fetch", "Homepage request", observation.homepage.error)],
    };
  }
  const headers = observation.homepage.headers;
  const findings: Finding[] = [];
  const https = observation.homepage.finalUrl.startsWith("https://");
  if (!https) {
    findings.push({
      id: "hdr-https",
      title: "HTTPS",
      status: "fail",
      severity: "medium",
      summary: "The final URL was not HTTPS.",
      evidence: clip(observation.homepage.finalUrl),
      remediation: "Redirect HTTP to HTTPS and keep the site on TLS.",
    });
  } else {
    findings.push({
      id: "hdr-https",
      title: "HTTPS",
      status: "pass",
      severity: "info",
      summary: "The final URL used HTTPS.",
      evidence: clip(observation.homepage.finalUrl),
    });
  }
  findings.push(headerPresent(headers, "strict-transport-security", "Strict-Transport-Security", "hsts", "medium", "Send Strict-Transport-Security with a max-age of at least six months once you are confident HTTPS is stable."));
  findings.push(headerPresent(headers, "content-security-policy", "Content-Security-Policy", "csp", "medium", "Add a Content-Security-Policy that fits the scripts and frames you actually use."));
  findings.push(nosniffFinding(headers));
  findings.push(frameFinding(headers));
  findings.push(headerPresent(headers, "referrer-policy", "Referrer-Policy", "referrer", "low", "Set Referrer-Policy, for example strict-origin-when-cross-origin."));
  findings.push(headerPresent(headers, "permissions-policy", "Permissions-Policy", "permissions", "info", "Set Permissions-Policy to turn off browser features you do not use."));

  if (tierAtLeast(tier, "standard")) {
    const banner = headers["server"] || headers["x-powered-by"];
    if (banner) {
      findings.push({
        id: "hdr-banner",
        title: "Server banner",
        status: "info",
        severity: "info",
        summary: "The response names the server software.",
        evidence: clip(banner),
        remediation: "Remove or genericize Server and X-Powered-By if you do not need them public.",
      });
    }
    for (const cookie of observation.homepage.cookies) {
      if (!cookie.secure || !cookie.httpOnly) {
        findings.push({
          id: `cookie-${cookie.name}`.slice(0, 80),
          title: `Cookie ${cookie.name}`,
          status: "fail",
          severity: cookie.name.toLowerCase().includes("session") ? "medium" : "low",
          summary: "A cookie is missing Secure or HttpOnly.",
          evidence: `Secure=${cookie.secure}; HttpOnly=${cookie.httpOnly}; SameSite=${cookie.sameSite ?? "unset"}`,
          remediation: "Mark session cookies HttpOnly and Secure, and set SameSite explicitly.",
        });
      }
    }
  }

  const score = tierAtLeast(tier, "standard") ? headerScore(headers) : null;
  return {
    id: "headers",
    title: "Security headers",
    minimumTier: "basic",
    included: true,
    narrative: score === null
      ? `HTTP ${observation.homepage.status}. Individual headers are listed below. The numeric score is part of Standard and above.`
      : `HTTP ${observation.homepage.status}. Security header score ${score} out of 100.`,
    findings,
  };
}

function surfaceSection(observation: Observation, tier: ScanTierId): ReportSection {
  const included = tierAtLeast(tier, "standard");
  if (!included) {
    return locked("surface", "Public surface inventory", "standard", "Status, title, forms, and security.txt are included from Standard upward.");
  }
  if (!observation.homepage.ok) {
    return {
      id: "surface",
      title: "Public surface inventory",
      minimumTier: "standard",
      included: true,
      narrative: "The homepage was not fetched, so the page inventory is pending.",
      findings: [pending("surface-home", "Page inventory", observation.homepage.error)],
    };
  }
  const html = observation.homepage.body;
  const title = extractTitle(html);
  const forms = countForms(html);
  const findings: Finding[] = [
    {
      id: "surface-status",
      title: "Homepage status",
      status: observation.homepage.status >= 200 && observation.homepage.status < 400 ? "info" : "fail",
      severity: observation.homepage.status >= 500 ? "medium" : "info",
      summary: `The homepage responded with HTTP ${observation.homepage.status}.`,
      evidence: clip(observation.homepage.finalUrl),
    },
    {
      id: "surface-title",
      title: "Page title",
      status: "info",
      severity: "info",
      summary: title ? "A title element was present." : "No title element was found in the fetched HTML.",
      evidence: title ? clip(title) : undefined,
    },
    {
      id: "surface-forms",
      title: "Forms on the fetched page",
      status: "info",
      severity: "info",
      summary: forms === 0 ? "No form elements were seen in the fetched HTML." : `${forms} form element${forms === 1 ? "" : "s"} were seen.`,
      evidence: hasPasswordField(html) ? "A password field is present on the fetched page." : undefined,
    },
  ];
  findings.push(auxFinding(observation.securityTxt, "security-txt", "security.txt", "Publish a contact in /.well-known/security.txt so researchers know how to reach you."));
  return {
    id: "surface",
    title: "Public surface inventory",
    minimumTier: "standard",
    included: true,
    narrative: "Taken from the single page that was fetched, plus security.txt on the same host.",
    findings,
  };
}

function aiSection(observation: Observation, tier: ScanTierId): ReportSection {
  const included = tierAtLeast(tier, "advanced");
  if (!included) {
    return locked(
      "ai-exposure",
      "AI and agent exposure",
      "advanced",
      "Script inventory, public AI-widget hints, redacted secret patterns, robots.txt, and sitemap are included from Advanced upward. No injection payload is ever sent.",
    );
  }
  if (!observation.homepage.ok) {
    return {
      id: "ai-exposure",
      title: "AI and agent exposure",
      minimumTier: "advanced",
      included: true,
      narrative: "The homepage HTML was not available, so these heuristics are pending.",
      findings: [pending("ai-home", "Public HTML heuristics", observation.homepage.error)],
    };
  }
  const html = observation.homepage.body;
  const scripts = extractScriptSrcs(html);
  const hosts = thirdPartyHosts(scripts, observation.host);
  const hints = promptSurfaceHints(html, scripts);
  const secrets = findSecretHits(html);
  const findings: Finding[] = [
    {
      id: "ai-scripts",
      title: "Third-party script hosts",
      status: "info",
      severity: "info",
      summary: hosts.length
        ? `${hosts.length} third-party script host${hosts.length === 1 ? "" : "s"} appeared on the fetched page.`
        : "No third-party script hosts were found on the fetched page.",
      evidence: hosts.length ? clip(hosts.join(", ")) : undefined,
      remediation: "Know which outside scripts can run in your visitors' browsers. A chat widget is part of your attack surface.",
    },
  ];
  if (hints.length === 0) {
    findings.push({
      id: "ai-surface",
      title: "Public AI or chat surface",
      status: "info",
      severity: "info",
      summary: "No chat-widget host, prompt field, or LLM endpoint path was obvious in the fetched HTML. This is a heuristic, not a test.",
    });
  } else {
    findings.push({
      id: "ai-surface",
      title: "Public AI or chat surface",
      status: "info",
      severity: "low",
      summary: "The public page looks like it exposes a chat, prompt, or AI widget. This scan did not send a prompt or an injection payload.",
      evidence: clip(hints.map((hint) => hint.label).join(" ")),
      remediation: "Treat that widget as untrusted input into whatever agent sits behind it. A human Scoped Assessment can review tool permissions and sandbox boundaries with written authorization.",
    });
  }
  if (secrets.length === 0) {
    findings.push({
      id: "ai-secrets",
      title: "Secret-shaped strings in public HTML",
      status: "pass",
      severity: "info",
      summary: "No AWS key, private-key block, live Stripe secret, GitHub token, Slack token, OpenAI/Anthropic/Google AI key, or assigned secret pattern was found in the fetched HTML.",
    });
  } else {
    for (const hit of secrets) {
      findings.push({
        id: `ai-secret-${hit.kind}`,
        title: `Possible ${hit.kind} in public HTML`,
        status: "fail",
        severity: secretSeverity(hit.kind),
        summary: "A secret-shaped string was visible in HTML this scan was already fetching. The value is redacted here. Rotate it if it is real.",
        evidence: hit.redacted,
        remediation: "Remove the value from the page, rotate the credential, and keep secrets on the server.",
      });
    }
  }
  findings.push(robotsFinding(observation.robots));
  findings.push(sitemapFinding(observation.sitemap));
  return {
    id: "ai-exposure",
    title: "AI and agent exposure",
    minimumTier: "advanced",
    included: true,
    narrative: "Heuristics on the public HTML and on robots.txt and sitemap.xml for this host. No payload is sent to the application or to a model.",
    findings,
  };
}

function manualSection(tier: ScanTierId): ReportSection {
  const included = tierAtLeast(tier, "full");
  const items: { id: string; title: string; summary: string }[] = [
    { id: "manual-authn", title: "Authenticated application testing", summary: "Logged-in flows, session handling, and authorization boundaries." },
    { id: "manual-prompt", title: "Live prompt-injection exercises", summary: "Sending prompts to an agent you operate, inside a written scope." },
    { id: "manual-ports", title: "Port and service discovery", summary: "Anything beyond the single http or https URL and the TLS handshake on port 443." },
    { id: "manual-cloud", title: "Cloud and identity review", summary: "Accounts, metadata-service exposure from inside a VPC, and long-lived keys." },
    { id: "manual-retest", title: "Human retest", summary: "Confirming that a fix holds. The checklist in this report is a template, not a completed retest." },
  ];
  if (!included) {
    return locked("manual", "Work that stays manual", "full", "The Full report lists active and authenticated work and does not run it. Commission a Scoped Assessment when you want that done by a person.");
  }
  return {
    id: "manual",
    title: "Work that stays manual",
    minimumTier: "full",
    included: true,
    narrative: "These items require a signed scope. This scan did not run them, and it did not invent results for them.",
    findings: items.map((item) => ({
      id: item.id,
      title: item.title,
      status: "requires-engagement" as const,
      severity: "info" as const,
      summary: item.summary,
      remediation: "Ask for a human Scoped Assessment if this should be in scope. Nothing here runs automatically.",
    })),
  };
}

function planFrom(findings: Finding[]): PlanItem[] {
  return findings
    .filter((finding) => finding.status === "fail" && finding.remediation)
    .map((finding) => ({
      findingId: finding.id,
      severity: finding.severity,
      action: finding.remediation ?? "",
      owner: "Unassigned",
      verify: `Retest “${finding.title}” after the change and record the result.`,
    }));
}

function checklistFrom(findings: Finding[]): string[] {
  const lines = findings
    .filter((finding) => finding.status === "fail")
    .map((finding) => `Retest ${finding.id}: ${finding.title}.`);
  if (lines.length === 0) lines.push("No failed automated checks to retest. Keep the manual items for a Scoped Assessment if you commission one.");
  lines.push("Do not treat this checklist as a completed retest. A person confirms the fixes.");
  return lines;
}

function countFindings(findings: Finding[]): Report["counts"] {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0, pending: 0, requiresEngagement: 0, pass: 0 };
  for (const finding of findings) {
    switch (finding.status) {
      case "fail":
        bumpSeverity(counts, finding.severity);
        break;
      case "info":
        counts.info += 1;
        break;
      case "pass":
        counts.pass += 1;
        break;
      case "pending":
        counts.pending += 1;
        break;
      case "requires-engagement":
        counts.requiresEngagement += 1;
        break;
      case "not-in-tier":
        break;
      default: {
        const unexpected: never = finding.status;
        return unexpected;
      }
    }
  }
  return counts;
}

function bumpSeverity(counts: Report["counts"], severity: Severity): void {
  switch (severity) {
    case "critical":
      counts.critical += 1;
      break;
    case "high":
      counts.high += 1;
      break;
    case "medium":
      counts.medium += 1;
      break;
    case "low":
      counts.low += 1;
      break;
    case "info":
      counts.info += 1;
      break;
    default: {
      const unexpected: never = severity;
      void unexpected;
    }
  }
}

function locked(id: string, title: string, minimumTier: ScanTierId, narrative: string): ReportSection {
  return {
    id,
    title,
    minimumTier,
    included: false,
    narrative,
    findings: [
      {
        id: `${id}-locked`,
        title: "Not in this tier",
        status: "not-in-tier",
        severity: "info",
        summary: narrative,
      },
    ],
  };
}

function pending(id: string, title: string, summary: string): Finding {
  return { id, title, status: "pending", severity: "info", summary };
}

function headerPresent(headers: Record<string, string>, name: string, title: string, id: string, severity: Severity, remediation: string): Finding {
  const value = headers[name];
  if (!value) {
    return {
      id: `hdr-${id}`,
      title,
      status: "fail",
      severity,
      summary: `${title} was not set.`,
      remediation,
    };
  }
  return {
    id: `hdr-${id}`,
    title,
    status: "pass",
    severity: "info",
    summary: `${title} is set.`,
    evidence: clip(value),
  };
}

function nosniffFinding(headers: Record<string, string>): Finding {
  const value = headers["x-content-type-options"] ?? "";
  if (value.toLowerCase().includes("nosniff")) {
    return { id: "hdr-nosniff", title: "X-Content-Type-Options", status: "pass", severity: "info", summary: "nosniff is set.", evidence: clip(value) };
  }
  return {
    id: "hdr-nosniff",
    title: "X-Content-Type-Options",
    status: "fail",
    severity: "low",
    summary: "X-Content-Type-Options is missing nosniff.",
    remediation: "Set X-Content-Type-Options: nosniff.",
  };
}

function frameFinding(headers: Record<string, string>): Finding {
  const framed = Boolean(headers["x-frame-options"]) || /frame-ancestors/i.test(headers["content-security-policy"] ?? "");
  if (framed) {
    return { id: "hdr-frame", title: "Clickjacking control", status: "pass", severity: "info", summary: "X-Frame-Options or CSP frame-ancestors is present." };
  }
  return {
    id: "hdr-frame",
    title: "Clickjacking control",
    status: "fail",
    severity: "low",
    summary: "Neither X-Frame-Options nor CSP frame-ancestors was set.",
    remediation: "Set X-Frame-Options or a CSP frame-ancestors directive.",
  };
}

function spfFinding(issue: ReturnType<typeof interpretSpf>["issue"], record: string | null): Finding {
  switch (issue) {
    case "missing":
      return { id: "dns-spf", title: "SPF", status: "fail", severity: "low", summary: "No SPF record was published on the looked-up name.", remediation: "Publish one SPF TXT record that ends in -all or ~all." };
    case "multiple":
      return { id: "dns-spf", title: "SPF", status: "fail", severity: "medium", summary: "More than one SPF record was published. Receivers may treat that as a failure.", evidence: record ?? undefined, remediation: "Keep a single SPF TXT record." };
    case "pass-all":
      return { id: "dns-spf", title: "SPF", status: "fail", severity: "high", summary: "SPF ends in +all, which authorizes any sender.", evidence: record ?? undefined, remediation: "Replace +all with a finite list of senders and -all or ~all." };
    case "neutral":
      return { id: "dns-spf", title: "SPF", status: "fail", severity: "low", summary: "SPF ends in ?all, which does not say what to do with other senders.", evidence: record ?? undefined, remediation: "Prefer ~all or -all once you know your senders." };
    case "softfail":
      return { id: "dns-spf", title: "SPF", status: "info", severity: "info", summary: "SPF is published and ends in ~all.", evidence: record ?? undefined };
    case "ok":
      return { id: "dns-spf", title: "SPF", status: "pass", severity: "info", summary: "A single SPF record is published.", evidence: record ?? undefined };
    default: {
      const unexpected: never = issue;
      return pending("dns-spf", "SPF", String(unexpected));
    }
  }
}

function dmarcFinding(issue: ReturnType<typeof interpretDmarc>["issue"], record: string | null, mailHost: string): Finding {
  const where = `_dmarc.${mailHost}`;
  switch (issue) {
    case "missing":
      return { id: "dns-dmarc", title: "DMARC", status: "fail", severity: "low", summary: `No DMARC record was found at ${where}.`, remediation: "Publish a DMARC TXT record. p=none is a reasonable start while you watch reports." };
    case "none":
      return { id: "dns-dmarc", title: "DMARC", status: "info", severity: "info", summary: "DMARC is published with p=none, so it monitors and does not enforce.", evidence: record ?? undefined, remediation: "Move to quarantine or reject after legitimate mail aligns." };
    case "quarantine":
    case "reject":
      return { id: "dns-dmarc", title: "DMARC", status: "pass", severity: "info", summary: `DMARC is published with p=${issue}.`, evidence: record ?? undefined };
    case "other":
      return { id: "dns-dmarc", title: "DMARC", status: "info", severity: "info", summary: "A DMARC record was found without a recognized policy.", evidence: record ?? undefined, remediation: "Set p to none, quarantine, or reject." };
    default: {
      const unexpected: never = issue;
      return pending("dns-dmarc", "DMARC", String(unexpected));
    }
  }
}

function tlsExpiryFinding(days: number | null, validTo: string | null): Finding {
  if (days === null) {
    return pending("tls-expiry", "Certificate expiry", "The certificate did not include a readable end date.");
  }
  const evidence = validTo ? `Valid to ${validTo} (${days} days).` : `${days} days remaining.`;
  if (days < 0) {
    return { id: "tls-expiry", title: "Certificate expiry", status: "fail", severity: "critical", summary: "The certificate is expired.", evidence, remediation: "Renew the certificate and confirm the new chain is served." };
  }
  if (days < 14) {
    return { id: "tls-expiry", title: "Certificate expiry", status: "fail", severity: "high", summary: "The certificate expires within 14 days.", evidence, remediation: "Renew before the expiry date." };
  }
  if (days < 30) {
    return { id: "tls-expiry", title: "Certificate expiry", status: "fail", severity: "medium", summary: "The certificate expires within 30 days.", evidence, remediation: "Renew before the expiry date." };
  }
  return { id: "tls-expiry", title: "Certificate expiry", status: "pass", severity: "info", summary: "The certificate is not near expiry.", evidence };
}

function auxFinding(result: Observation["securityTxt"], id: string, title: string, remediation: string): Finding {
  switch (result.state) {
    case "skipped":
      return pending(id, title, result.reason);
    case "fail":
      return pending(id, title, result.error);
    case "ok":
      if (result.status === 200) {
        return { id, title, status: "pass", severity: "info", summary: `${title} responded with HTTP 200.`, evidence: clip(result.finalUrl) };
      }
      return {
        id,
        title,
        status: "info",
        severity: "info",
        summary: `${title} responded with HTTP ${result.status}.`,
        evidence: clip(result.finalUrl),
        remediation: result.status === 404 ? remediation : undefined,
      };
    default: {
      const unexpected: never = result;
      return pending(id, title, String(unexpected));
    }
  }
}

function robotsFinding(result: Observation["robots"]): Finding {
  if (result.state === "skipped") return pending("robots", "robots.txt", result.reason);
  if (result.state === "fail") return pending("robots", "robots.txt", result.error);
  const disallow = robotsDisallowAll(result.body);
  return {
    id: "robots",
    title: "robots.txt",
    status: "info",
    severity: "info",
    summary: result.status === 200
      ? disallow
        ? "robots.txt is present and appears to disallow the whole site for the wildcard user agent."
        : "robots.txt is present."
      : `robots.txt responded with HTTP ${result.status}.`,
    evidence: clip(result.finalUrl),
  };
}

function sitemapFinding(result: Observation["sitemap"]): Finding {
  if (result.state === "skipped") return pending("sitemap", "Sitemap", result.reason);
  if (result.state === "fail") return pending("sitemap", "Sitemap", result.error);
  const count = countSitemapLocs(result.body);
  return {
    id: "sitemap",
    title: "Sitemap",
    status: "info",
    severity: "info",
    summary: result.status === 200
      ? `Sitemap responded with HTTP 200 and about ${count} location entr${count === 1 ? "y" : "ies"} in the fetched body${result.truncated ? " (truncated)" : ""}.`
      : `Sitemap responded with HTTP ${result.status}.`,
    evidence: clip(result.finalUrl),
  };
}

function secretSeverity(kind: string): Severity {
  switch (kind) {
    case "private-key-block":
    case "aws-access-key":
      return "critical";
    case "assigned-secret":
      return "medium";
    default:
      return "high";
  }
}

function clip(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 280);
}

export function isReport(value: unknown): value is Report {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<Report>;
  return report.engine?.mode === ENGINE_MODE && typeof report.id === "string" && Array.isArray(report.sections);
}

export function statusLabel(status: CheckStatus): string {
  switch (status) {
    case "pass":
      return "Pass";
    case "fail":
      return "Finding";
    case "info":
      return "Info";
    case "pending":
      return "Pending";
    case "requires-engagement":
      return "Requires engagement";
    case "not-in-tier":
      return "Not in this tier";
    default: {
      const unexpected: never = status;
      return unexpected;
    }
  }
}

export function severityLabel(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    case "info":
      return "Info";
    default: {
      const unexpected: never = severity;
      return unexpected;
    }
  }
}
