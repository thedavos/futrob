import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { LOGIN_ROUTE, resolveSessionGate } from "./session-gate.ts";
import {
  resetSessionCredentialStore,
  saveSession,
  setSessionCredentialStore,
} from "./session-store.ts";

function memoryCredentialStore() {
  const records = new Map<string, string>();
  return {
    setItemAsync: async (key: string, value: string) => {
      records.set(key, value);
    },
    getItemAsync: async (key: string) => records.get(key) ?? null,
    deleteItemAsync: async (key: string) => {
      records.delete(key);
    },
  };
}

describe("session gate", () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>();
  beforeEach(() => {
    setSessionCredentialStore(memoryCredentialStore());
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    resetSessionCredentialStore();
    vi.unstubAllGlobals();
  });

  it("missing session routes to login without product calls", async () => {
    expect(await resolveSessionGate()).toEqual({ kind: "login", route: LOGIN_ROUTE });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("unreadable session store fails closed", async () => {
    setSessionCredentialStore({
      setItemAsync: async () => undefined,
      getItemAsync: async () => {
        throw new Error("secure store locked");
      },
      deleteItemAsync: async () => undefined,
    });
    expect(await resolveSessionGate()).toEqual({ kind: "error", retryAfterSeconds: undefined });
  });

  it("incomplete actor resumes the persisted step before memberships", async () => {
    await saveSession({
      token: "bearer-token-1",
      user: { id: "user-1", name: "Ana", email: "ana@club.mx" },
    });
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          completed: false,
          completedAt: null,
          version: null,
          path: "player",
          currentStep: "club",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    expect(await resolveSessionGate()).toMatchObject({
      kind: "onboarding",
      route: "/(onboarding)/club",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("completed actor asks the destination service after onboarding", async () => {
    await saveSession({
      token: "bearer-token-1",
      user: { id: "user-1", name: "Ana", email: "ana@club.mx" },
    });
    fetchMock.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname;
      const body = path.endsWith("/identity/onboarding")
        ? {
            completed: true,
            completedAt: "2026-01-01T00:00:00.000Z",
            version: 1,
            path: "player",
            currentStep: null,
          }
        : {
            destination: { kind: "organization", organizationId: "org-1" },
            memberships: [{ organizationId: "org-1", organizationName: "Club", role: "organizer" }],
          };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    expect(await resolveSessionGate()).toMatchObject({ kind: "ready", route: "/orgs/org-1" });
    expect(fetchMock.mock.calls.map(([input]) => new URL(String(input)).pathname)).toEqual([
      "/api/v1/identity/onboarding",
      "/api/v1/organizations/post-auth-destination",
    ]);
  });

  it("403 during onboarding check never opens a protected destination", async () => {
    await saveSession({
      token: "bearer-token-1",
      user: { id: "user-1", name: "Ana", email: "ana@club.mx" },
    });
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: "api.forbidden", messageKey: "errors.api.forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(await resolveSessionGate()).toMatchObject({ kind: "error" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("legacy and inconsistent steps fall back safely", async () => {
    await saveSession({
      token: "bearer-token-1",
      user: { id: "user-1", name: "Ana", email: "ana@club.mx" },
    });
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          completed: false,
          completedAt: null,
          version: null,
          path: "organization",
          currentStep: "game",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    expect(await resolveSessionGate()).toMatchObject({
      kind: "onboarding",
      route: "/(onboarding)/organization",
    });
  });
});
