import * as Sentry from "@sentry/node";
import { z } from "zod";

/**
 * Sentry is production-only: it initializes exclusively when the process runs
 * with NODE_ENV=production AND a SENTRY_DSN is configured. In development,
 * nothing leaves the machine — styled console logs are the observability
 * surface.
 *
 * Expected failures are TaggedErrors mapped by `failureToHttp`; they never
 * reach `app.onError`, so everything that does arrive here is a defect
 * (Panic-style) and worth capturing.
 */

let initialized = false;

export function initSentry(env: { nodeEnv?: string }): void {
  const dsn = process.env.SENTRY_DSN;
  const nodeEnv = env.nodeEnv ?? process.env.NODE_ENV;
  if (!dsn || nodeEnv !== "production") return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? "production",
    // Expected failures never reach this SDK; sampled traces cover the happy path.
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
  initialized = true;
}

export function isSentryEnabled(): boolean {
  return initialized;
}

/** Expected TaggedError failures carry a stable wire `code`; those stay local. */
const expectedFailureSchema = z.object({ code: z.string() }).passthrough();

/** Captures unexpected defects at execution boundaries; ignores expected failures. */
export function captureUnexpectedError(cause: unknown): void {
  if (!initialized) return;
  if (expectedFailureSchema.safeParse(cause).success) return;
  Sentry.captureException(cause);
}

export function registerGlobalSentryHandlers(): void {
  if (!initialized) return;
  process.on("unhandledRejection", (cause) => {
    captureUnexpectedError(cause);
  });
  process.on("uncaughtException", (cause) => {
    captureUnexpectedError(cause);
  });
}
