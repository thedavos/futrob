import * as Sentry from "@sentry/browser";
import { isExpectedFailure } from "./expected-failure.ts";

/**
 * Browser counterpart of `withWorkerSentry`: production-only. Initializes only
 * when VITE_SENTRY_DSN is set AND the bundle is a production build. In
 * development, nothing leaves the machine.
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
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment ?? "production",
    ...overrides,
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
