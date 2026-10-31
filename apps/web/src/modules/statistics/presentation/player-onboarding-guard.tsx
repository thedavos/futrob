"use client";

import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useOnboardingStatusQuery } from "@/modules/identity/presentation/identity-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PendingScreen } from "@/shared/presentation/status-screen.tsx";

export function PlayerOnboardingGuard({ children }: { readonly children: ReactNode }) {
  const { t } = useI18n();
  const query = useOnboardingStatusQuery();
  const allowed = query.data?.completed === true;

  if (query.isError || (query.data !== undefined && !query.data.completed)) {
    return <Navigate replace to="/onboarding" />;
  }

  return allowed ? (
    children
  ) : (
    <PendingScreen message={t("player.onboarding.checking")} placement="region" />
  );
}
