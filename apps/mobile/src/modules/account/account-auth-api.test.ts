import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  clearSession,
  getSession,
  resetSessionCredentialStore,
  saveSession,
  setSessionCredentialStore,
} from "@/modules/identity/session-store";
import { changeAccountPassword } from "./account-auth-api.ts";

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

const ana = { token: "a-old", user: { id: "ana", name: "Ana", email: "a@x.mx" } };
const beto = { token: "b-token", user: { id: "beto", name: "Beto", email: "b@x.mx" } };
const passwords = { currentPassword: "Old12345", newPassword: "New12345" };

describe("changeAccountPassword", () => {
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

  it("keeps the rotated bearer for the session that changed the password", async () => {
    await saveSession(ana);
    fetchMock.mockResolvedValue(Response.json({ token: "a-new" }));

    await changeAccountPassword(passwords);

    await expect(getSession()).resolves.toEqual({ ...ana, token: "a-new" });
  });

  it("does not graft a rotated bearer onto the account signed in since", async () => {
    await saveSession(ana);
    const response = Promise.withResolvers<Response>();
    const requested = Promise.withResolvers<void>();
    fetchMock.mockImplementation(() => {
      requested.resolve();
      return response.promise;
    });

    const change = changeAccountPassword(passwords);
    await requested.promise;
    await clearSession();
    await saveSession(beto);
    response.resolve(Response.json({ token: "a-new" }));
    await change;

    await expect(getSession()).resolves.toEqual(beto);
  });
});
