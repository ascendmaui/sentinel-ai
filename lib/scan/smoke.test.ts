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
import { scanTiers, SCAN_TIER_ORDER, tierAtLeast, type ScanTierId } from "../scanTiers";
import { tiers, type TierId } from "../tiers";
import { isBlockedIp, parsePublicUrl } from "./ssrf";
import { parseScanRequest } from "./request";
import { newReportToken, verifyReportToken, saveReport, getReport } from "./store";
import { allowScan, clientKey } from "./limit";
import type { Report } from "./types";
import { POST } from "../../app/api/scan/route";
import { GET } from "../../app/api/scan/[id]/route";

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
      tier: "basic",
      companyName: "Acme Corp",
      targetUrl: "https://example.com/",
      summary: {
        score: 85,
        risk: "Low",
        headline: "Clean passive public perimeter",
      },
      sections: [],
      rawObservation: {} as unknown as Report["rawObservation"],
      statement: "I affirm I am authorized",
      affirmedAt: new Date().toISOString(),
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
      tier: "standard",
      companyName: "Test Co",
      targetUrl: "https://example.com/",
      summary: {
        score: 92,
        risk: "Low",
        headline: "Good posture",
      },
      sections: [],
      rawObservation: {} as unknown as Report["rawObservation"],
      statement: "I affirm I am authorized",
      affirmedAt: new Date().toISOString(),
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
