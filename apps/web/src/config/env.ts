export interface AppEnv {
  readonly APP_BASE_URL: string;
  readonly BETTER_AUTH_SECRET: string;
  readonly BETTER_AUTH_URL: string;
  readonly BETTER_AUTH_TRUSTED_ORIGINS: readonly string[];
  readonly EA_CLUBS_BASE_URL: string;
  readonly INTERNAL_JOB_SECRET: string;
}

export function parseAppEnv(source: Record<string, string | undefined>): AppEnv {
  const required = [
    "APP_BASE_URL",
    "BETTER_AUTH_SECRET",
    "EA_CLUBS_BASE_URL",
    "INTERNAL_JOB_SECRET",
  ] as const;

  for (const key of required) {
    if (!source[key]) {
      // Soft parse during scaffold — harden when Worker boots for real.
      console.warn(`[env] missing ${key}`);
    }
  }

  const appBaseUrl = source.APP_BASE_URL ?? "http://localhost:3000";

  return {
    APP_BASE_URL: appBaseUrl,
    BETTER_AUTH_SECRET: source.BETTER_AUTH_SECRET ?? "",
    BETTER_AUTH_URL: source.BETTER_AUTH_URL ?? appBaseUrl,
    BETTER_AUTH_TRUSTED_ORIGINS: parseTrustedOrigins(
      source.BETTER_AUTH_TRUSTED_ORIGINS,
      appBaseUrl,
    ),
    EA_CLUBS_BASE_URL: source.EA_CLUBS_BASE_URL ?? "https://proclubs.ea.com/api/fc",
    INTERNAL_JOB_SECRET: source.INTERNAL_JOB_SECRET ?? "",
  };
}

function parseTrustedOrigins(raw: string | undefined, fallbackOrigin: string): readonly string[] {
  const parsed = (raw ?? fallbackOrigin)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [fallbackOrigin];
}
