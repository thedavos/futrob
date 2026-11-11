import { z } from "zod";

/** A session as Better Auth `list-sessions` returns it; extra fields are ignored. */
export const authSessionSchema = z.object({
  id: z.string(),
  token: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  userAgent: z.string().nullish(),
});
export type AuthSession = z.infer<typeof authSessionSchema>;

export const authSessionListSchema = z.array(authSessionSchema);

export type SessionDeviceKind = "desktop" | "phone" | "tablet" | "app" | "unknown";

export interface SessionDevice {
  readonly kind: SessionDeviceKind;
  /** Browser or app name, e.g. "Chrome" or "Futrob". `null` when the agent does not say. */
  readonly client: string | null;
  /** Operating system, e.g. "macOS" or "Android". */
  readonly os: string | null;
}

export interface AccountSession {
  readonly id: string;
  /** Needed to revoke it; never display it. */
  readonly token: string;
  readonly device: SessionDevice;
  readonly signedInAt: Date;
  readonly lastActiveAt: Date;
  readonly current: boolean;
}

const OPERATING_SYSTEMS: ReadonlyArray<readonly [RegExp, string]> = [
  [/iPhone|iPad|iPod|iOS/i, "iOS"],
  [/Android/i, "Android"],
  [/Windows/i, "Windows"],
  [/Mac OS X|Macintosh|Darwin/i, "macOS"],
  [/CrOS/i, "ChromeOS"],
  [/Linux/i, "Linux"],
];

// Order matters: Edge and Opera also say "Chrome", and Chrome also says "Safari".
const CLIENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Expo|okhttp|CFNetwork|Futrob/i, "Futrob"],
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\/|FxiOS/, "Firefox"],
  [/Chrome\/|CriOS/, "Chrome"],
  [/Safari\//, "Safari"],
];

function firstMatch(userAgent: string, table: ReadonlyArray<readonly [RegExp, string]>) {
  return table.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
}

/** Turns a user agent into the words a person recognizes for their device. */
export function describeSessionDevice(userAgent: string | null | undefined): SessionDevice {
  const agent = userAgent?.trim() ?? "";
  if (!agent) return { kind: "unknown", client: null, os: null };
  const client = firstMatch(agent, CLIENTS);
  const os = firstMatch(agent, OPERATING_SYSTEMS);
  const kind: SessionDeviceKind =
    client === "Futrob"
      ? "app"
      : /iPad|Tablet/i.test(agent)
        ? "tablet"
        : /Mobile|iPhone|Android/i.test(agent)
          ? "phone"
          : client || os
            ? "desktop"
            : "unknown";
  return { kind, client, os };
}

/** The current session first, then the most recently active. */
export function toAccountSessions(
  sessions: readonly AuthSession[],
  currentSessionId: string | null,
): AccountSession[] {
  return sessions
    .map((session) => ({
      id: session.id,
      token: session.token,
      device: describeSessionDevice(session.userAgent),
      signedInAt: session.createdAt,
      lastActiveAt: session.updatedAt,
      current: session.id === currentSessionId,
    }))
    .sort(
      (a, b) =>
        Number(b.current) - Number(a.current) ||
        b.lastActiveAt.getTime() - a.lastActiveAt.getTime(),
    );
}
