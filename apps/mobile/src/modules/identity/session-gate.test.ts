import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import {
  HOME_ROUTE,
  LOGIN_ROUTE,
  resolveSessionGate,
  sessionGateDestination,
} from "./session-gate.ts";
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
  beforeEach(() => {
    setSessionCredentialStore(memoryCredentialStore());
  });

  afterEach(() => {
    resetSessionCredentialStore();
  });

  it("missing session routes to login not home", async () => {
    const destination = await resolveSessionGate();
    expect(destination).toBe(LOGIN_ROUTE);
    expect(destination).not.toBe(HOME_ROUTE);
    expect(sessionGateDestination(null)).toBe(LOGIN_ROUTE);
  });

  it("unreadable session store routes to login not home", async () => {
    setSessionCredentialStore({
      setItemAsync: async () => undefined,
      getItemAsync: async () => {
        throw new Error("secure store locked");
      },
      deleteItemAsync: async () => undefined,
    });
    const destination = await resolveSessionGate();
    expect(destination).toBe(LOGIN_ROUTE);
    expect(destination).not.toBe(HOME_ROUTE);
  });

  it("stored session routes to home", async () => {
    await saveSession({
      token: "bearer-token-1",
      user: { id: "user-1", name: "Ana", email: "ana@club.mx" },
    });
    await expect(resolveSessionGate()).resolves.toBe(HOME_ROUTE);
  });
});
