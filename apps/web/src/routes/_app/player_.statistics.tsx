import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PlayerStatisticsPage } from "@/modules/statistics/presentation/player-profile/player-statistics-page.tsx";
import {
  normalizePlayerStatisticsSearch,
  playerStatisticsSearchSchema,
} from "@/modules/statistics/presentation/player-profile/player-statistics-period.ts";

export const Route = createFileRoute("/_app/player_/statistics")({
  validateSearch: playerStatisticsSearchSchema,
  component: ProtectedPlayerStatistics,
});

function ProtectedPlayerStatistics() {
  const navigate = useNavigate();
  const period = normalizePlayerStatisticsSearch(Route.useSearch());

  return (
    <PlayerStatisticsPage
      onPeriodChange={(next) => {
        void navigate({
          to: "/player/statistics",
          search: next,
          replace: true,
        });
      }}
      period={period}
    />
  );
}
