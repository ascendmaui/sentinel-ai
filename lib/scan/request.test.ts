import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseScanRequest } from "./request";

describe("parseScanRequest", () => {
  it("requires the authorization flag", () => {
    const parsed = parseScanRequest({ targetUrl: "https://example.com", tier: "basic", authorization: false });
    assert.equal(parsed.ok, false);
  });

  it("rejects a private target", () => {
    const parsed = parseScanRequest({ targetUrl: "http://127.0.0.1", tier: "full", authorization: true });
    assert.equal(parsed.ok, false);
  });

  it("accepts an authorized public URL", () => {
    const parsed = parseScanRequest({
      targetUrl: "example.com",
      tier: "advanced",
      authorization: true,
      companyName: " Northwind ",
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.targetUrl, "https://example.com/");
      assert.equal(parsed.value.companyName, "Northwind");
      assert.equal(parsed.value.tier, "advanced");
    }
  });
});
