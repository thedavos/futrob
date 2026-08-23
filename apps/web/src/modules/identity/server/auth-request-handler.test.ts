import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { buildAuthProxyHeaders, proxyAuthRequest, resolveAuthServiceUrl } from "./auth-proxy.ts";

describe("auth proxy helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats missing or blank service URLs as unset", () => {
    expect(resolveAuthServiceUrl(undefined, undefined)).toBeUndefined();
    expect(resolveAuthServiceUrl("  ", "")).toBeUndefined();
    expect(resolveAuthServiceUrl("http://localhost:8788", undefined)).toBe("http://localhost:8788");
  });

  it("rejects service URLs that are not plain HTTP origins", () => {
    expect(resolveAuthServiceUrl("javascript:alert(1)", undefined)).toBeUndefined();
    expect(resolveAuthServiceUrl("https://user:secret@auth.test", undefined)).toBeUndefined();
    expect(resolveAuthServiceUrl("https://auth.test/api/auth", undefined)).toBeUndefined();
    expect(resolveAuthServiceUrl("https://auth.test/", undefined)).toBe("https://auth.test");
  });

  it("strips transport and spoofable proxy headers and forwards host/proto", () => {
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
    expect(headers.get("cf-connecting-ip")).toBeNull();
    expect(headers.get("x-forwarded-for")).toBeNull();
    expect(headers.get("x-real-ip")).toBeNull();
    expect(headers.get("x-forwarded-host")).toBe("futrob.app");
    expect(headers.get("x-forwarded-proto")).toBe("https");
  });

  it("forwards path, query, and body with redirect: manual", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("http://localhost:3000/api/auth/sign-in/email?next=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.co" }),
    });

    await proxyAuthRequest(request, "http://localhost:8788/");

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls.at(0);
    if (!call) {
      throw new Error("Expected the auth proxy to call fetch");
    }
    const [target, init] = call;
    expect(target).toBe("http://localhost:8788/api/auth/sign-in/email?next=1");
    expect(init?.method).toBe("POST");
    expect(init?.redirect).toBe("manual");
    expect(init?.body).toBeDefined();
  });

  it("maps a thrown fetch to the caller via reject", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("upstream down");
      }),
    );

    await expect(
      proxyAuthRequest(
        new Request("http://localhost:3000/api/auth/get-session"),
        "http://localhost:8788",
      ),
    ).rejects.toThrow("upstream down");
  });
});
