import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  BRAND_NAME,
  BRAND_FORMER_NAME,
  BRAND_INTENDED_DOMAIN,
  BRAND_PARENT,
  BRAND_REPO,
  BRAND_TAGLINE,
  BRAND_WORD,
  BRAND_SUFFIX,
  SITE_URL,
  TRUE_BADGES,
} from "../brand";
const tokens = JSON.parse(readFileSync(new URL("../tokens.json", import.meta.url), "utf8"));
import { scanTiers, SCAN_TIER_ORDER, tierAtLeast, AUTHORIZATION_STATEMENT, type ScanTierId } from "../scanTiers";
import { tiers, type TierId } from "../tiers";
import { isBlockedIp, isBlockedHostname, parsePublicUrl } from "./ssrf";
import { cleanCompanyName, parseScanRequest } from "./request";
import { findSecretHits, headerScore, summarizeSetCookie } from "./parse";
import { buildReport } from "./report";
import { newReportToken, verifyReportToken, saveReport, getReport } from "./store";
import { allowScan, clientKey } from "./limit";
import type { Observation, Report } from "./types";
import { POST } from "../../app/api/scan/route";
import { GET } from "../../app/api/scan/[id]/route";
import robots from "../../app/robots";
import sitemap from "../../app/sitemap";
import { posts } from "../posts";
import { incidents } from "../incidents";
import { findings } from "../caseStudies";
import { S } from "../sources";
import { observeDns, observeCt } from "./observe";
import nextConfig from "../../next.config.mjs";

describe("Smoke: Brand consistency and invariants", () => {
  it("exports official brand identity constants", () => {
    assert.equal(BRAND_NAME, "Seraphim Scan AI");
    assert.equal(BRAND_FORMER_NAME, "Seraphim AI");
    assert.equal(BRAND_INTENDED_DOMAIN, "seraphimscanai.com");
    assert.equal(BRAND_PARENT, "Ascend Maui");
    assert.equal(BRAND_REPO, "sentinel-ai");
    assert.equal(BRAND_TAGLINE, "Passive scans and reports for rogue-AI exposure");
    assert.equal(BRAND_WORD, "Seraphim Scan");
    assert.equal(BRAND_SUFFIX, "AI");
    assert.ok(SITE_URL.startsWith("http"));
  });

  it("ensures tokens.json aligns with brand name", () => {
    assert.equal(tokens.name, "Seraphim Scan AI");
    assert.ok(tokens.themes.dark.color.bg);
    assert.ok(tokens.themes.light.color.bg);
    assert.ok(tokens.themes["high-contrast"].color.bg);
  });

  it("verifies honest trust badges without unverified certifications", () => {
    assert.equal(TRUE_BADGES.length, 5);
    const keys = TRUE_BADGES.map((b) => b.key);
    assert.deepEqual(keys, ["passive", "auth", "honest", "human", "local"]);
    for (const badge of TRUE_BADGES) {
      assert.ok(badge.label.length > 0);
      assert.ok(badge.note.length > 0);
      // Confirm no fake certifications or SOC claims
      assert.doesNotMatch(badge.label, /SOC\s*2|ISO|certified/i);
    }
  });
});

describe("Smoke: Tier models and hierarchy", () => {
  it("maintains 4 scan tiers with correct ordering", () => {
    assert.equal(scanTiers.length, 4);
    const ids: ScanTierId[] = ["basic", "standard", "advanced", "full"];
    assert.deepEqual(scanTiers.map((t) => t.id), ids);
    assert.deepEqual(SCAN_TIER_ORDER, ids);

    // tierAtLeast ordering
    assert.equal(tierAtLeast("full", "basic"), true);
    assert.equal(tierAtLeast("full", "standard"), true);
    assert.equal(tierAtLeast("full", "advanced"), true);
    assert.equal(tierAtLeast("full", "full"), true);

    assert.equal(tierAtLeast("advanced", "full"), false);
    assert.equal(tierAtLeast("advanced", "standard"), true);

    assert.equal(tierAtLeast("basic", "standard"), false);
  });

  it("maintains 4 human assessment tiers without fabricated prices", () => {
    assert.equal(tiers.length, 4);
    const humanIds: TierId[] = ["seraphim", "cherubim", "thrones", "angels"];
    assert.deepEqual(tiers.map((t) => t.id), humanIds);

    for (const tier of tiers) {
      assert.ok(tier.name);
      assert.ok(tier.tagline);
      assert.ok(tier.positioning);
      // Honesty rule: human tiers do not list invented dollar prices
      assert.doesNotMatch(tier.positioning, /\$\d+/);
      assert.doesNotMatch(tier.tagline, /\$\d+/);
    }
  });
});

