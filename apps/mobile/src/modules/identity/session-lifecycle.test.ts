import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { FutrobApiError } from "@futrob/sdk";
import { handleProductError, logout } from "./session-lifecycle.ts";
import {
  getSession,
  resetSessionCredentialStore,
  saveSession,
  setSessionCredentialStore,
} from "./session-store.ts";

function memoryCredentialStore() {
  const records = new Map<string, string>();
  return {
    records,
    setItemAsync: async (key: string, value: string) => {
      records.set(key, value);
    },
    getItemAsync: async (key: string) => records.get(key) ?? null,
    deleteItemAsync: async (key: string) => {
      records.delete(key);
    },
  };
}

describe("session lifecycle", () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    setSessionCredentialStore(memoryCredentialStore());
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    resetSessionCredentialStore();
    vi.unstubAllGlobals();
  });

  it("product 401 clears session and shows login", async () => {
    await saveSession({
      token: "bearer-token-1",
      user: { id: "user-1", name: "Ana", email: "ana@club.mx" },
    });
    const destinations: string[] = [];
    const error = new FutrobApiError({
      status: 401,
      body: { code: "api.unauthorized", messageKey: "errors.api.unauthorized" },
    });

    const handled = await handleProductError(error, () => destinations.push("/(auth)/login"));

    expect(handled).toBe(true);
    await expect(getSession()).resolves.toBeNull();
    expect(destinations).toEqual(["/(auth)/login"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logout calls remote sign-out then clears SecureStore", async () => {
    await saveSession({
      token: "bearer-token-1",
      user: { id: "user-1", name: "Ana", email: "ana@club.mx" },
    });
    const destinations: string[] = [];
    fetchMock.mockImplementation(async (input, init) => {
      const headers = new Headers(init?.headers);
      expect(String(input)).toMatch(/\/api\/auth\/sign-out$/);
      expect(headers.get("Authorization")).toBe("Bearer bearer-token-1");
      expect(await getSession()).not.toBeNull();
      return new Response(null, { status: 200 });
    });

    const remote = await logout(() => {
      destinations.push("/(auth)/login");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(getSession()).resolves.toBeNull();
    expect(destinations).toEqual(["/(auth)/login"]);
    expect(remote).toEqual({ ok: true });
  });

  it("logout still clears SecureStore when remote sign-out fails", async () => {
    await saveSession({
      token: "bearer-token-1",
      user: { id: "user-1", name: "Ana", email: "ana@club.mx" },
    });
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    const remote = await logout(() => undefined);

    expect(remote).toEqual({ ok: false, network: false, status: 503 });
    await expect(getSession()).resolves.toBeNull();
  });

  it("logout still clears SecureStore when remote sign-out cannot connect", async () => {
    await saveSession({
      token: "bearer-token-1",
      user: { id: "user-1", name: "Ana", email: "ana@club.mx" },
    });
    fetchMock.mockRejectedValue(new TypeError("network down"));

    const remote = await logout(() => undefined);

    expect(remote).toEqual({ ok: false, network: true });
    await expect(getSession()).resolves.toBeNull();
  });
});
