import { useQuery } from "@tanstack/react-query";
import type { EncounterViewDto, OfficialSelectionCommandResponse } from "@futrob/api-contracts";
import { RESULT_PERMISSION } from "@futrob/results";
import { allowedPermissionSet, getEffectiveAccess } from "@/context/permissions.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import type { DisputeReviewState } from "./dispute-review-section.tsx";
import type { OperatorIntent } from "./dispute-review-draft.ts";
import { officialSelectionBrowserClient } from "./official-selection-browser-client.ts";
import { useSelectionRead } from "./official-selection-queries.ts";
import type { Attempt } from "./selection-draft.ts";

const APPROVES_RESULTS = [RESULT_PERMISSION.resultApprove];

/**
 * The operator's review panel. It exists only once server capabilities for this
 * Encounter say the actor approves results; while that answer is loading or failed
 * nothing is read or rendered. The dossier read and every decision are still checked
 * by the server.
 */
export function useDisputeReview({
  encounter,
  encounterId,
  organizationId,
}: {
  /** Undefined until the Encounter is known to belong to the route's competition. */
  readonly encounter: EncounterViewDto | undefined;
  readonly encounterId: string;
  readonly organizationId: string;
}): DisputeReviewState {
  const scope = { organizationId, competitionId: encounter?.competition.id, encounterId };
  const access = useQuery({
    queryKey: queryKeys.authorization.effectiveAccess(scope, APPROVES_RESULTS),
    queryFn: () => getEffectiveAccess(scope, APPROVES_RESULTS),
    enabled: encounter !== undefined,
    staleTime: 30_000,
  });
  const operates =
    access.isSuccess && allowedPermissionSet(access.data).has(RESULT_PERMISSION.resultApprove);

  const read = useSelectionRead<OperatorIntent>({
    enabled: operates,
    queryKey: queryKeys.encounters.operatorSelection(organizationId, encounterId),
    read: (signal) =>
      officialSelectionBrowserClient().getOperatorOfficialSelection(organizationId, encounterId, {
        signal,
      }),
    send: (attempt) => sendDecision(organizationId, encounterId, attempt),
  });

  return operates ? { kind: "visible", read } : { kind: "hidden" };
}

function sendDecision(
  organizationId: string,
  encounterId: string,
  { intent, expectedVersion, commandKey }: Attempt<OperatorIntent>,
): Promise<OfficialSelectionCommandResponse> {
  const results = officialSelectionBrowserClient();
  const base = { expectedVersion, commandKey, reason: intent.reason };
  switch (intent.kind) {
    case "review_dispute":
      return results.reviewMatchDispute(organizationId, encounterId, base);
    case "approve_proposal":
      return results.resolveMatchDispute(organizationId, encounterId, {
        ...base,
        decision: intent.acknowledgeIntegrityFlags
          ? {
              type: "approve_proposal",
              proposalId: intent.proposalId,
              acknowledgeIntegrityFlags: true,
            }
          : { type: "approve_proposal", proposalId: intent.proposalId },
      });
    case "return_to_selection":
      return results.resolveMatchDispute(organizationId, encounterId, {
        ...base,
        decision: { type: "return_to_selection" },
      });
    default: {
      const exhaustive: never = intent;
      return exhaustive;
    }
  }
}
