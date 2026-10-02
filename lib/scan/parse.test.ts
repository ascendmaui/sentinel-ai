import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findSecretHits, headerScore, interpretDmarc, interpretSpf, summarizeSetCookie } from "./parse";

describe("summarizeSetCookie", () => {
  it("keeps flags and drops the value", () => {
    const facts = summarizeSetCookie(["session=supersecretvalue; HttpOnly; Secure; SameSite=Lax"]);
    assert.equal(facts.length, 1);
    assert.equal(facts[0].name, "session");
    assert.equal(facts[0].secure, true);
    assert.equal(facts[0].httpOnly, true);
    assert.equal(facts[0].sameSite, "lax");
    assert.equal(JSON.stringify(facts).includes("supersecretvalue"), false);
  });
});

describe("findSecretHits", () => {
  it("redacts an AWS-shaped key", () => {
    const secret = "AKIAIOSFODNN7EXAMPLE";
    const hits = findSecretHits(`<div>key ${secret} trailing</div>`);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, "aws-access-key");
    assert.equal(hits[0].redacted.includes(secret), false);
    assert.match(hits[0].redacted, /\[redacted\]/);
  });

  it("redacts an OpenAI-shaped project key", () => {
    const secret = "sk-proj-abc12345678901234567890";
    const hits = findSecretHits(`<div>OpenAI credential: ${secret}</div>`);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, "openai-api-key");
    assert.equal(hits[0].redacted.includes(secret), false);
    assert.match(hits[0].redacted, /\[redacted\]/);
  });

  it("redacts an Anthropic-shaped key", () => {
    const secret = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456";
    const hits = findSecretHits(`<script>var k = "${secret}";</script>`);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, "anthropic-api-key");
    assert.equal(hits[0].redacted.includes(secret), false);
    assert.match(hits[0].redacted, /\[redacted\]/);
  });

  it("redacts a Google Gemini-shaped key", () => {
    const secret = "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz0123456";
    const hits = findSecretHits(`https://generativelanguage.googleapis.com/v1beta/models?key=${secret}`);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, "google-api-key");
    assert.equal(hits[0].redacted.includes(secret), false);
    assert.match(hits[0].redacted, /\[redacted\]/);
  });
});

describe("mail records", () => {
  it("flags SPF +all", () => {
    assert.equal(interpretSpf(["v=spf1 +all"]).issue, "pass-all");
  });
  it("reads a DMARC policy", () => {
    assert.equal(interpretDmarc(["v=DMARC1; p=reject; rua=mailto:d@example.com"]).issue, "reject");
  });
});

describe("headerScore", () => {
  it("scores a full set at 100", () => {
    assert.equal(
      headerScore({
        "strict-transport-security": "max-age=31536000",
        "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
        "permissions-policy": "camera=()",
      }),
      100,
    );
  });
  it("scores an empty set at 0", () => {
    assert.equal(headerScore({}), 0);
  });
});
