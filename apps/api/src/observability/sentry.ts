import * as Sentry from "@sentry/node";
import {
  applySentryEventPolicy,
  applySentryTransactionPolicy,
  isExpectedFailure,
  sentrySdkOptions,
  withRequestIdTag,
} from "@futrob/logger";
import { currentRequestCorrelation } from "@/context/request-correlation.ts";

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

export function initSentry(env: { nodeEnv?: string }): void {
  const options = sentrySdkOptions({
    dsn: process.env.SENTRY_DSN,
    nodeEnv: env.nodeEnv ?? process.env.NODE_ENV,
    environment: process.env.SENTRY_ENVIRONMENT,
    service: "api",
  });
  if (!options) return;

  Sentry.init({
    dsn: options.dsn,
    environment: options.environment,
    tracesSampleRate: options.tracesSampleRate,
    sendDefaultPii: false,
    initialScope: { tags: { ...options.initialScope.tags } },
    beforeSend(event, hint) {
      const scrubbed = applySentryEventPolicy(event, hint);
      if (!scrubbed) return null;
      return withRequestIdTag(scrubbed, currentRequestCorrelation()?.requestId);
    },
    beforeSendTransaction(event) {
      return applySentryTransactionPolicy(event);
    },
  });
}

export function isSentryEnabled(): boolean {
  return Sentry.getClient() !== undefined;
}

/** Captures unexpected defects at execution boundaries; ignores expected failures. */
export function captureUnexpectedError(cause: unknown): void {
  if (!Sentry.getClient()) return;
  if (isExpectedFailure(cause)) return;
  Sentry.captureException(cause);
}

export function registerGlobalSentryHandlers(): void {
  if (!Sentry.getClient()) return;
  process.on("unhandledRejection", (cause) => {
    captureUnexpectedError(cause);
  });
  process.on("uncaughtException", (cause) => {
    captureUnexpectedError(cause);
  });
}
