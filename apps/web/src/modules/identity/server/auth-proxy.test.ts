import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  buildAuthProxyHeaders,
  buildAuthProxyTarget,
  forwardAuthRequest,
  isAuthApiPath,
  proxyAuthRequest,
  type AuthServiceBinding,
} from "./auth-proxy.ts";

describe("auth proxy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("only builds targets under /api/auth", () => {
    expect(isAuthApiPath("/api/auth")).toBe(true);
    expect(isAuthApiPath("/api/auth/sign-in/email")).toBe(true);
    expect(isAuthApiPath("/api/v1/identity/onboarding")).toBe(false);
    expect(
      buildAuthProxyTarget(new URL("http://localhost:3000/api/auth/sign-in/email?next=1")),
    ).toBe("https://futrob-auth.internal/api/auth/sign-in/email?next=1");
    expect(
      buildAuthProxyTarget(new URL("http://localhost:3000/api/v1/players/me")),
    ).toBeUndefined();
  });

  it("strips spoofable proxy headers and preserves Cloudflare's client IP", () => {
    const incoming = new URL("https://futrob.app/api/auth/sign-in/email");
    const request = new Request(incoming, {
      method: "POST",
      headers: {
        cookie: "better-auth.session_token=abc",
        authorization: "Bearer tok",
        host: "futrob.app",
        connection: "keep-alive",
        "cf-connecting-ip": "1.2.3.4",
        "x-forwarded-for": "6.6.6.6",
        "x-real-ip": "6.6.6.6",
      },
    });

    const headers = buildAuthProxyHeaders(request, incoming);
    expect(headers.get("cookie")).toBe("better-auth.session_token=abc");
    expect(headers.get("authorization")).toBe("Bearer tok");
    expect(headers.get("host")).toBeNull();
    expect(headers.get("connection")).toBeNull();
    expect(headers.get("cf-connecting-ip")).toBe("1.2.3.4");
    expect(headers.get("x-forwarded-for")).toBeNull();
    expect(headers.get("x-real-ip")).toBe("1.2.3.4");
    expect(headers.get("x-forwarded-host")).toBe("futrob.app");
    expect(headers.get("x-forwarded-proto")).toBe("https");
  });

  it("does not forward a client-supplied x-real-ip when Cloudflare omitted the client IP", () => {
    const incoming = new URL("https://futrob.app/api/auth/sign-in/email");
    const headers = buildAuthProxyHeaders(
      new Request(incoming, {
        headers: {
          "x-real-ip": "6.6.6.6",
          "x-forwarded-for": "6.6.6.6",
        },
      }),
      incoming,
    );

    expect(headers.get("cf-connecting-ip")).toBeNull();
    expect(headers.get("x-real-ip")).toBeNull();
    expect(headers.get("x-forwarded-for")).toBeNull();
  });

  it("strips hop-by-hop headers from the upstream response", async () => {
    const authService: AuthServiceBinding = {
      fetch: vi.fn(
        async () =>
          new Response("ok", {
            status: 200,
            headers: {
              "set-cookie": "better-auth.session_token=abc; Path=/",
              connection: "keep-alive",
              "transfer-encoding": "chunked",
              "cf-ray": "abc",
            },
          }),
      ),
    };

    const response = await proxyAuthRequest(
      new Request("http://localhost:3000/api/auth/get-session"),
      authService,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("better-auth.session_token=abc");
    expect(response.headers.get("connection")).toBeNull();
    expect(response.headers.get("transfer-encoding")).toBeNull();
    expect(response.headers.get("cf-ray")).toBeNull();
  });

  it("forwards path, query, and a buffered body through the service binding", async () => {
    const fetchMock = vi.fn<AuthServiceBinding["fetch"]>(
      async () => new Response("ok", { status: 200 }),
    );
    const authService: AuthServiceBinding = { fetch: fetchMock };

    await proxyAuthRequest(
      new Request("http://localhost:3000/api/auth/sign-in/email?next=1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "1.2.3.4",
        },
        body: JSON.stringify({ email: "a@b.co" }),
      }),
      authService,
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const proxiedRequest = fetchMock.mock.calls[0]?.[0];
    expect(proxiedRequest?.url).toBe("https://futrob-auth.internal/api/auth/sign-in/email?next=1");
    expect(proxiedRequest?.method).toBe("POST");
    expect(proxiedRequest?.redirect).toBe("manual");
    expect(proxiedRequest?.body).toBeDefined();
    expect(proxiedRequest?.headers.get("cf-connecting-ip")).toBe("1.2.3.4");
    expect(proxiedRequest?.headers.get("x-real-ip")).toBe("1.2.3.4");
  });

  it("returns 404 when the inbound path is outside /api/auth", async () => {
    const fetchMock = vi.fn<AuthServiceBinding["fetch"]>();
    const response = await proxyAuthRequest(
      new Request("http://localhost:3000/api/v1/players/me"),
      { fetch: fetchMock },
    );

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the service binding is missing", async () => {
    const response = await forwardAuthRequest(
      new Request("http://localhost:3000/api/auth/get-session"),
      undefined,
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      code: "auth.misconfigured",
      messageKey: "errors.auth.misconfigured",
    });
  });

  it("returns 502 when the service binding throws", async () => {
    const response = await forwardAuthRequest(
      new Request("http://localhost:3000/api/auth/get-session"),
      {
        fetch: vi.fn(async () => {
          throw new Error("upstream down");
        }),
      },
    );
    expect(response.status).toBe(502);
  });

  it("maps an aborted upstream fetch to 502", async () => {
    const response = await forwardAuthRequest(
      new Request("http://localhost:3000/api/auth/get-session"),
      {
        fetch: vi.fn((proxiedRequest: Request) => {
          return new Promise<Response>((_resolve, reject) => {
            proxiedRequest.signal.addEventListener("abort", () => {
              reject(proxiedRequest.signal.reason ?? new Error("aborted"));
            });
          });
        }),
      },
      1,
    );
    expect(response.status).toBe(502);
  });
});
