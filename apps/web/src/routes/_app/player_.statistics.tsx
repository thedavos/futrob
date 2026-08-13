import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { identityBrowserClient } from "@/modules/identity/presentation/identity-browser-client.ts";
import { PlayerStatisticsPage } from "@/modules/statistics/presentation/player-statistics-page.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

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

  return allowed ? (
    <PlayerStatisticsPage />
  ) : (
    <main className="flex min-h-svh items-center justify-center px-5 text-sm text-muted-foreground">
      {t("player.onboarding.checking")}
    </main>
  );
}
