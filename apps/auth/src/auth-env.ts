import type { ClientIpPolicy } from "./client-ip.ts";

/** Process environment read by the auth server (`process.env`, `.env` in development). */
export interface AuthProcessEnv {
  /** Product Postgres (ADR-0021); `apps/api/migrations` owns the schema. */
  readonly DATABASE_URL?: string;
  /** HTTP port; defaults to 8788. */
  readonly PORT?: string;
  /** Shared with web: marks requests the BFF forwards with the client IP. */
  readonly AUTH_PROXY_SECRET?: string;
  /** Header the platform load balancer sets with the client IP, such as `x-real-ip`. */
  readonly AUTH_TRUSTED_IP_HEADER?: string;
  readonly APP_BASE_URL?: string;
  readonly BETTER_AUTH_SECRET?: string;
  readonly BETTER_AUTH_URL?: string;
  readonly BETTER_AUTH_TRUSTED_ORIGINS?: string;
  readonly NODE_ENV?: string;
  readonly SENTRY_DSN?: string;
  readonly SENTRY_ENVIRONMENT?: string;
  /**
   * `resend` sends account emails through Resend (ADR-0031), `log` writes them to the log
   * (development). Unset: email change and password reset are disabled.
   */
  readonly AUTH_EMAIL_DELIVERY?: string;
  /** Resend API key; required with `AUTH_EMAIL_DELIVERY=resend`. A secret. */
  readonly RESEND_API_KEY?: string;
  /** Sender on the verified domain, such as `Futrob <cuenta@futrob.app>`. */
  readonly EMAIL_FROM?: string;
}

export type AuthEmail =
  | { readonly delivery: "log" | "disabled" }
  | { readonly delivery: "resend"; readonly apiKey: string; readonly from: string };

export interface AuthEnv {
  readonly BETTER_AUTH_SECRET: string;
  readonly BETTER_AUTH_URL: string;
  readonly BETTER_AUTH_TRUSTED_ORIGINS: readonly string[];
  /** How account emails leave the server; absent means disabled. */
  readonly AUTH_EMAIL?: AuthEmail;
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

export function buildAuthEnv(env: AuthProcessEnv): AuthEnv {
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
  if (delivery !== "log" && delivery !== "resend" && delivery !== "disabled") {
    throw new Error("AUTH_EMAIL_DELIVERY must be `resend`, `log` or unset");
  }
  let email: AuthEmail;
  if (delivery === "resend") {
    const apiKey = env.RESEND_API_KEY?.trim();
    const from = env.EMAIL_FROM?.trim();
    if (!apiKey || !from) {
      throw new Error("AUTH_EMAIL_DELIVERY=resend requires RESEND_API_KEY and EMAIL_FROM");
    }
    email = { delivery, apiKey, from };
  } else {
    email = { delivery };
  }

  return {
    BETTER_AUTH_SECRET: secret,
    BETTER_AUTH_URL: authOrigin,
    BETTER_AUTH_TRUSTED_ORIGINS: trustedOrigins,
    AUTH_EMAIL: email,
  };
}

export interface AuthServerConfig {
  readonly auth: AuthEnv;
  readonly databaseUrl: string;
  readonly port: number;
  readonly clientIp: ClientIpPolicy;
}

const DEFAULT_PORT = 8788;
const HEADER_NAME = /^[a-z0-9-]+$/;
const INTERNAL_HEADERS = new Set(["x-futrob-client-ip", "x-futrob-proxy-secret"]);

function parsePort(raw: string | undefined): number {
  const value = raw?.trim();
  if (!value) return DEFAULT_PORT;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

function parseClientIpPolicy(env: AuthProcessEnv): ClientIpPolicy {
  const proxySecret = env.AUTH_PROXY_SECRET?.trim() || undefined;
  if (proxySecret && proxySecret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(`AUTH_PROXY_SECRET must contain at least ${MINIMUM_SECRET_LENGTH} characters`);
  }
  const trustedHeader = env.AUTH_TRUSTED_IP_HEADER?.trim().toLowerCase() || undefined;
  if (trustedHeader && (!HEADER_NAME.test(trustedHeader) || INTERNAL_HEADERS.has(trustedHeader))) {
    throw new Error("AUTH_TRUSTED_IP_HEADER must name the load balancer's client IP header");
  }
  return { proxySecret, trustedHeader };
}

/** Validates the whole server configuration once, at boot. */
export function buildAuthServerConfig(env: AuthProcessEnv): AuthServerConfig {
  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  return {
    auth: buildAuthEnv(env),
    databaseUrl,
    port: parsePort(env.PORT),
    clientIp: parseClientIpPolicy(env),
  };
}
