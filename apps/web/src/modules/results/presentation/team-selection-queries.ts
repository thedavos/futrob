import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { EncounterViewDto, OfficialSelectionCommandResponse } from "@futrob/api-contracts";
import { RESULT_PERMISSION } from "@futrob/results";
import { allowedPermissionSet, getEffectiveAccess } from "@/context/permissions.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { officialSelectionBrowserClient } from "./official-selection-browser-client.ts";
import { useSelectionRead } from "./official-selection-queries.ts";
import type { Attempt } from "./selection-draft.ts";
import type { TeamIntent } from "./team-selection-draft.ts";
import type { TeamSelectionState, TeamSide } from "./team-selection-section.tsx";

const SIDES: readonly TeamSide[] = ["home", "away"];
const SPEAKS_FOR_TEAM = [RESULT_PERMISSION.officialSelectionPropose];

/**
 * The Team panel for the signed-in actor. Which side the actor speaks for comes from
 * server capabilities scoped to each Team of the Encounter; the selection read and
 * every command still pass the server's representation check.
 */
export function useTeamSelection({
  encounter,
  encounterId,
  organizationId,
}: {
  /** Undefined until the Encounter is known to belong to the route's competition. */
  readonly encounter: EncounterViewDto | undefined;
  readonly encounterId: string;
  readonly organizationId: string;
}): TeamSelectionState {
  const [chosen, setChosen] = useState<TeamSide | null>(null);
  const access = useQueries({
    queries: (encounter ? SIDES : []).map((side) => {
      const scope = {
        organizationId,
        competitionId: encounter?.competition.id,
        teamId: encounter?.[side].teamId,
        encounterId,
      };
      return {
        queryKey: queryKeys.authorization.effectiveAccess(scope, SPEAKS_FOR_TEAM),
        queryFn: () => getEffectiveAccess(scope, SPEAKS_FOR_TEAM),
        staleTime: 30_000,
      };
    }),
  });
  const sides = SIDES.filter((_, index) => {
    const answer = access[index];
    return answer?.isSuccess && allowedPermissionSet(answer.data).has(SPEAKS_FOR_TEAM[0]!);
  });
  const side = chosen && sides.includes(chosen) ? chosen : (sides[0] ?? null);
  const actingTeamId = encounter && side ? encounter[side].teamId : "";

  const read = useSelectionRead<TeamIntent>({
    enabled: actingTeamId !== "",
    queryKey: queryKeys.encounters.officialSelection(organizationId, encounterId, actingTeamId),
    read: (signal) =>
      officialSelectionBrowserClient().getTeamOfficialSelection(
        organizationId,
        encounterId,
        { actingTeamId },
        { signal },
      ),
    send: (attempt) => sendCommand(organizationId, encounterId, actingTeamId, attempt),
  });

  const settled = access.every((answer) => answer.isSuccess || answer.isError);
  if (!settled || !side || !actingTeamId) return { kind: "hidden" };
  return { kind: "visible", acting: { side, sides, choose: setChosen }, read };
}

function sendCommand(
  organizationId: string,
  encounterId: string,
  actingTeamId: string,
  { intent, expectedVersion, commandKey }: Attempt<TeamIntent>,
): Promise<OfficialSelectionCommandResponse> {
  const results = officialSelectionBrowserClient();
  const base = { actingTeamId, expectedVersion, commandKey };
  switch (intent.kind) {
    case "propose":
      return results.proposeOfficialSelection(organizationId, encounterId, {
        ...base,
        selections: [...intent.selections],
      });
    case "confirm":
      return results.confirmOfficialSelection(organizationId, encounterId, intent.proposalId, base);
    case "reject":
      return results.rejectOfficialSelection(organizationId, encounterId, intent.proposalId, {
        ...base,
        reason: intent.reason,
      });
    case "propose_alternative":
      return results.proposeAlternativeOfficialSelection(
        organizationId,
        encounterId,
        intent.proposalId,
        { ...base, selections: [...intent.selections], reason: intent.reason },
      );
    case "open_dispute":
      return results.openMatchDispute(organizationId, encounterId, {
        ...base,
        reason: intent.reason,
      });
    default: {
      const exhaustive: never = intent;
      return exhaustive;
    }
  }
}
