import { describe, expect, it, vi } from "vite-plus/test";
import { createAuthApp, type AuthAppDeps } from "./app.ts";
import { CLIENT_IP_HEADER, PROXY_SECRET_HEADER } from "./client-ip.ts";

function app(overrides: Partial<AuthAppDeps> = {}) {
  const handleAuth = vi.fn(async (_request: Request) => Response.json({ ok: true }));
  const deps: AuthAppDeps = {
    handleAuth,
    checkHealth: async () => true,
    clientIp: { trustedHeader: "x-real-ip" },
    reportDefect: vi.fn(),
    ...overrides,
  };
  return { app: createAuthApp(deps), handleAuth, deps };
}

describe("auth app", () => {
  it("reports health from the schema probe", async () => {
    expect(await (await app().app.request("/meta/health")).json()).toEqual({
      ok: true,
      service: "futrob-auth",
    });
    const down = app({ checkHealth: async () => Promise.reject(new Error("db down")) });
    const response = await down.app.request("/meta/health");
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, service: "futrob-auth" });
  });

  it("hands /api/auth requests to Better Auth with the resolved client IP", async () => {
    const { app: server, handleAuth } = app();
    const response = await server.request("/api/auth/get-session", {
      headers: {
        "x-real-ip": "203.0.113.4",
        [CLIENT_IP_HEADER]: "6.6.6.6",
        [PROXY_SECRET_HEADER]: "guess",
      },
    });
    expect(response.status).toBe(200);
    const forwarded = handleAuth.mock.calls[0]?.[0];
    expect(new URL(forwarded?.url ?? "").pathname).toBe("/api/auth/get-session");
    expect(forwarded?.headers.get(CLIENT_IP_HEADER)).toBe("203.0.113.4");
    expect(forwarded?.headers.get(PROXY_SECRET_HEADER)).toBeNull();
  });

  it("answers 404 outside /api/auth and /meta/health", async () => {
    const { app: server, handleAuth } = app();
    expect((await server.request("/api/v1/players")).status).toBe(404);
    expect((await server.request("/api/authx")).status).toBe(404);
    expect(handleAuth).not.toHaveBeenCalled();
  });

  it("reports handler defects and answers a sanitized 500", async () => {
    const defect = new Error("connection reset");
    const { app: server, deps } = app({ handleAuth: async () => Promise.reject(defect) });
    const response = await server.request("/api/auth/sign-in/email", { method: "POST" });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      code: "auth.unhandled",
      messageKey: "errors.auth.unhandled",
    });
    expect(deps.reportDefect).toHaveBeenCalledWith(defect);
  });
});
