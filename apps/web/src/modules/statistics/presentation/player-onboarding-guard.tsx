"use client";

import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useOnboardingStatusQuery } from "@/modules/identity/presentation/identity-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

export function PlayerOnboardingGuard({ children }: { readonly children: ReactNode }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const query = useOnboardingStatusQuery();
  const allowed = query.data?.completed === true;

  useEffect(() => {
    if (query.isError || (query.data !== undefined && !query.data.completed)) {
      void navigate({ to: "/onboarding", replace: true });
    }
  }, [navigate, query.data, query.isError]);

  return allowed ? (
    children
  ) : (
    <main className="flex min-h-svh items-center justify-center px-5 text-sm text-muted-foreground">
      {t("player.onboarding.checking")}
    </main>
  );
}
