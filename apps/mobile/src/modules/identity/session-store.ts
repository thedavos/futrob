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

export async function saveSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, session.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));
}

export async function getSession(): Promise<Session | null> {
  const [token, userJson] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
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
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