describe("Smoke: SSRF boundary defense", () => {
  it("blocks dangerous IPv4 destinations", () => {
    const dangerous = [
      "127.0.0.1",
      "127.0.0.2",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254", // Cloud metadata
      "192.88.99.1",    // Anycast 6to4 relay
      "224.0.0.1",      // Multicast
      "255.255.255.255",// Broadcast
      "0.0.0.0",
      "100.64.0.1",     // CGNAT
    ];
    for (const ip of dangerous) {
      assert.equal(isBlockedIp(ip), true, `Expected ${ip} to be blocked`);
    }
  });

  it("blocks dangerous IPv6 destinations", () => {
    const dangerous = [
      "::1",
      "fe80::1",
      "fd00::1",
      "2001:db8::1",
      "2001:2::1",
      "2001:10::1",
      "2001:20::1",
      "2002:7f00:1::",
      "::ffff:127.0.0.1",
    ];
    for (const ip of dangerous) {
      assert.equal(isBlockedIp(ip), true, `Expected ${ip} to be blocked`);
    }
  });

  it("permits public IPv4 and IPv6 destinations", () => {
    const safe = ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2001:4860:4860::8888"];
    for (const ip of safe) {
      assert.equal(isBlockedIp(ip), false, `Expected ${ip} to be allowed`);
    }
  });

  it("rejects non-standard ports and credentials", () => {
    assert.equal(parsePublicUrl("http://example.com:8080").ok, false);
    assert.equal(parsePublicUrl("http://example.com:22").ok, false);
    assert.equal(parsePublicUrl("http://admin:secret@example.com").ok, false);
    assert.equal(parsePublicUrl("ftp://example.com").ok, false);
    assert.equal(parsePublicUrl("javascript:alert(1)").ok, false);
  });

  it("rejects special-use domain names and cloud metadata hosts", () => {
    const specialHosts = [
      "localhost",
      "test.localhost",
      "staging.local",
      "cluster.internal",
      "server.localdomain",
      "site.invalid",
      "demo.test",
      "hidden.onion",
      "router.home.arpa",
      "mesh.lan",
      "corp.home",
      "instance-data",
      "instance-data.ec2.internal",
      "docker.internal",
      "host.docker.internal",
      "gateway.docker.internal",
      "kubernetes.default.svc.cluster.local",
      "app.cluster.local",
      "api.svc",
      "service.alt",
      "isolated.example",
      "127.0.0.1.nip.io",
      "service.sslip.io",
      "localtest.me",
      "sub.localtest.me",
      "app.lvh.me",
      "tenant.vcap.me",
      "metadata.google.internal",
      "metadata.goog",
    ];
    for (const host of specialHosts) {
      assert.equal(isBlockedHostname(host), true, `Expected ${host} to be blocked`);
      assert.equal(parsePublicUrl(`https://${host}`).ok, false, `Expected URL for ${host} to be rejected`);
    }
  });
});

