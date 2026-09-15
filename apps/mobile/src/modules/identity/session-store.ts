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
  await credentials.deleteItemAsync(TOKEN_KEY);
  await credentials.deleteItemAsync(USER_KEY);
}

export const SESSION_STORE_KEYS = {
  token: TOKEN_KEY,
  user: USER_KEY,
} as const;
