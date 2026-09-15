import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import {
  SESSION_STORE_KEYS,
  clearSession,
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

describe("session-store", () => {
  let store: ReturnType<typeof memoryCredentialStore>;

  beforeEach(() => {
    store = memoryCredentialStore();
    setSessionCredentialStore(store);
  });

  afterEach(() => {
    resetSessionCredentialStore();
  });

  it("session-store persists token and user then round-trips getSession", async () => {
    const session = {
      token: "bearer-token-1",
      user: { id: "user-1", name: "Ana Captain", email: "ana@club.mx" },
    };

    await saveSession(session);

    expect(store.records.get(SESSION_STORE_KEYS.token)).toBe(session.token);
    expect(store.records.get(SESSION_STORE_KEYS.user)).toBe(JSON.stringify(session.user));
    await expect(getSession()).resolves.toEqual(session);
  });

  it("clearSession removes both SecureStore keys", async () => {
    await saveSession({
      token: "bearer-token-1",
      user: { id: "user-1", name: "Ana Captain", email: "ana@club.mx" },
    });

    await clearSession();

    expect(store.records.has(SESSION_STORE_KEYS.token)).toBe(false);
    expect(store.records.has(SESSION_STORE_KEYS.user)).toBe(false);
    await expect(getSession()).resolves.toBeNull();
  });

  it("saveSession clears both keys when the user write fails", async () => {
    const failing = {
      ...store,
      setItemAsync: async (key: string, value: string) => {
        if (key === SESSION_STORE_KEYS.user) {
          throw new Error("secure store full");
        }
        store.records.set(key, value);
      },
    };
    setSessionCredentialStore(failing);

    await expect(
      saveSession({
        token: "bearer-token-1",
        user: { id: "user-1", name: "Ana Captain", email: "ana@club.mx" },
      }),
    ).rejects.toThrow("secure store full");

    expect(store.records.has(SESSION_STORE_KEYS.token)).toBe(false);
    expect(store.records.has(SESSION_STORE_KEYS.user)).toBe(false);
    await expect(getSession()).resolves.toBeNull();
  });
});