describe("Smoke: Evidence redaction, sanitization, and security scoring", () => {
  it("redacts secret-shaped API keys in evidence strings", () => {
    const htmlWithKey = `<html><body>Welcome to app <script>const key = 'AKIAIOSFODNN7EXAMPLE';</script></body></html>`;
    const hits = findSecretHits(htmlWithKey);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, "aws-access-key");
    assert.match(hits[0].redacted, /\[redacted\]/);
    assert.doesNotMatch(hits[0].redacted, /AKIAIOSFODNN7EXAMPLE/);
  });

  it("redacts OpenAI, Anthropic, and Google Gemini API keys in evidence strings", () => {
    const oaiKey = "sk-proj-9876543210abcdefghijklmnop";
    const anthKey = "sk-ant-api03-1234567890abcdefghijklmnopqr";
    const googKey = "AIzaSyD-1234567890abcdefghijklmnopqrst";
    const hfToken = "hf_0123456789abcdefghijklmnopqrstuvwx";
    const sgKey = "SG.1234567890abcdefghijkl.1234567890abcdefghijklmnopqrstuvwxyz1234567";
    const pmakKey = ["PM", "AK-1234567890abcdef12345678-1234567890abcdef1234567890abcdef12"].join("");

    const oaiHits = findSecretHits(`<div>OpenAI: ${oaiKey}</div>`);
    assert.equal(oaiHits.length, 1);
    assert.equal(oaiHits[0].kind, "openai-api-key");
    assert.match(oaiHits[0].redacted, /\[redacted\]/);
    assert.doesNotMatch(oaiHits[0].redacted, new RegExp(oaiKey));

    const anthHits = findSecretHits(`<div>Anthropic: ${anthKey}</div>`);
    assert.equal(anthHits.length, 1);
    assert.equal(anthHits[0].kind, "anthropic-api-key");
    assert.match(anthHits[0].redacted, /\[redacted\]/);
    assert.doesNotMatch(anthHits[0].redacted, new RegExp(anthKey));

    const googHits = findSecretHits(`<div>Google: ${googKey}</div>`);
    assert.equal(googHits.length, 1);
    assert.equal(googHits[0].kind, "google-api-key");
    assert.match(googHits[0].redacted, /\[redacted\]/);
    assert.doesNotMatch(googHits[0].redacted, new RegExp(googKey));

    const hfHits = findSecretHits(`<div>HuggingFace: ${hfToken}</div>`);
    assert.equal(hfHits.length, 1);
    assert.equal(hfHits[0].kind, "huggingface-token");
    assert.match(hfHits[0].redacted, /\[redacted\]/);
    assert.doesNotMatch(hfHits[0].redacted, new RegExp(hfToken));

    const sgHits = findSecretHits(`<div>SendGrid: ${sgKey}</div>`);
    assert.equal(sgHits.length, 1);
    assert.equal(sgHits[0].kind, "sendgrid-api-key");
    assert.match(sgHits[0].redacted, /\[redacted\]/);
    assert.doesNotMatch(sgHits[0].redacted, new RegExp(sgKey));

    const pmakHits = findSecretHits(`<div>Postman: ${pmakKey}</div>`);
    assert.equal(pmakHits.length, 1);
    assert.equal(pmakHits[0].kind, "postman-api-key");
    assert.match(pmakHits[0].redacted, /\[redacted\]/);
    assert.doesNotMatch(pmakHits[0].redacted, new RegExp(pmakKey));
  });

  it("summarizes cookies without revealing session values", () => {
    const rawCookies = [
      "session_id=super_secret_token_12345; Path=/; Secure; HttpOnly; SameSite=Strict",
      "tracking=public_user_99; Path=/",
    ];
    const facts = summarizeSetCookie(rawCookies);
    assert.equal(facts.length, 2);
    assert.equal(facts[0].name, "session_id");
    assert.equal(facts[0].secure, true);
    assert.equal(facts[0].httpOnly, true);
    assert.equal(facts[0].sameSite, "strict");
    // Verify no secret value is preserved in fact structure
    assert.equal(JSON.stringify(facts).includes("super_secret_token_12345"), false);
  });

  it("sanitizes user-provided company names", () => {
    assert.equal(cleanCompanyName(null), null);
    assert.equal(cleanCompanyName(""), null);
    assert.equal(cleanCompanyName("   "), null);
    assert.equal(cleanCompanyName("Acme Corp\u0000\u001F"), "Acme Corp");
    assert.equal(cleanCompanyName("<script>Acme</script> Corp"), "scriptAcmescript Corp");
    const longName = "A".repeat(150);
    const cleanedLong = cleanCompanyName(longName);
    assert.ok(cleanedLong);
    assert.equal(cleanedLong.length, 120);
  });

  it("computes header scores within 0 to 100 boundary", () => {
    const emptyScore = headerScore({});
    assert.equal(emptyScore, 0);

    const fullHeaders = {
      "content-security-policy": "default-src 'self'",
      "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=()",
    };
    const perfectScore = headerScore(fullHeaders);
    assert.equal(perfectScore, 100);

    const partialHeaders = {
      "strict-transport-security": "max-age=31536000",
      "x-content-type-options": "nosniff",
    };
    const partialScore = headerScore(partialHeaders);
    assert.ok(partialScore > 0 && partialScore < 100);
  });
});

describe("Smoke: In-memory store and cryptographic tokens", () => {
  it("creates and verifies signed report tokens", () => {
    const token = newReportToken();
    assert.match(token, /^[A-Za-z0-9_-]+~[A-Za-z0-9_-]+$/);
    const verified = verifyReportToken(token);
    assert.ok(verified, "Token should verify successfully");

    // Tampered token must fail
    const tampered = token.slice(0, -2) + (token.endsWith("a") ? "b" : "a");
    assert.equal(verifyReportToken(tampered), null);
    assert.equal(verifyReportToken("invalid-token-no-tilde"), null);
    assert.equal(verifyReportToken("~empty-id"), null);
  });

  it("saves and retrieves reports with signed token", () => {
    const token = newReportToken();
    const mockReport: Report = {
      id: token,
      createdAt: new Date().toISOString(),
      engine: {
        mode: "passive-v1",
        note: "Seraphim Scan AI passive scan.",
      },
      tier: "basic",
      tierName: "Basic",
      className: "Angels",
      companyName: "Acme Corp",
      target: {
        input: "https://example.com/",
        finalUrl: "https://example.com/",
        host: "example.com",
      },
      authorization: {
        affirmed: true,
        affirmedAt: new Date().toISOString(),
        statement: "I affirm I am authorized",
      },
      counts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        pending: 0,
        requiresEngagement: 0,
        pass: 0,
      },
      headerScore: null,
      sections: [],
      remediationPlan: null,
      retestChecklist: null,
      limitations: [],
    };

    saveReport(mockReport);
    const retrieved = getReport(token);
    assert.ok(retrieved);
    assert.equal(retrieved.id, token);
    assert.equal(retrieved.companyName, "Acme Corp");

    // Unknown token returns null
    const unknownToken = newReportToken();
    assert.equal(getReport(unknownToken), null);
  });
});

