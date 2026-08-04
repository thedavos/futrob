import { describe, expect, it } from "vite-plus/test";
import { isSafeAppRedirect, resolveSafeRedirect } from "./safe-redirect.ts";

describe("safe app redirect", () => {
  it("allows invitation deep links and other app paths", () => {
    expect(isSafeAppRedirect("/invitations/accept/plainToken")).toBe(true);
    expect(isSafeAppRedirect("/orgs/abc")).toBe(true);
    expect(resolveSafeRedirect("/invitations/accept/x")).toBe("/invitations/accept/x");
  });

  it("rejects open redirects and auth/api loops", () => {
    expect(isSafeAppRedirect("https://evil.test/x")).toBe(false);
    expect(isSafeAppRedirect("//evil.test")).toBe(false);
    expect(isSafeAppRedirect("/api/v1/meta/ping")).toBe(false);
    expect(isSafeAppRedirect("/login")).toBe(false);
    expect(resolveSafeRedirect("//evil")).toBeNull();
  });
});
