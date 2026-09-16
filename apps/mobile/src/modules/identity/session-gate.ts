import { getSession, type Session } from "./session-store.ts";

export const LOGIN_ROUTE = "/(auth)/login" as const;
export const HOME_ROUTE = "/(home)" as const;

export type SessionGateDestination = typeof LOGIN_ROUTE | typeof HOME_ROUTE;

export function sessionGateDestination(session: Session | null): SessionGateDestination {
  return session === null ? LOGIN_ROUTE : HOME_ROUTE;
}

export async function resolveSessionGate(): Promise<SessionGateDestination> {
  try {
    return sessionGateDestination(await getSession());
  } catch {
    return LOGIN_ROUTE;
  }
}
