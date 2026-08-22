import * as Sentry from "@sentry/cloudflare";
import { z } from "zod";

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

export function withWorkerSentry<
  Env extends { readonly NODE_ENV?: string; readonly SENTRY_DSN?: string },
  T,
>(handler: T): T {
  return Sentry.withSentry((env: Env) => {
    if (!env.SENTRY_DSN || env.NODE_ENV !== "production") return undefined;
    return {
      dsn: env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT ?? "production",
      tracesSampleRate: 0.1,
    } satisfies Partial<Sentry.CloudflareOptions>;
  }, handler);
}

/** Expected failures carry a stable wire `code`; those stay local. */
const expectedFailureSchema = z.object({ code: z.string() }).passthrough();

/** No-op unless the SDK was initialized (dev stays console-only). */
export function captureWorkerError(cause: unknown, context?: Record<string, string>): void {
  if (!Sentry.getClient()) return;
  if (expectedFailureSchema.safeParse(cause).success) return;
  if (context) {
    Sentry.getCurrentScope().setExtras(context);
  }
  Sentry.captureException(cause);
}
