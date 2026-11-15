import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  clearSession,
  getSession,
  resetSessionCredentialStore,
  saveSession,
  setSessionCredentialStore,
} from "@/modules/identity/session-store";
import { changeAccountPassword, listDeviceSessions } from "./account-auth-api.ts";

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

describe("account auth", () => {
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

  it("clears the rejected account session when auth responds with 401", async () => {
    await saveSession(ana);
    fetchMock.mockResolvedValue(Response.json({ code: "UNAUTHORIZED" }, { status: 401 }));

    await expect(listDeviceSessions()).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });

    await expect(getSession()).resolves.toBeNull();
  });

  it("keeps a later sign-in when an earlier account request responds with 401", async () => {
    await saveSession(ana);
    const response = Promise.withResolvers<Response>();
    const requested = Promise.withResolvers<void>();
    fetchMock.mockImplementation(() => {
      requested.resolve();
      return response.promise;
    });

    const list = listDeviceSessions();
    const rejected = expect(list).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    await requested.promise;
    await clearSession();
    await saveSession(beto);
    response.resolve(Response.json({ code: "UNAUTHORIZED" }, { status: 401 }));
    await rejected;

    await expect(getSession()).resolves.toEqual(beto);
  });

  it.each([400, 403])("keeps the account session on a %s auth failure", async (status) => {
    await saveSession(ana);
    fetchMock.mockResolvedValue(Response.json({ code: "INVALID_PASSWORD" }, { status }));

    await expect(changeAccountPassword(passwords)).rejects.toMatchObject({
      code: "INVALID_PASSWORD",
      status,
    });

    await expect(getSession()).resolves.toEqual(ana);
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
