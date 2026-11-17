import { describe, expect, it } from "vite-plus/test";
import {
  CLIENT_IP_HEADER,
  PROXY_SECRET_HEADER,
  resolveClientIp,
  withClientIp,
} from "./client-ip.ts";

const proxySecret = "a-shared-proxy-secret-with-32-characters";

describe("resolveClientIp", () => {
  it("trusts the forwarded IP only when the proxy secret matches", () => {
    const forwarded = new Headers({
      [PROXY_SECRET_HEADER]: proxySecret,
      [CLIENT_IP_HEADER]: "203.0.113.7",
    });
    expect(resolveClientIp(forwarded, "10.0.0.2", { proxySecret })).toBe("203.0.113.7");

    const forged = new Headers({
      [PROXY_SECRET_HEADER]: "wrong-secret",
      [CLIENT_IP_HEADER]: "203.0.113.7",
    });
    expect(resolveClientIp(forged, "198.51.100.1", { proxySecret })).toBe("198.51.100.1");
  });

  it("ignores a forwarded IP when no proxy secret is configured", () => {
    const headers = new Headers({
      [PROXY_SECRET_HEADER]: "",
      [CLIENT_IP_HEADER]: "203.0.113.7",
    });
    expect(resolveClientIp(headers, "198.51.100.1", {})).toBe("198.51.100.1");
  });

  it("takes the last hop of the load balancer header", () => {
    const headers = new Headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" });
    expect(resolveClientIp(headers, "10.0.0.2", { trustedHeader: "x-forwarded-for" })).toBe(
      "203.0.113.9",
    );
    expect(resolveClientIp(new Headers(), "10.0.0.2", { trustedHeader: "x-real-ip" })).toBe(
      undefined,
    );
  });

  it("rejects values that are not IP addresses", () => {
    const headers = new Headers({ "x-real-ip": "not-an-ip" });
    expect(resolveClientIp(headers, undefined, { trustedHeader: "x-real-ip" })).toBeUndefined();
  });
});

describe("withClientIp", () => {
  it("replaces caller-supplied client IP and drops the proxy secret", async () => {
    const request = new Request("http://localhost:8788/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        [PROXY_SECRET_HEADER]: proxySecret,
        [CLIENT_IP_HEADER]: "6.6.6.6",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "a@futrob.test" }),
    });
    const next = withClientIp(request, "203.0.113.7");
    expect(next.headers.get(CLIENT_IP_HEADER)).toBe("203.0.113.7");
    expect(next.headers.get(PROXY_SECRET_HEADER)).toBeNull();
    expect(await next.json()).toEqual({ email: "a@futrob.test" });

    const anonymous = withClientIp(new Request("http://localhost:8788/api/auth/ok"), undefined);
    expect(anonymous.headers.get(CLIENT_IP_HEADER)).toBeNull();
  });
});
