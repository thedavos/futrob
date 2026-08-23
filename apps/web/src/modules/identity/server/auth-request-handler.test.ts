import { describe, expect, it, vi } from "vite-plus/test";
import { buildAuthProxyHeaders, proxyAuthRequest, type AuthServiceBinding } from "./auth-proxy.ts";

describe("auth proxy helpers", () => {
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
    expect(headers.get("x-real-ip")).toBeNull();
    expect(headers.get("x-forwarded-host")).toBe("futrob.app");
    expect(headers.get("x-forwarded-proto")).toBe("https");
  });

  it("forwards path, query, body, and client IP through the service binding", async () => {
    const fetchMock = vi.fn<AuthServiceBinding["fetch"]>(
      async () => new Response("ok", { status: 200 }),
    );
    const authService: AuthServiceBinding = { fetch: fetchMock };

    const request = new Request("http://localhost:3000/api/auth/sign-in/email?next=1", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "1.2.3.4",
      },
      body: JSON.stringify({ email: "a@b.co" }),
    });

    await proxyAuthRequest(request, authService);

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls.at(0);
    if (!call) {
      throw new Error("Expected the auth proxy to call fetch");
    }
    const [proxiedRequest] = call;
    expect(proxiedRequest.url).toBe("https://futrob-auth.internal/api/auth/sign-in/email?next=1");
    expect(proxiedRequest.method).toBe("POST");
    expect(proxiedRequest.redirect).toBe("manual");
    expect(proxiedRequest.body).toBeDefined();
    expect(proxiedRequest.headers.get("cf-connecting-ip")).toBe("1.2.3.4");
  });

  it("maps a thrown service call to the caller via reject", async () => {
    const authService: AuthServiceBinding = {
      fetch: vi.fn(async () => {
        throw new Error("upstream down");
      }),
    };

    await expect(
      proxyAuthRequest(new Request("http://localhost:3000/api/auth/get-session"), authService),
    ).rejects.toThrow("upstream down");
  });
});
