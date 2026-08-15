import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { identityBrowserClient } from "@/modules/identity/presentation/identity-browser-client.ts";
import { PlayerMatchesPage } from "@/modules/statistics/presentation/player-matches-page.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const playerMatchesSearchSchema = z.object({
  view: z.enum(["recent", "league", "playoff", "friendly", "all"]).optional(),
});

export const Route = createFileRoute("/_app/player_/matches")({
  validateSearch: playerMatchesSearchSchema,
  component: ProtectedPlayerMatches,
});

function ProtectedPlayerMatches() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { view } = Route.useSearch();
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
    <PlayerMatchesPage
      onViewChange={(next) => {
        void navigate({
          to: "/player/matches",
          search: { view: next },
          replace: true,
        });
      }}
      view={view ?? "recent"}
    />
  ) : (
    <main className="flex min-h-svh items-center justify-center px-5 text-sm text-muted-foreground">
      {t("player.onboarding.checking")}
    </main>
  );
}
