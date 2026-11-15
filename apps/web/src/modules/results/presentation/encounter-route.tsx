"use client";

import { useScheduleChanges } from "@/modules/scheduling/presentation/schedule-change-queries.ts";
import { useDisputeReview } from "./dispute-review-queries.ts";
import { EncounterPageView, type CandidatesState, type EncounterState } from "./encounter-page.tsx";
import {
  isRefusal,
  useEncounterCandidatesQuery,
  useEncounterViewQuery,
} from "./encounter-queries.ts";
import { useTeamSelection } from "./team-selection-queries.ts";

type EncounterRouteProps = {
  readonly competitionId: string;
  readonly encounterId: string;
  readonly organizationId: string;
};

/**
 * The router keeps this component mounted when only the params change, so every draft,
 * acting side and pending or refused command lives below a key on the Encounter's
 * identity: moving to another Encounter starts clean, while errors and refetches of the
 * same one keep what the user typed.
 */
export function EncounterRoute(props: EncounterRouteProps) {
  const { competitionId, encounterId, organizationId } = props;
  return <EncounterBody key={`${organizationId}:${competitionId}:${encounterId}`} {...props} />;
}

function EncounterBody({ competitionId, encounterId, organizationId }: EncounterRouteProps) {
  const viewQuery = useEncounterViewQuery(organizationId, encounterId);
  const view = viewQuery.data;
  const belongsHere = view?.competition.id === competitionId;
  const scheduleChanges = useScheduleChanges(encounterId, belongsHere);
  const candidatesQuery = useEncounterCandidatesQuery(encounterId, belongsHere);
  const teamSelection = useTeamSelection({
    encounter: belongsHere ? view : undefined,
    encounterId,
    organizationId,
  });

  const disputeReview = useDisputeReview({
    encounter: belongsHere ? view : undefined,
    encounterId,
    organizationId,
  });

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
      disputeReview={disputeReview}
      scheduleChanges={scheduleChanges}
      teamSelection={teamSelection}
      competitionId={competitionId}
      encounter={encounter}
      organizationId={organizationId}
    />
  );
}
