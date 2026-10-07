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

  it("redacts a Hugging Face user token", () => {
    const secret = "hf_abcdefghijklmnopqrstuvwxyz0123456789";
    const hits = findSecretHits(`<div>HuggingFace credential: ${secret}</div>`);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, "huggingface-token");
    assert.equal(hits[0].redacted.includes(secret), false);
    assert.match(hits[0].redacted, /\[redacted\]/);
  });

  it("redacts a SendGrid API key", () => {
    const secret = "SG.abcdefghijklmnopqrstuv.1234567890123456789012345678901234567890123";
    const hits = findSecretHits(`sendgrid_key="${secret}"`);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, "sendgrid-api-key");
    assert.equal(hits[0].redacted.includes(secret), false);
    assert.match(hits[0].redacted, /\[redacted\]/);
  });

  it("redacts a Postman API key", () => {
    const secret = ["PM", "AK-1234567890abcdef12345678-abcdef1234567890abcdef1234567890ab"].join("");
    const hits = findSecretHits(`{"postmanApiKey":"${secret}"}`);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, "postman-api-key");
    assert.equal(hits[0].redacted.includes(secret), false);
    assert.match(hits[0].redacted, /\[redacted\]/);
  });

  it("redacts a Cohere API key", () => {
    const secret = "co-1234567890abcdefghijklmnopqrstuv";
    const hits = findSecretHits(`cohere_api_key="${secret}"`);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, "cohere-api-key");
    assert.equal(hits[0].redacted.includes(secret), false);
    assert.match(hits[0].redacted, /\[redacted\]/);
  });

  it("redacts a Replicate API token", () => {
    const secret = "r8_1234567890abcdefghijklmnopqrstuvwx";
    const hits = findSecretHits(`REPLICATE_API_TOKEN=${secret}`);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, "replicate-api-token");
    assert.equal(hits[0].redacted.includes(secret), false);
    assert.match(hits[0].redacted, /\[redacted\]/);
  });

  it("redacts a Pinecone API key", () => {
    const secret = "pcsk_1234567890abcdefghijklmnopqrstuvwxyz1234567890";
    const hits = findSecretHits(`<div>Pinecone credential: ${secret}</div>`);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, "pinecone-api-key");
    assert.equal(hits[0].redacted.includes(secret), false);
    assert.match(hits[0].redacted, /\[redacted\]/);
  });

  it("redacts a GitLab personal access token", () => {
    const secret = "glpat-1234567890abcdefghij";
    const hits = findSecretHits(`GITLAB_TOKEN="${secret}"`);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, "gitlab-token");
    assert.equal(hits[0].redacted.includes(secret), false);
    assert.match(hits[0].redacted, /\[redacted\]/);
  });

  it("redacts an npm access token", () => {
    const secret = "npm_1234567890abcdefghijklmnopqrstuvwxyz";
    const hits = findSecretHits(`//registry.npmjs.org/:_authToken=${secret}`);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, "npm-token");
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
