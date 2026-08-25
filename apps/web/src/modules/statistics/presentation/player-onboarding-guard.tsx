"use client";

import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, colors } from "@futrob/ui";
import { useOnboardingStatusQuery } from "@/modules/identity/presentation/identity-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const styles = stylex.create({
  pending: {
    display: "flex",
    minHeight: "100svh",
    alignItems: "center",
    justifyContent: "center",
    paddingInline: "1.25rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
});

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
    <main {...applyStyles(styles.pending)}>{t("player.onboarding.checking")}</main>
  );
}
