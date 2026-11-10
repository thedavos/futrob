import * as Sentry from "@sentry/cloudflare";
import { applySentryEventPolicy, isExpectedFailure, sentrySdkOptions } from "@futrob/logger";

/**
 * Sentry is production-only for the web Worker: `withWorkerSentry` initializes
 * exclusively when SENTRY_DSN is configured AND NODE_ENV=production (wrangler
 * vars). In development, nothing leaves the machine — console logs are the
 * observability surface.
 *
 * The wrapper instruments fetch/queue/scheduled handlers; expected TaggedError
 * failures are mapped to HTTP responses inside handlers, so anything reaching
 * Sentry here is a defect.
 */

function cloudflareSentryOptions<
  Env extends {
    readonly NODE_ENV?: string;
    readonly SENTRY_DSN?: string;
    readonly SENTRY_ENVIRONMENT?: string;
  },
>(env: Env): Sentry.CloudflareOptions {
  const options = sentrySdkOptions({
    dsn: env.SENTRY_DSN,
    nodeEnv: env.NODE_ENV,
    environment: env.SENTRY_ENVIRONMENT ?? process.env.SENTRY_ENVIRONMENT,
    service: "web",
  });
  // `withSentry` still merges `env.SENTRY_DSN` when this callback returns
  // undefined, so development must return `enabled: false` explicitly.
  if (!options) return { enabled: false };
  return {
    dsn: options.dsn,
    environment: options.environment,
    tracesSampleRate: options.tracesSampleRate,
    sendDefaultPii: false,
    initialScope: { tags: { ...options.initialScope.tags } },
    beforeSend(event, hint) {
      return applySentryEventPolicy(event, hint);
    },
  };
}

export function withWorkerSentry<
  Env extends {
    readonly NODE_ENV?: string;
    readonly SENTRY_DSN?: string;
    readonly SENTRY_ENVIRONMENT?: string;
  },
  T,
>(handler: T): T {
  return Sentry.withSentry((env: Env) => cloudflareSentryOptions(env), handler);
}

/** No-op unless the SDK was initialized (dev stays console-only). */
export function captureWorkerError(cause: unknown, context?: Record<string, string>): void {
  if (!Sentry.getClient()) return;
  if (isExpectedFailure(cause)) return;
  if (context) {
    Sentry.getCurrentScope().setExtras(context);
  }
  Sentry.captureException(cause);
}
