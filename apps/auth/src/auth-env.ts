export interface AuthWorkerEnv {
  /** Hyperdrive binding to the product Postgres (ADR-0021). */
  readonly HYPERDRIVE?: Hyperdrive;
  readonly APP_BASE_URL?: string;
  readonly BETTER_AUTH_SECRET?: string;
  readonly BETTER_AUTH_URL?: string;
  readonly BETTER_AUTH_TRUSTED_ORIGINS?: string;
  readonly NODE_ENV?: string;
  readonly SENTRY_DSN?: string;
  readonly SENTRY_ENVIRONMENT?: string;
  /** `log` writes account emails to the log (development). Unset: email change is disabled. */
  readonly AUTH_EMAIL_DELIVERY?: string;
}

export type AuthEmailDelivery = "log" | "disabled";

export interface AuthEnv {
  readonly BETTER_AUTH_SECRET: string;
  readonly BETTER_AUTH_URL: string;
  readonly BETTER_AUTH_TRUSTED_ORIGINS: readonly string[];
  readonly AUTH_EMAIL_DELIVERY: AuthEmailDelivery;
}

const MINIMUM_SECRET_LENGTH = 32;

export function parseTrustedOrigins(raw: string | undefined): readonly string[] {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseHttpOrigin(raw: string | undefined, name: string): string {
  const value = raw?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }

  const url = new URL(value);
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${name} must be an HTTP origin`);
  }

  return url.origin;
}

export function buildAuthEnv(env: AuthWorkerEnv): AuthEnv {
  const secret = env.BETTER_AUTH_SECRET?.trim();
  if (!secret || secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(`BETTER_AUTH_SECRET must contain at least ${MINIMUM_SECRET_LENGTH} characters`);
  }

  const publicOrigin = parseHttpOrigin(env.APP_BASE_URL, "APP_BASE_URL");
  const authOrigin = parseHttpOrigin(
    env.BETTER_AUTH_URL?.trim() || publicOrigin,
    "BETTER_AUTH_URL",
  );
  const trustedOrigins = parseTrustedOrigins(env.BETTER_AUTH_TRUSTED_ORIGINS).map((origin) =>
    parseHttpOrigin(origin, "BETTER_AUTH_TRUSTED_ORIGINS"),
  );
  if (trustedOrigins.length === 0) {
    throw new Error("BETTER_AUTH_TRUSTED_ORIGINS must contain at least one origin");
  }

  const delivery = env.AUTH_EMAIL_DELIVERY?.trim() || "disabled";
  if (delivery !== "log" && delivery !== "disabled") {
    throw new Error("AUTH_EMAIL_DELIVERY must be `log` or unset");
  }

  return {
    BETTER_AUTH_SECRET: secret,
    BETTER_AUTH_URL: authOrigin,
    BETTER_AUTH_TRUSTED_ORIGINS: trustedOrigins,
    AUTH_EMAIL_DELIVERY: delivery,
  };
}
