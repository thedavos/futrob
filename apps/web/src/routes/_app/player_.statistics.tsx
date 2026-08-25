import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/public.stylex";
import { identityBrowserClient } from "@/modules/identity/presentation/identity-browser-client.ts";
import { PlayerStatisticsPage } from "@/modules/statistics/presentation/player-statistics-page.tsx";
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

export const Route = createFileRoute("/_app/player_/statistics")({
  component: ProtectedPlayerStatistics,
});

function ProtectedPlayerStatistics() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void identityBrowserClient
      .getOnboardingStatus()
      .then((status) => {
        if (cancelled) return;
        if (!status.completed) {
          void navigate({ to: "/onboarding", replace: true });
          return;
        }
        setAllowed(true);
      })
      .catch(() => {
        if (!cancelled) void navigate({ to: "/onboarding", replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!allowed) {
    return <main {...applyStyles(styles.pending)}>{t("player.onboarding.checking")}</main>;
  }

  return <PlayerStatisticsPage />;
}
