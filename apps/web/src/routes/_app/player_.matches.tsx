import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { identityBrowserClient } from "@/modules/identity/presentation/identity-browser-client.ts";
import { PlayerMatchesPage } from "@/modules/statistics/presentation/player-matches-page.tsx";
import {
  MATCH_SORT_ORDERS,
  PLAYER_MATCHES_VIEWS,
  type MatchSortOrder,
  type PlayerMatchesView,
} from "@/modules/statistics/presentation/player-match-view.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const playerMatchesSearchSchema = z.object({
  view: z.preprocess(
    (value) => (value === "recent" ? "all" : value),
    z.enum(PLAYER_MATCHES_VIEWS).optional(),
  ),
  sort: z.enum(MATCH_SORT_ORDERS).optional(),
});

export const Route = createFileRoute("/_app/player_/matches")({
  validateSearch: playerMatchesSearchSchema,
  component: ProtectedPlayerMatches,
});

function playerMatchesSearch(view: PlayerMatchesView, sort: MatchSortOrder) {
  return { view, sort };
}

function ProtectedPlayerMatches() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { view, sort } = Route.useSearch();
  const [allowed, setAllowed] = useState(false);
  const activeView = view ?? "all";
  const sortOrder = sort ?? "newest";

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
      onSortChange={(next) => {
        void navigate({
          to: "/player/matches",
          search: playerMatchesSearch(activeView, next),
          replace: true,
        });
      }}
      onViewChange={(next) => {
        void navigate({
          to: "/player/matches",
          search: playerMatchesSearch(next, sortOrder),
          replace: true,
        });
      }}
      sortOrder={sortOrder}
      view={activeView}
    />
  ) : (
    <main className="flex min-h-svh items-center justify-center px-5 text-sm text-muted-foreground">
      {t("player.onboarding.checking")}
    </main>
  );
}