describe("Smoke: Rate limiting", () => {
  it("extracts client key with fallback hierarchy", () => {
    const h1 = new Headers({ "x-forwarded-for": "203.0.113.195, 70.41.3.18" });
    assert.equal(clientKey(h1), "203.0.113.195");

    const h2 = new Headers({ "x-real-ip": "198.51.100.4" });
    assert.equal(clientKey(h2), "198.51.100.4");

    const h3 = new Headers();
    assert.equal(clientKey(h3), "local");
  });

  it("allows up to 6 scans in window and rejects the 7th", () => {
    const key = `test-rate-limit-${Date.now()}`;
    for (let i = 0; i < 6; i++) {
      assert.equal(allowScan(key), true, `Attempt ${i + 1} should be permitted`);
    }
    assert.equal(allowScan(key), false, "Attempt 7 should be rate limited");
  });
});

describe("Smoke: Scan API Route Handlers", () => {
  it("POST /api/scan rejects invalid JSON", async () => {
    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      body: "not-json{",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, "Send a JSON request.");
  });

  it("POST /api/scan rejects missing authorization", async () => {
    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      body: JSON.stringify({ targetUrl: "https://example.com", tier: "basic", authorization: false }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /authorized/i);
  });

  it("POST /api/scan rejects SSRF target (127.0.0.1)", async () => {
    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      body: JSON.stringify({ targetUrl: "http://127.0.0.1", tier: "basic", authorization: true }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /not allowed|private|loopback/i);
  });

  it("POST /api/scan rejects oversized body", async () => {
    const largeString = "a".repeat(8100);
    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      body: largeString,
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, "The request is too large.");
  });

  it("POST /api/scan rejects invalid scan tier", async () => {
    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      body: JSON.stringify({ targetUrl: "https://example.com", tier: "uber-mega-tier", authorization: true }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, "Choose a scan tier.");
  });

  it("POST /api/scan rejects non-string target URL", async () => {
    const req = new Request("http://localhost/api/scan", {
      method: "POST",
      body: JSON.stringify({ targetUrl: 12345, tier: "basic", authorization: true }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, "Enter a website URL.");
  });

  it("GET /api/scan/[id] returns 404 for invalid or unknown token", async () => {
    // Malformed token
    const res1 = await GET(new Request("http://localhost/api/scan/invalid"), {
      params: Promise.resolve({ id: "invalid-token" }),
    });
    assert.equal(res1.status, 404);

    // Validly signed token but not in store
    const token = newReportToken();
    const res2 = await GET(new Request(`http://localhost/api/scan/${token}`), {
      params: Promise.resolve({ id: token }),
    });
    assert.equal(res2.status, 404);
  });

  it("GET /api/scan/[id] returns 200 for stored report", async () => {
    const token = newReportToken();
    const mockReport: Report = {
      id: token,
      createdAt: new Date().toISOString(),
      engine: {
        mode: "passive-v1",
        note: "Seraphim Scan AI passive scan.",
      },
      tier: "standard",
      tierName: "Standard",
      className: "Thrones",
      companyName: "Test Co",
      target: {
        input: "https://example.com/",
        finalUrl: "https://example.com/",
        host: "example.com",
      },
      authorization: {
        affirmed: true,
        affirmedAt: new Date().toISOString(),
        statement: "I affirm I am authorized",
      },
      counts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        pending: 0,
        requiresEngagement: 0,
        pass: 0,
      },
      headerScore: 92,
      sections: [],
      remediationPlan: null,
      retestChecklist: null,
      limitations: [],
    };
    saveReport(mockReport);

    const res = await GET(new Request(`http://localhost/api/scan/${token}`), {
      params: Promise.resolve({ id: token }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.report);
    assert.equal(body.report.id, token);
    assert.equal(body.report.tier, "standard");
  });
});

function mockObservation(): Observation {
  return {
    requestedUrl: "https://example.com/",
    host: "example.com",
    homepage: {
      ok: true,
      status: 200,
      finalUrl: "https://example.com/",
      redirectHops: [],
      headers: {
        server: "ExampleServer",
        "strict-transport-security": "max-age=31536000",
        "x-content-type-options": "nosniff",
      },
      cookies: [{ name: "session_token", secure: true, httpOnly: true, sameSite: "strict" }],
      body: `<html><head><title>Smoke Example</title></head><body><script src="https://cdn.thirdparty.com/app.js"></script><p>AKIAIOSFODNN7EXAMPLE</p><form><input type="text" placeholder="Chat with AI" /></form></body></html>`,
      truncated: false,
      contentType: "text/html",
    },
    tls: {
      ok: true,
      protocol: "TLSv1.3",
      subject: "example.com",
      issuer: "Example CA",
      validTo: "2030-01-01T00:00:00.000Z",
      daysRemaining: 400,
      authorized: true,
      authorizationError: null,
    },
    dns: {
      ok: true,
      mailHost: "example.com",
      a: ["93.184.216.34"],
      aaaa: [],
      ns: ["ns.example.com"],
      mx: [],
      txt: ["v=spf1 +all"],
      dmarcTxt: [],
    },
    securityTxt: { state: "ok", status: 404, finalUrl: "https://example.com/.well-known/security.txt", body: "", truncated: false },
    robots: { state: "ok", status: 200, finalUrl: "https://example.com/robots.txt", body: "User-agent: *\nDisallow:\n", truncated: false },
    sitemap: { state: "ok", status: 200, finalUrl: "https://example.com/sitemap.xml", body: "<urlset><url><loc>https://example.com/</loc></url></urlset>", truncated: false },
    ct: { state: "pending", reason: "lookup skipped in smoke test" },
  };
}

describe("Smoke: Report engine and tier invariants", () => {
  it("builds Basic tier without header score, remediation plan, or page mining", () => {
    const report = buildReport({
      id: "smoke-basic-token",
      createdAt: new Date().toISOString(),
      tier: "basic",
      companyName: "Acme",
      affirmedAt: new Date().toISOString(),
      statement: AUTHORIZATION_STATEMENT,
      observation: mockObservation(),
    });

    assert.equal(report.tier, "basic");
    assert.equal(report.tierName, "Basic");
    assert.equal(report.className, "Angels");
    assert.equal(report.headerScore, null, "Basic tier must not compute a header score");
    assert.equal(report.remediationPlan, null, "Basic tier must not include a remediation plan");
    assert.equal(report.retestChecklist, null, "Basic tier must not include a retest checklist");

    // Surface section should not contain secret scan
    const surface = report.sections.find((s) => s.id === "surface");
    assert.ok(surface);
    assert.equal(surface.findings.some((f) => f.id.startsWith("ai-secret")), false);

    // AI and manual sections are locked in Basic tier
    const aiExposure = report.sections.find((s) => s.id === "ai-exposure");
    assert.ok(aiExposure);
    assert.equal(aiExposure.included, false);
    assert.equal(aiExposure.findings[0]?.status, "not-in-tier");

    const manual = report.sections.find((s) => s.id === "manual");
    assert.ok(manual);
    assert.equal(manual.included, false);
    assert.equal(manual.findings[0]?.status, "not-in-tier");
  });

  it("builds Standard tier with header score and cookie facts but no secret scan", () => {
    const report = buildReport({
      id: "smoke-standard-token",
      createdAt: new Date().toISOString(),
      tier: "standard",
      companyName: "Acme",
      affirmedAt: new Date().toISOString(),
      statement: AUTHORIZATION_STATEMENT,
      observation: mockObservation(),
    });

    assert.equal(report.tier, "standard");
    assert.equal(report.tierName, "Standard");
    assert.equal(report.className, "Thrones");
    assert.ok(typeof report.headerScore === "number");
    assert.equal(report.remediationPlan, null);
    assert.equal(report.retestChecklist, null);

    // Surface section is included in Standard tier
    const surface = report.sections.find((s) => s.id === "surface");
    assert.ok(surface);
    assert.equal(surface.included, true);

    // AI exposure is still locked in Standard
    const aiExposure = report.sections.find((s) => s.id === "ai-exposure");
    assert.ok(aiExposure);
    assert.equal(aiExposure.included, false);
  });

  it("builds Advanced tier with third-party hosts, AI hints, and redacted secrets", () => {
    const report = buildReport({
      id: "smoke-advanced-token",
      createdAt: new Date().toISOString(),
      tier: "advanced",
      companyName: "Acme",
      affirmedAt: new Date().toISOString(),
      statement: AUTHORIZATION_STATEMENT,
      observation: mockObservation(),
    });

    assert.equal(report.tier, "advanced");
    assert.equal(report.tierName, "Advanced");
    assert.equal(report.className, "Cherubim");
    assert.equal(report.remediationPlan, null);

    // AI exposure section is included and contains redacted secret finding
    const ai = report.sections.find((s) => s.id === "ai-exposure");
    assert.ok(ai);
    assert.equal(ai.included, true);

    const secretFinding = ai.findings.find((f) => f.id === "ai-secret-aws-access-key");
    assert.ok(secretFinding);
    assert.equal(secretFinding.status, "fail");
    assert.ok(secretFinding.evidence);
    assert.match(secretFinding.evidence, /\[redacted\]/);
    assert.doesNotMatch(secretFinding.evidence, /AKIAIOSFODNN7EXAMPLE/);

    // AI hints present
    const promptFinding = ai.findings.find((f) => f.id === "ai-surface");
    assert.ok(promptFinding);
  });

  it("builds Full tier with deterministic remediation plan and retest checklist", () => {
    const report = buildReport({
      id: "smoke-full-token",
      createdAt: new Date().toISOString(),
      tier: "full",
      companyName: "Acme",
      affirmedAt: new Date().toISOString(),
      statement: AUTHORIZATION_STATEMENT,
      observation: mockObservation(),
    });

    assert.equal(report.tier, "full");
    assert.equal(report.tierName, "Full");
    assert.equal(report.className, "Seraphim");
    assert.equal(report.engine.mode, "passive-v1");
    assert.equal(report.limitations.length, 6);

    // Full tier generates plan and checklist from failed checks (like SPF +all and secret hit)
    assert.ok(Array.isArray(report.remediationPlan));
    assert.ok(report.remediationPlan.length > 0);
    for (const item of report.remediationPlan) {
      assert.ok(item.findingId);
      assert.ok(item.action);
    }

    assert.ok(Array.isArray(report.retestChecklist));
    assert.ok(report.retestChecklist.length > 0);
    for (const item of report.retestChecklist) {
      assert.ok(typeof item === "string");
      assert.ok(item.length > 0);
    }

    // Manual section is never faked as executed
    assert.ok(report.counts.requiresEngagement > 0);
  });
});

describe("Smoke: Next.js Security Headers & Host Hardening", () => {
  it("enforces reactStrictMode and secure directory boundary", () => {
    assert.equal(nextConfig.reactStrictMode, true);
    assert.equal(nextConfig.poweredByHeader, false);
    assert.ok(nextConfig.outputFileTracingRoot);
  });

  it("exports comprehensive security headers for all routes", async () => {
    assert.ok(typeof nextConfig.headers === "function");
    const rules = await nextConfig.headers();
    assert.ok(Array.isArray(rules));
    const globalRule = rules.find((r: { source: string }) => r.source === "/:path*");
    assert.ok(globalRule);

    const headerKeys = (globalRule.headers as { key: string; value: string }[]).map((h) => h.key.toLowerCase());
    assert.ok(headerKeys.includes("x-content-type-options"));
    assert.ok(headerKeys.includes("x-frame-options"));
    assert.ok(headerKeys.includes("referrer-policy"));
    assert.ok(headerKeys.includes("permissions-policy"));
    assert.ok(headerKeys.includes("strict-transport-security"));
    assert.ok(headerKeys.includes("x-dns-prefetch-control"));
    assert.ok(headerKeys.includes("cross-origin-opener-policy"));
    assert.ok(headerKeys.includes("cross-origin-resource-policy"));
    assert.ok(headerKeys.includes("origin-agent-cluster"));
    assert.ok(headerKeys.includes("x-permitted-cross-domain-policies"));

    const nosniff = (globalRule.headers as { key: string; value: string }[]).find(
      (h) => h.key.toLowerCase() === "x-content-type-options"
    );
    assert.equal(nosniff?.value, "nosniff");

    const frame = (globalRule.headers as { key: string; value: string }[]).find(
      (h) => h.key.toLowerCase() === "x-frame-options"
    );
    assert.equal(frame?.value, "DENY");

    const coop = (globalRule.headers as { key: string; value: string }[]).find(
      (h) => h.key.toLowerCase() === "cross-origin-opener-policy"
    );
    assert.equal(coop?.value, "same-origin");

    const corp = (globalRule.headers as { key: string; value: string }[]).find(
      (h) => h.key.toLowerCase() === "cross-origin-resource-policy"
    );
    assert.equal(corp?.value, "same-origin");

    const oac = (globalRule.headers as { key: string; value: string }[]).find(
      (h) => h.key.toLowerCase() === "origin-agent-cluster"
    );
    assert.equal(oac?.value, "?1");

    const crossDomain = (globalRule.headers as { key: string; value: string }[]).find(
      (h) => h.key.toLowerCase() === "x-permitted-cross-domain-policies"
    );
    assert.equal(crossDomain?.value, "none");
  });
});

describe("Smoke: Search Engine and Crawler Perimeter (robots & sitemap)", () => {
  it("robots.txt allows public marketing while disallowing private report and API routes", () => {
    const r = robots();
    assert.ok(r.rules);
    const rulesArray = Array.isArray(r.rules) ? r.rules : [r.rules];
    assert.ok(rulesArray.length > 0);
    const starRule = rulesArray.find((item) => item.userAgent === "*");
    assert.ok(starRule);
    assert.equal(starRule.allow, "/");

    const disallow = Array.isArray(starRule.disallow) ? starRule.disallow : [starRule.disallow];
    assert.ok(disallow.includes("/api/"), "Disallow must contain /api/");
    assert.ok(disallow.includes("/report/"), "Disallow must contain /report/ to protect private reports");
    assert.ok(typeof r.sitemap === "string" && r.sitemap.endsWith("/sitemap.xml"));
  });

  it("sitemap.xml indexes canonical marketing routes and all published blog posts", () => {
    const s = sitemap();
    assert.ok(Array.isArray(s));
    assert.ok(s.length >= 10);

    const urls = s.map((entry) => entry.url);
    assert.ok(urls.some((u) => u.endsWith("/scan")));
    assert.ok(urls.some((u) => u.endsWith("/pricing")));
    assert.ok(urls.some((u) => u.endsWith("/blog")));
    assert.ok(urls.some((u) => u.endsWith("/case-studies")));
    assert.ok(urls.some((u) => u.endsWith("/incident-case-studies")));

    // Verifies all blog posts are mapped
    for (const post of posts) {
      assert.ok(urls.some((u) => u.endsWith(`/blog/${post.slug}`)), `Expected sitemap to include ${post.slug}`);
    }

    for (const entry of s) {
      assert.ok(entry.url.startsWith("http"));
      if (entry.priority !== undefined) {
        assert.ok(entry.priority >= 0 && entry.priority <= 1.0);
      }
    }
  });
});

describe("Smoke: DNS & Certificate Transparency Guard Invariants", () => {
  it("observeDns refuses blocked and local hostnames without opening queries", async () => {
    const blockedHosts = [
      "127.0.0.1",
      "localhost",
      "instance-data",
      "docker.internal",
      "kubernetes.default.svc",
      "localtest.me",
    ];
    for (const host of blockedHosts) {
      const res = await observeDns(host);
      assert.equal(res.ok, false);
      assert.match(res.error || "", /That (?:hostname|address) is not allowed\./);
    }
  });

  it("observeCt marks blocked or raw IP hostnames as pending without external network requests", async () => {
    const blockedHosts = ["127.0.0.1", "localhost", "docker.internal", "localtest.me"];
    for (const host of blockedHosts) {
      const res = await observeCt(host);
      assert.equal(res.state, "pending");
      assert.ok(res.reason);
    }
  });
});

describe("Smoke: Content, Incident, & Editorial Schema Invariants", () => {
  it("validates all published blog posts conform to editorial schema", () => {
    assert.ok(posts.length >= 4);
    const slugs = new Set<string>();
    for (const post of posts) {
      assert.ok(post.slug, "Post must have a slug");
      assert.ok(/^[a-z0-9-]+$/.test(post.slug), `Slug ${post.slug} must be URL-safe`);
      assert.equal(slugs.has(post.slug), false, `Duplicate slug ${post.slug}`);
      slugs.add(post.slug);

      assert.ok(post.title && post.title.trim().length > 0, `Post ${post.slug} missing title`);
      assert.ok(post.date && post.date.trim().length > 0, `Post ${post.slug} missing date`);
      assert.ok(post.description && post.description.trim().length > 0, `Post ${post.slug} missing description`);
      assert.ok(Array.isArray(post.body) && post.body.length > 0, `Post ${post.slug} body must contain blocks`);
      assert.ok(post.readMins > 0, `Post ${post.slug} readMins must be positive`);
      for (const s of post.sources) {
        assert.ok(S[s], `Post ${post.slug} references unknown source ${s}`);
      }
    }
  });

  it("validates all incident studies have unique IDs, structured timeline, and valid sources", () => {
    assert.ok(incidents.length > 0);
    const incidentIds = new Set<string>();
    for (const inc of incidents) {
      assert.ok(inc.id, "Incident must have an ID");
      assert.equal(incidentIds.has(inc.id), false, `Duplicate incident ID ${inc.id}`);
      incidentIds.add(inc.id);

      assert.ok(inc.title && inc.title.length > 0);
      assert.ok(inc.date && inc.date.length > 0);
      assert.ok(inc.kicker && inc.kicker.length > 0);
      assert.ok(inc.oneLine && inc.oneLine.length > 0);
      assert.ok(Array.isArray(inc.timeline) && inc.timeline.length > 0);
      assert.ok(Array.isArray(inc.vuln) && inc.vuln.length > 0);
      assert.ok(Array.isArray(inc.impact) && inc.impact.length > 0);
      assert.ok(inc.seraphim && inc.seraphim.limits);

      // Verify all cited sources exist in the canonical registry S
      for (const sourceKey of inc.sources) {
        assert.ok(S[sourceKey], `Incident ${inc.id} references unknown source ${sourceKey}`);
        assert.ok(S[sourceKey].url.startsWith("http"), `Source ${sourceKey} must have valid URL`);
      }
    }
  });

  it("validates all case studies have structured findings with truthful statuses", () => {
    assert.ok(findings.length > 0);
    const findingIds = new Set<string>();
    for (const finding of findings) {
      assert.ok(finding.id, "Finding must have an ID");
      assert.equal(findingIds.has(finding.id), false, `Duplicate finding ID ${finding.id}`);
      findingIds.add(finding.id);

      assert.ok(finding.title && finding.title.length > 0);
      assert.ok(["Critical", "High", "Medium", "Low", "Info"].includes(finding.severity));
      assert.ok(finding.rationale && finding.rationale.length > 0);
      assert.ok(finding.what && finding.what.length > 0);
      assert.ok(finding.before && finding.before.length > 0);
      assert.ok(finding.after && finding.after.length > 0);
      assert.ok(finding.fix && finding.fix.length > 0);
      assert.ok(finding.status && finding.status.length > 0);
    }
  });
});

describe("Smoke: Dotted-octal, hex, and numeric SSRF perimeter invariants", () => {
  it("rejects non-standard numeric and octal/hex hostnames across parsePublicUrl and isBlockedHostname", () => {
    const malicious = [
      "0177.0.0.1",
      "127.000.000.001",
      "127.1",
      "127.0.1",
      "0x7f000001",
      "0x7f.0.0.1",
      "2130706433",
      "192.52.193.1",
      "192.175.48.1",
      "0.0.0.0",
      "0000.0000.0000.0000",
    ];
    for (const host of malicious) {
      assert.equal(isBlockedHostname(host), true, `Hostname ${host} must be blocked`);
      const parsed = parsePublicUrl(`http://${host}`);
      assert.equal(parsed.ok, false, `URL http://${host} must be rejected`);
    }
  });

  it("permits standard public domain names containing digits without false positives", () => {
    const safeHosts = ["37signals.com", "cloudflare.com", "aws.amazon.com"];
    for (const host of safeHosts) {
      assert.equal(isBlockedHostname(host), false, `Safe host ${host} must not be blocked`);
    }
  });
});

describe("Smoke: Client key extraction and Cloudflare edge precedence", () => {
  it("prioritizes cf-connecting-ip over forwarded headers", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.195",
      "x-forwarded-for": "198.51.100.1, 10.0.0.1",
      "x-real-ip": "198.51.100.2",
    });
    assert.equal(clientKey(headers), "203.0.113.195");
  });

  it("extracts first client IP from comma-separated x-forwarded-for when cf header is absent", () => {
    const headers = new Headers({
      "x-forwarded-for": "  198.51.100.50 , 10.0.0.1, 172.16.0.2",
      "x-real-ip": "198.51.100.2",
    });
    assert.equal(clientKey(headers), "198.51.100.50");
  });

  it("falls back to x-real-ip then local", () => {
    const realIpHeaders = new Headers({
      "x-real-ip": "  198.51.100.77  ",
    });
    assert.equal(clientKey(realIpHeaders), "198.51.100.77");

    const emptyHeaders = new Headers();
    assert.equal(clientKey(emptyHeaders), "local");
  });
});

