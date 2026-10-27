import * as SecureStore from "expo-secure-store";
import { z } from "zod";

const TOKEN_KEY = "futrob.session.token";
const USER_KEY = "futrob.session.user";

const storedUserSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string().min(1),
});

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface Session {
  token: string;
  user: SessionUser;
}

/** SecureStore-compatible credential backend. Tests swap this for an in-memory map. */
export interface SessionCredentialStore {
  setItemAsync(key: string, value: string): Promise<void>;
  getItemAsync(key: string): Promise<string | null>;
  deleteItemAsync(key: string): Promise<void>;
}

let credentials: SessionCredentialStore = SecureStore;

/**
 * Identifies one signed-in (or signed-out) period of this app process. Every credential
 * change starts a new generation, so data read under one session can be told apart from
 * the next session's, even for the same account. Holds no credential material.
 */
export type SessionGeneration = number & { readonly __brand: "SessionGeneration" };

function toSessionGeneration(value: number): SessionGeneration {
  // SAFETY: only this module mints generations, from its own monotonic counter.
  return value as SessionGeneration;
}

let generation = toSessionGeneration(0);
const generationListeners = new Set<() => void>();

function startGeneration(): void {
  generation = toSessionGeneration(generation + 1);
  for (const listener of generationListeners) listener();
}

export function getSessionGeneration(): SessionGeneration {
  return generation;
}

export function subscribeSessionGeneration(listener: () => void): () => void {
  generationListeners.add(listener);
  return () => {
    generationListeners.delete(listener);
  };
}

export function setSessionCredentialStore(store: SessionCredentialStore): void {
  credentials = store;
}

export function resetSessionCredentialStore(): void {
  credentials = SecureStore;
}

export async function saveSession(session: Session): Promise<void> {
  try {
    await credentials.setItemAsync(TOKEN_KEY, session.token);
    await credentials.setItemAsync(USER_KEY, JSON.stringify(session.user));
  } catch (cause) {
    await clearSession();
    throw cause;
  }
  startGeneration();
}

export async function getSession(): Promise<Session | null> {
  const [token, userJson] = await Promise.all([
    credentials.getItemAsync(TOKEN_KEY),
    credentials.getItemAsync(USER_KEY),
  ]);
  if (!token || !userJson) {
    return null;
  }

  let rawUser: unknown;
  try {
    rawUser = JSON.parse(userJson);
  } catch {
    return null;
  }

  const user = storedUserSchema.safeParse(rawUser);
  if (!user.success) {
    return null;
  }
  return { token, user: user.data };
}

export async function clearSession(): Promise<void> {
  const hadToken = (await credentials.getItemAsync(TOKEN_KEY)) !== null;
  await credentials.deleteItemAsync(TOKEN_KEY);
  await credentials.deleteItemAsync(USER_KEY);
  if (hadToken) startGeneration();
}

/**
 * Ends the stored session only if it still holds `token`. A rejection of an earlier
 * session's token must not sign out whoever signed in since.
 */
export async function clearSessionIfCurrent(token: string): Promise<boolean> {
  if ((await credentials.getItemAsync(TOKEN_KEY)) !== token) return false;
  await clearSession();
  return true;
}

export const SESSION_STORE_KEYS = {
  token: TOKEN_KEY,
  user: USER_KEY,
} as const;
