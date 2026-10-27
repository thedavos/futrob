import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import {
  SESSION_STORE_KEYS,
  clearSession,
  clearSessionIfCurrent,
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

  it("a pending conditional clear for an earlier token keeps the session saved after it", async () => {
    let tokenReads = 0;
    const clearing = Promise.withResolvers<void>();
    const paused = Promise.withResolvers<void>();
    setSessionCredentialStore({
      ...store,
      getItemAsync: async (key) => {
        if (key === SESSION_STORE_KEYS.token && ++tokenReads === 2) {
          clearing.resolve();
          await paused.promise;
        }
        return store.getItemAsync(key);
      },
    });
    await saveSession({ token: "token-ana", user: { id: "ana", name: "Ana", email: "a@x.mx" } });

    const rejectedAna = clearSessionIfCurrent("token-ana");
    await clearing.promise;
    const beto = { token: "token-beto", user: { id: "beto", name: "Beto", email: "b@x.mx" } };
    const logoutThenBeto = clearSession().then(() => saveSession(beto));
    await new Promise<void>((resolve) => setTimeout(resolve));
    paused.resolve();
    await Promise.all([rejectedAna, logoutThenBeto]);

    await expect(getSession()).resolves.toEqual(beto);
  });

  it("rejects a failed save while allowing the next queued session to persist", async () => {
    let failNextUserWrite = true;
    setSessionCredentialStore({
      ...store,
      setItemAsync: async (key, value) => {
        if (key === SESSION_STORE_KEYS.user && failNextUserWrite) {
          failNextUserWrite = false;
          throw new Error("secure store full");
        }
        await store.setItemAsync(key, value);
      },
    });
    const ana = { token: "token-ana", user: { id: "ana", name: "Ana", email: "a@x.mx" } };
    const beto = { token: "token-beto", user: { id: "beto", name: "Beto", email: "b@x.mx" } };

    const failed = expect(saveSession(ana)).rejects.toThrow("secure store full");
    const recovered = saveSession(beto);
    await Promise.all([failed, recovered]);

    await expect(getSession()).resolves.toEqual(beto);
  });
});
