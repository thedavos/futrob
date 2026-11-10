"use client";

import type { ErrorComponentProps } from "@tanstack/react-router";
import { captureWorkerError } from "@/observability/sentry.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { RouteLoadError } from "@/shared/presentation/route-load-state.tsx";

const reported = new WeakSet<object>();

export function reportUnexpectedRouteError(error: unknown): void {
  if (typeof error === "object" && error !== null) {
    if (reported.has(error)) return;
    reported.add(error);
  }
  captureWorkerError(error, { handler: "route-error" });
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
