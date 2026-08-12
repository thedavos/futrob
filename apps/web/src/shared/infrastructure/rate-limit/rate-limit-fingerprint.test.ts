import { describe, expect, it } from "vite-plus/test";
import { fingerprintRateLimitSubject } from "./rate-limit-fingerprint.ts";

describe("fingerprintRateLimitSubject", () => {
  it("creates deterministic, purpose-separated HMAC-SHA-256 fingerprints", async () => {
    const actor = await fingerprintRateLimitSubject("dedicated-secret", "actor", "actor-123");
    const actorAgain = await fingerprintRateLimitSubject("dedicated-secret", "actor", "actor-123");
    const ip = await fingerprintRateLimitSubject("dedicated-secret", "ip", "actor-123");

    expect(actor).toBe(actorAgain);
    expect(actor).toMatch(/^[a-f0-9]{64}$/);
    expect(actor).not.toContain("actor-123");
    expect(ip).not.toBe(actor);
  });
});