describe("Smoke: End-to-end evidence redaction in report engine", () => {
  it("redacts Hugging Face and Cloud API secrets from report findings and details", () => {
    const hfSecret = "hf_0123456789abcdefghijklmnopqrstuvwx";
    const sgSecret = "SG.1234567890abcdefghijkl.1234567890abcdefghijklmnopqrstuvwxyz1234567";
    const rawHtml = `<html><body><script>const HF = "${hfSecret}"; const SG = "${sgSecret}";</script></body></html>`;

    const observation: Observation = {
      requestedUrl: "https://example.com/",
      host: "example.com",
      dns: { ok: true, mailHost: "example.com", a: ["93.184.216.34"], aaaa: [], ns: [], mx: [], txt: [], dmarcTxt: [] },
      tls: { ok: true, protocol: "TLSv1.3", subject: "example.com", issuer: "DigiCert", validTo: "2027-01-01T00:00:00Z", daysRemaining: 100, authorized: true, authorizationError: null },
      homepage: {
        ok: true,
        status: 200,
        finalUrl: "https://example.com/",
        redirectHops: [],
        headers: { "content-type": "text/html" },
        cookies: [],
        body: rawHtml,
        truncated: false,
        contentType: "text/html",
      },
      robots: { state: "ok", status: 404, finalUrl: "https://example.com/robots.txt", body: "", truncated: false },
      sitemap: { state: "ok", status: 404, finalUrl: "https://example.com/sitemap.xml", body: "", truncated: false },
      securityTxt: { state: "ok", status: 404, finalUrl: "https://example.com/.well-known/security.txt", body: "", truncated: false },
      ct: { state: "pending", reason: "test fixture" },
    };

    const report = buildReport({
      id: "test-token~1234567890abcdefghij",
      createdAt: new Date().toISOString(),
      tier: "advanced",
      companyName: "Safe Corp",
      affirmedAt: new Date().toISOString(),
      statement: AUTHORIZATION_STATEMENT,
      observation,
    });

    const reportJson = JSON.stringify(report);
    assert.equal(reportJson.includes(hfSecret), false, "Raw Hugging Face secret must never leak into report");
    assert.equal(reportJson.includes(sgSecret), false, "Raw SendGrid secret must never leak into report");

    const aiSection = report.sections.find((s) => s.id === "ai-exposure");
    assert.ok(aiSection, "ai-exposure section must exist");
    const hfFinding = aiSection.findings.find((f) => f.id === "ai-secret-huggingface-token");
    assert.ok(hfFinding, "Hugging Face secret finding must exist");
    assert.equal(hfFinding.status, "fail");
    assert.ok(hfFinding.evidence?.includes("[redacted]"));

    const sgFinding = aiSection.findings.find((f) => f.id === "ai-secret-sendgrid-api-key");
    assert.ok(sgFinding, "SendGrid secret finding must exist");
    assert.equal(sgFinding.status, "fail");
    assert.ok(sgFinding.evidence?.includes("[redacted]"));
  });
});


