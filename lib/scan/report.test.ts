import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUTHORIZATION_STATEMENT } from "../scanTiers";
import { buildReport } from "./report";
import type { Observation } from "./types";

const secret = "AKIAIOSFODNN7EXAMPLE";

function observation(): Observation {
  return {
    requestedUrl: "https://example.com/",
    host: "example.com",
    homepage: {
      ok: true,
      status: 200,
      finalUrl: "https://example.com/",
      redirectHops: [],
      headers: { server: "Example" },
      cookies: [{ name: "session", secure: false, httpOnly: false, sameSite: null }],
      body: `<html><head><title>Example</title></head><body><script src="https://cdn.example.net/app.js"></script><p>${secret}</p></body></html>`,
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
    ct: { state: "pending", reason: "lookup skipped in this fixture" },
  };
}

function reportFor(tier: "basic" | "standard" | "advanced" | "full") {
  return buildReport({
    id: "test-report",
    createdAt: "2026-10-01T00:00:00.000Z",
    tier,
    companyName: "Example",
    affirmedAt: "2026-10-01T00:00:00.000Z",
    statement: AUTHORIZATION_STATEMENT,
    observation: observation(),
  });
}

describe("buildReport", () => {
  it("keeps AI-exposure and manual work out of Basic", () => {
    const report = reportFor("basic");
    const ai = report.sections.find((section) => section.id === "ai-exposure");
    const manual = report.sections.find((section) => section.id === "manual");
    assert.equal(ai?.included, false);
    assert.equal(manual?.included, false);
    assert.equal(report.remediationPlan, null);
    assert.equal(JSON.stringify(report).includes(secret), false);
  });

  it("marks active work as requiring engagement on Full and redacts secrets", () => {
    const report = reportFor("full");
    const manual = report.sections.find((section) => section.id === "manual");
    assert.ok(manual?.findings.every((finding) => finding.status === "requires-engagement"));
    assert.ok(report.remediationPlan && report.remediationPlan.length > 0);
    assert.ok(report.retestChecklist && report.retestChecklist.length > 0);
    const serialized = JSON.stringify(report);
    assert.equal(serialized.includes(secret), false);
    assert.match(serialized, /\[redacted\]/);
    assert.equal(serialized.includes("supersecret"), false);
  });

  it("does not put the cookie value in a Standard report", () => {
    const report = reportFor("standard");
    const headers = report.sections.find((section) => section.id === "headers");
    const cookie = headers?.findings.find((finding) => finding.id.startsWith("cookie-"));
    assert.ok(cookie);
    assert.equal(JSON.stringify(cookie).includes("supersecretvalue"), false);
    assert.equal(report.headerScore !== null, true);
  });

  it("flags SPF +all", () => {
    const report = reportFor("basic");
    const spf = report.sections.flatMap((section) => section.findings).find((finding) => finding.id === "dns-spf");
    assert.equal(spf?.status, "fail");
    assert.equal(spf?.severity, "high");
  });
});
