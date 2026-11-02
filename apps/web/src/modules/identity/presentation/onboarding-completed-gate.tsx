"use client";

import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useOnboardingStatusQuery } from "@/modules/identity/presentation/identity-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { FailedScreen, PendingScreen } from "@/shared/presentation/status-screen.tsx";

/**
 * Authenticated destinations open only after onboarding is complete (FTR-AUTH-003). An
 * incomplete actor goes to onboarding even with memberships. A failed check offers a retry
 * instead of sending a finished actor back to onboarding.
 */
export function OnboardingCompletedGate({ children }: { readonly children: ReactNode }) {
  const { t } = useI18n();
  const query = useOnboardingStatusQuery();

  if (query.data?.completed === true) return children;
  if (query.data !== undefined) return <Navigate replace to="/onboarding" />;
  if (query.isError) {
    return (
      <FailedScreen
        description={t("onboarding.loading.errorDescription")}
        onRetry={() => void query.refetch()}
        placement="region"
        retryLabel={t("common.retry")}
        title={t("player.onboarding.failed")}
      />
    );
  }
  return <PendingScreen message={t("player.onboarding.checking")} placement="region" />;
}
