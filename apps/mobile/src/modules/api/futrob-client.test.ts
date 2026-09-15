import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { FutrobApiError } from "@futrob/sdk";
import { getFutrobClient } from "./futrob-client.ts";
import {
  getSession,
  resetSessionCredentialStore,
  saveSession,
  setSessionCredentialStore,
} from "@/modules/identity/session-store";

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

describe("mobile product API client", () => {
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

  it("product 401 from any resource clears the local session", async () => {
    await saveSession({
      token: "bearer-token-1",
      user: { id: "user-1", name: "Ana", email: "ana@club.mx" },
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ code: "api.unauthorized", messageKey: "errors.api.unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = getFutrobClient();
    await expect(client.identity.getOnboardingStatus()).rejects.toBeInstanceOf(FutrobApiError);
    await expect(getSession()).resolves.toBeNull();
  });
});
