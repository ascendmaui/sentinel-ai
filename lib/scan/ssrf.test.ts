import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addressesAreAllowed, isBlockedIp, parsePublicUrl } from "./ssrf";

describe("isBlockedIp", () => {
  const blocked = [
    "127.0.0.1",
    "10.1.2.3",
    "192.168.1.20",
    "172.16.0.4",
    "172.31.255.255",
    "169.254.169.254",
    "0.0.0.0",
    "100.64.0.1",
    "192.88.99.1",
    "192.52.193.1",
    "192.175.48.1",
    "255.255.255.255",
    "224.0.0.1",
    "::1",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:0:127.0.0.1",
    "2001:db8::1",
    "2001:2::1",
    "2001:10::1",
    "2001:20::1",
    "2002:7f00:1::",
  ];
  for (const ip of blocked) {
    it(`blocks ${ip}`, () => {
      assert.equal(isBlockedIp(ip), true);
    });
  }

  const allowed = ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2001:4860:4860::8888"];
  for (const ip of allowed) {
    it(`allows ${ip}`, () => {
      assert.equal(isBlockedIp(ip), false);
    });
  }
});

describe("addressesAreAllowed", () => {
  it("rejects a mix of public and private answers", () => {
    assert.equal(addressesAreAllowed(["8.8.8.8", "10.0.0.1"]), false);
  });
  it("rejects an empty list", () => {
    assert.equal(addressesAreAllowed([]), false);
  });
  it("accepts public answers", () => {
    assert.equal(addressesAreAllowed(["1.1.1.1"]), true);
  });
});

describe("parsePublicUrl", () => {
  it("accepts a bare public host as https", () => {
    const parsed = parsePublicUrl("example.com");
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.target.url.toString(), "https://example.com/");
  });

  it("rejects loopback, metadata, credentials, and other ports", () => {
    for (const input of [
      "http://127.0.0.1",
      "http://localhost",
      "http://169.254.169.254",
      "http://metadata.google.internal",
      "https://user:pass@example.com",
      "https://example.com:22",
      "http://[::1]/",
      "file:///etc/passwd",
      "http://10.0.0.5/admin",
      "http://2130706433",
      "http://service.invalid",
      "http://staging.test",
      "http://hidden.onion",
      "http://router.home.arpa",
      "http://cluster.lan",
      "http://portal.corp",
      "http://storage.local",
      "http://api.internal",
      "http://test",
      "http://invalid",
      "http://instance-data",
      "http://instance-data.ec2.internal",
      "http://docker.internal",
      "http://host.docker.internal",
      "http://gateway.docker.internal",
      "http://kubernetes.default.svc.cluster.local",
      "http://app.cluster.local",
      "http://api.svc",
      "http://foo.alt",
      "http://bar.example",
      "http://127.0.0.1.nip.io",
      "http://app.sslip.io",
      "http://localtest.me",
      "http://sub.localtest.me",
      "http://foo.lvh.me",
      "http://bar.vcap.me",
      "http://0177.0.0.1",
      "http://127.000.000.001",
      "http://127.1",
      "http://127.0.1",
      "http://0x7f000001",
      "http://0x7f.0.0.1",
      "http://192.52.193.1",
      "http://192.175.48.1",
      "http://127.0.0.0x1",
      "http://test.oastify.com",
      "http://sub.oast.me",
      "http://probe.interact.sh",
      "http://app.traefik.me",
      "http://dns.myip.ninja",
      "http://box.furious.pro",
      "http://metadata.azure.com",
      "http://metadata.oraclecloud.com",
      "http://[::ffff:0:127.0.0.1]",
    ]) {
      const parsed = parsePublicUrl(input);
      assert.equal(parsed.ok, false, input);
    }
  });
});
