import * as Sentry from "@sentry/browser";
import { applySentryEventPolicy, applySentryTransactionPolicy } from "@futrob/logger";
import { isExpectedFailure } from "./expected-failure.ts";

/**
 * Browser counterpart of `withWorkerSentry`: production-only. Initializes only
 * when VITE_SENTRY_DSN is set AND the bundle is a production build. In
 * development, nothing leaves the machine.
 *
 * Every event and transaction passes the shared `@futrob/logger` policy before
 * transport (same as the Worker), so invite tokens in `request.url`, navigation
 * breadcrumbs and exception messages never reach Sentry. Caller `beforeSend*`
 * overrides run after the policy, on the scrubbed event.
 */
export interface BrowserSentryConfig {
  readonly dsn?: string;
  readonly environment?: string;
  readonly production: boolean;
}

export function browserSentryConfigFromEnv(): BrowserSentryConfig {
  return {
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
    production: import.meta.env.PROD,
  };
}

export function initBrowserSentry(
  config: BrowserSentryConfig = browserSentryConfigFromEnv(),
  overrides?: Partial<Sentry.BrowserOptions>,
): void {
  if (!config.dsn || !config.production) return;
  const { beforeSend, beforeSendTransaction, ...options } = overrides ?? {};
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment ?? "production",
    ...options,
    sendDefaultPii: false,
    beforeSend(event, hint) {
      const scrubbed = applySentryEventPolicy(event, hint);
      if (!scrubbed) return null;
      return beforeSend ? beforeSend(scrubbed, hint) : scrubbed;
    },
    beforeSendTransaction(event, hint) {
      const scrubbed = applySentryTransactionPolicy(event);
      return beforeSendTransaction ? beforeSendTransaction(scrubbed, hint) : scrubbed;
    },
  });
}

/** No-op unless the SDK was initialized (dev stays console-only). */
export function captureBrowserError(cause: unknown, context?: Record<string, string>): void {
  if (!Sentry.getClient()) return;
  if (isExpectedFailure(cause)) return;
  if (context) {
    Sentry.getCurrentScope().setExtras(context);
  }
  Sentry.captureException(cause);
}
