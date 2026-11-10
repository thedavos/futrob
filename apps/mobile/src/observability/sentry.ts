import type { ComponentType } from "react";
import * as Sentry from "@sentry/react-native";
import { applySentryEventPolicy, isExpectedFailure, sentrySdkOptions } from "@futrob/logger";

/**
 * Sentry is production-only on native: DSN present and not `__DEV__`.
 * Expo Go and local Metro never send events. The actor id is the only user field.
 */

function nodeEnvForRuntime(): string {
  return __DEV__ ? "development" : "production";
}

export function initMobileSentry(): void {
  const options = sentrySdkOptions({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    nodeEnv: nodeEnvForRuntime(),
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
    service: "mobile",
  });
  if (!options) return;

  Sentry.init({
    dsn: options.dsn,
    environment: options.environment,
    tracesSampleRate: options.tracesSampleRate,
    sendDefaultPii: false,
    initialScope: { tags: { ...options.initialScope.tags } },
    beforeSend(event, hint) {
      return applySentryEventPolicy(event, hint);
    },
  });
}

export function bindSentryActor(actorId: string | null): void {
  if (!Sentry.getClient()) return;
  if (actorId) {
    Sentry.setUser({ id: actorId });
    return;
  }
  Sentry.setUser(null);
}

export function wrapRootLayout(component: ComponentType): ComponentType {
  return Sentry.wrap(component);
}

export function captureUnexpectedError(cause: unknown): void {
  if (!Sentry.getClient()) return;
  if (isExpectedFailure(cause)) return;
  Sentry.captureException(cause);
}
