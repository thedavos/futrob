"use client";

import { useMyAccessibleCompetitionsQuery } from "@/modules/competitions/presentation/competition-queries.ts";
import type { CompetitionEncountersFilters } from "./competition-encounters-model.ts";
import {
  CompetitionEncountersRoute,
  CompetitionEncountersStatus,
} from "./competition-encounters-page.tsx";

export function PlayerCompetitionMatchesRoute({
  competitionId,
  filters,
  onFiltersChange,
}: {
  readonly competitionId: string;
  readonly filters?: CompetitionEncountersFilters;
  readonly onFiltersChange?: (next: CompetitionEncountersFilters) => void;
}) {
  const query = useMyAccessibleCompetitionsQuery();
  const access = query.data?.competitions.find((item) => item.competition.id === competitionId);
  if (access) {
    return (
      <CompetitionEncountersRoute
        competitionId={competitionId}
        filters={filters}
        onFiltersChange={onFiltersChange}
        organizationId={access.competition.organizationId}
        page="competitionPlayer.matches"
      />
    );
  }
  return (
    <CompetitionEncountersStatus
      page="competitionPlayer.matches"
      state={
        query.isError
          ? { kind: "error", retry: () => void query.refetch() }
          : query.data
            ? { kind: "not_found" }
            : { kind: "loading" }
      }
    />
  );
}
