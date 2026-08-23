export interface AuthWorkerEnv {
  readonly APP_DB?: D1Database;
  readonly APP_BASE_URL?: string;
  readonly BETTER_AUTH_SECRET?: string;
  readonly BETTER_AUTH_URL?: string;
  readonly BETTER_AUTH_TRUSTED_ORIGINS?: string;
}

export interface AuthEnv {
  readonly BETTER_AUTH_SECRET: string;
  readonly BETTER_AUTH_URL: string;
  readonly BETTER_AUTH_TRUSTED_ORIGINS: readonly string[];
}

export function parseTrustedOrigins(raw: string | undefined): readonly string[] {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function buildAuthEnv(env: AuthWorkerEnv, requestOrigin: string): AuthEnv {
  const publicOrigin = env.APP_BASE_URL?.trim() || requestOrigin;
  const explicitOrigins = env.BETTER_AUTH_TRUSTED_ORIGINS?.trim();
  const trustedOrigins = parseTrustedOrigins(explicitOrigins || `${publicOrigin},${requestOrigin}`);

  return {
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET ?? "",
    BETTER_AUTH_URL: env.BETTER_AUTH_URL?.trim() || publicOrigin,
    BETTER_AUTH_TRUSTED_ORIGINS: trustedOrigins.length > 0 ? trustedOrigins : [publicOrigin],
  };
}
