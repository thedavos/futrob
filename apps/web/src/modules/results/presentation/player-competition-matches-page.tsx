"use client";

import { useMyAccessibleCompetitionsQuery } from "@/modules/competitions/presentation/competition-queries.ts";
import {
  CompetitionEncountersRoute,
  CompetitionEncountersStatus,
} from "./competition-encounters-page.tsx";

export function PlayerCompetitionMatchesRoute({
  competitionId,
}: {
  readonly competitionId: string;
}) {
  const query = useMyAccessibleCompetitionsQuery();
  const access = query.data?.competitions.find((item) => item.competition.id === competitionId);
  if (access) {
    return (
      <CompetitionEncountersRoute
        competitionId={competitionId}
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
