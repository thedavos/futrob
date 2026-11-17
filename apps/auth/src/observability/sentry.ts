import * as Sentry from "@sentry/node";
import {
  applySentryEventPolicy,
  applySentryTransactionPolicy,
  isExpectedFailure,
  scrubSentryEnvelope,
  sentrySdkOptions,
} from "@futrob/logger";

/**
 * Sentry is production-only for the auth server: it initializes exclusively
 * when SENTRY_DSN is configured AND NODE_ENV=production. In development,
 * nothing leaves the machine.
 *
 * Expected Better Auth failures are HTTP responses from the handler. Anything
 * that reaches `captureAuthError` is a defect.
 */
export function initSentry(env: {
  readonly NODE_ENV?: string;
  readonly SENTRY_DSN?: string;
  readonly SENTRY_ENVIRONMENT?: string;
}): void {
  const options = sentrySdkOptions({
    dsn: env.SENTRY_DSN,
    nodeEnv: env.NODE_ENV,
    environment: env.SENTRY_ENVIRONMENT,
    service: "auth",
  });
  if (!options) return;

  Sentry.init({
    dsn: options.dsn,
    environment: options.environment,
    tracesSampleRate: options.tracesSampleRate,
    dataCollection: options.dataCollection,
    traceLifecycle: options.traceLifecycle,
    initialScope: { tags: { ...options.initialScope.tags } },
    integrations: (defaults) => [
      ...defaults,
      {
        name: "FutrobEnvelopeScrubber",
        setup(client) {
          client.on("beforeEnvelope", scrubSentryEnvelope);
        },
      },
    ],
    beforeSend(event, hint) {
      return applySentryEventPolicy(event, hint);
    },
    beforeSendTransaction(event) {
      return applySentryTransactionPolicy(event);
    },
  });
}

export function captureAuthError(cause: unknown): void {
  if (!Sentry.getClient()) return;
  if (isExpectedFailure(cause)) return;
  Sentry.captureException(cause);
}

export function registerGlobalSentryHandlers(): void {
  if (!Sentry.getClient()) return;
  process.on("unhandledRejection", captureAuthError);
  process.on("uncaughtException", captureAuthError);
}

/** Sends buffered events before the process exits. */
export async function flushSentry(timeoutMs: number): Promise<void> {
  if (!Sentry.getClient()) return;
  await Sentry.flush(timeoutMs);
}
