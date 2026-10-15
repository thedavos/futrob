import { useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EncounterViewDto, OfficialSelectionCommandResponse } from "@futrob/api-contracts";
import { RESULT_PERMISSION } from "@futrob/results";
import { FutrobApiError } from "@futrob/sdk";
import { allowedPermissionSet, getEffectiveAccess } from "@/context/permissions.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { officialSelectionBrowserClient } from "./official-selection-browser-client.ts";
import type { Attempt, CommandOutcome, Failure } from "./selection-draft.ts";
import type { TeamSelectionState, TeamSide } from "./team-selection-section.tsx";

const SIDES: readonly TeamSide[] = ["home", "away"];
const SPEAKS_FOR_TEAM = [RESULT_PERMISSION.officialSelectionPropose];

const isRefusal = (error: Error | null) =>
  error instanceof FutrobApiError && [401, 403, 404].includes(error.status);

/** Network failures and 5xx leave the outcome unknown: the server may have applied it. */
function failureOf(error: Error): Failure {
  if (!(error instanceof FutrobApiError)) return "unknown";
  if (error.status === 409) return "conflict";
  if (isRefusal(error)) return "refused";
  if (error.status === 400 || error.status === 422) return "invalid";
  return "unknown";
}

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
  const queryClient = useQueryClient();
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
  const actingTeamId = encounter && side ? encounter[side].teamId : null;

  const query = useQuery({
    queryKey: queryKeys.encounters.officialSelection(
      organizationId,
      encounterId,
      actingTeamId ?? "",
    ),
    queryFn: ({ signal }) =>
      officialSelectionBrowserClient().getTeamOfficialSelection(
        organizationId,
        encounterId,
        { actingTeamId: actingTeamId ?? "" },
        { signal },
      ),
    enabled: actingTeamId !== null,
    retry: (failureCount, error) => !isRefusal(error) && failureCount < 2,
  });

  const settled = access.every((answer) => answer.isSuccess || answer.isError);
  if (!settled || !side || !actingTeamId) return { kind: "hidden" };
  const acting = { side, sides, choose: setChosen };
  const refresh = () => void query.refetch();

  if (query.isError && isRefusal(query.error))
    return { kind: "visible", acting, read: { kind: "forbidden" } };
  if (query.data) {
    return {
      kind: "visible",
      acting,
      read: {
        kind: "ready",
        view: query.data,
        actingTeamId,
        refreshing: query.isFetching,
        refreshFailed: query.isRefetchError,
        refresh,
        submit: async (attempt: Attempt): Promise<CommandOutcome> => {
          try {
            await sendCommand(organizationId, encounterId, actingTeamId, attempt);
          } catch (error) {
            const failure = error instanceof Error ? failureOf(error) : "unknown";
            if (failure === "conflict") await query.refetch();
            return {
              ok: false,
              failure,
              code: error instanceof FutrobApiError ? error.code : null,
            };
          }
          await queryClient.invalidateQueries({ queryKey: queryKeys.encounters.all });
          return { ok: true };
        },
      },
    };
  }
  if (query.isError) return { kind: "visible", acting, read: { kind: "error", retry: refresh } };
  return { kind: "visible", acting, read: { kind: "loading" } };
}

function sendCommand(
  organizationId: string,
  encounterId: string,
  actingTeamId: string,
  { intent, expectedVersion, commandKey }: Attempt,
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
