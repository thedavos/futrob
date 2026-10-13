"use client";

import { EncounterPageView, type CandidatesState, type EncounterState } from "./encounter-page.tsx";
import {
  isRefusal,
  useEncounterCandidatesQuery,
  useEncounterViewQuery,
} from "./encounter-queries.ts";

export function EncounterRoute({
  competitionId,
  encounterId,
  organizationId,
}: {
  readonly competitionId: string;
  readonly encounterId: string;
  readonly organizationId: string;
}) {
  const viewQuery = useEncounterViewQuery(organizationId, encounterId);
  const view = viewQuery.data;
  const belongsHere = view?.competition.id === competitionId;
  const candidatesQuery = useEncounterCandidatesQuery(encounterId, belongsHere);

  const encounter: EncounterState = (() => {
    if (viewQuery.isError) {
      return { kind: isRefusal(viewQuery.error) ?? "error", retry: () => void viewQuery.refetch() };
    }
    if (!view) return { kind: "loading" };
    if (!belongsHere) return { kind: "not_found" };
    return { kind: "ready", view };
  })();

  const candidates: CandidatesState = (() => {
    if (candidatesQuery.isError && isRefusal(candidatesQuery.error)) return { kind: "forbidden" };
    if (candidatesQuery.data) {
      return {
        kind: "ready",
        data: candidatesQuery.data,
        updatedAt: candidatesQuery.dataUpdatedAt,
        refreshing: candidatesQuery.isFetching,
        refreshFailed: candidatesQuery.isRefetchError,
        refresh: () => void candidatesQuery.refetch(),
      };
    }
    if (candidatesQuery.isError) {
      return { kind: "error", retry: () => void candidatesQuery.refetch() };
    }
    return { kind: "loading" };
  })();

  return (
    <EncounterPageView
      candidates={candidates}
      competitionId={competitionId}
      encounter={encounter}
      organizationId={organizationId}
    />
  );
}
