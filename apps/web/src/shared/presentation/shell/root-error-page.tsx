"use client";

import type { ErrorComponentProps } from "@tanstack/react-router";
import { captureWorkerError } from "@/observability/sentry.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { RouteLoadError } from "@/shared/presentation/route-load-state.tsx";

const reported = new WeakSet<object>();

export function reportUnexpectedRouteError(cause: unknown): void {
  try {
    // SAFETY: WeakSet only accepts objects; add/has throw for primitives, which the catch reports.
    const token = cause as object;
    if (reported.has(token)) return;
    reported.add(token);
  } catch {
    // Primitive causes cannot be interned; still report them.
  }
  captureWorkerError(cause, { handler: "route-error" });
}

export function RootErrorPage(props: ErrorComponentProps) {
  reportUnexpectedRouteError(props.error);
  const { t } = useI18n();
  return (
    <RouteLoadError
      {...props}
      description={t("routeError.description")}
      title={t("routeError.title")}
    />
  );
}
