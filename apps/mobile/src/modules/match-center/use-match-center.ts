import { useRef, useState } from "react";
import { useQueries, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type {
  AuthorizationScopeDto,
  EncounterViewDto,
  ListEncounterCandidatesResponse,
  OfficialSelectionCommandResponse,
  OfficialSelectionViewDto,
  PermissionDto,
} from "@futrob/api-contracts";
import {
  beginAttempt,
  commandOutcomeOf,
  isSelectionRefusal,
  type Attempt,
  type CommandOutcome,
  type LifecycleEvent,
  type OperatorIntent,
  type SelectionRead,
  type Submission,
  type TeamIntent,
} from "@futrob/sdk";
import { randomUUID } from "expo-crypto";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { allowedPermissionSet, MOBILE_PERMISSION } from "@/modules/authorization/permissions";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";

export type TeamSide = "home" | "away";

export type EncounterState =
  | { readonly kind: "loading" }
  | { readonly kind: "not_found" }
  | { readonly kind: "error"; readonly retry: () => void; readonly retrying: boolean }
  | { readonly kind: "ready"; readonly view: EncounterViewDto };

export type CandidatesState =
  | { readonly kind: "loading" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly retry: () => void; readonly retrying: boolean }
  | {
      readonly kind: "ready";
      readonly data: ListEncounterCandidatesResponse;
      readonly updatedAt: number;
      readonly refreshing: boolean;
      readonly refreshFailed: boolean;
      readonly refresh: () => void;
    };

/** `hidden` covers both «not a representative» and «not known yet»: nothing renders. */
export type TeamPanelState =
  | { readonly kind: "hidden" }
  | {
      readonly kind: "visible";
      readonly side: TeamSide;
      /** Sides the actor's server capabilities say it speaks for. */
      readonly sides: readonly TeamSide[];
      readonly choose: (side: TeamSide) => void;
      readonly read: SelectionRead<TeamIntent>;
    };

export type ReviewPanelState =
  | { readonly kind: "hidden" }
  | { readonly kind: "visible"; readonly read: SelectionRead<OperatorIntent> };

export interface MatchCenter {
  readonly encounter: EncounterState;
  readonly candidates: CandidatesState;
  readonly team: TeamPanelState;
  readonly review: ReviewPanelState;
}

const SIDES: readonly TeamSide[] = ["home", "away"];
const PROPOSE = MOBILE_PERMISSION.encountersOfficialSelectionPropose;
const APPROVE = MOBILE_PERMISSION.encountersResultsApprove;

/**
 * 403 and 404 are refusals, never retried or shown as «no data». A 401 ends the session in the
 * transport (`getFutrobClient`), and only when the rejected bearer is still the stored one.
 */
const retryUnlessRefused = (attempt: number, error: Error) =>
  !isSelectionRefusal(error) && attempt < 2;

/**
 * The Match Center of one Encounter, read like web's Encounter route: candidates and both
 * selection panels load only once the Encounter is known to belong to the competition in the
 * URL. Which panels exist comes from `EffectiveAccess`; the API authorizes every read and
 * command again.
 */
export function useMatchCenter({
  organizationId,
  competitionId,
  encounterId,
}: {
  readonly organizationId: string;
  readonly competitionId: string;
  readonly encounterId: string;
}): MatchCenter {
  const generation = useSessionGeneration();
  const queryClient = useQueryClient();
  const [chosenSide, setChosenSide] = useState<TeamSide | null>(null);

  const viewQuery = useQuery({
    queryKey: mobileQueryKeys.encounterView(generation, organizationId, encounterId),
    queryFn: ({ signal }) =>
      getFutrobClient().encounters.getView(organizationId, encounterId, { signal }),
    retry: retryUnlessRefused,
  });
  const view = viewQuery.data;
  const belongsHere = view?.competition.id === competitionId;

  const candidatesQuery = useQuery({
    queryKey: mobileQueryKeys.encounterCandidates(generation, encounterId),
    queryFn: ({ signal }) =>
      getFutrobClient().results.listEncounterCandidates(encounterId, { signal }),
    enabled: belongsHere,
    retry: retryUnlessRefused,
  });

  const accessQuery = (teamId: string | null, permission: PermissionDto) => ({
    queryKey: mobileQueryKeys.encounterAccess(generation, encounterId, teamId, permission),
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const scope: AuthorizationScopeDto = { organizationId, competitionId, encounterId };
      if (teamId) scope.teamId = teamId;
      const access = await getFutrobClient().authorization.getEffectiveAccess(scope, [permission], {
        signal,
      });
      return allowedPermissionSet(access).has(permission);
    },
    enabled: belongsHere,
    retry: false,
    staleTime: 30_000,
  });
  const sideAccess = useQueries({
    queries: SIDES.map((side) => accessQuery(belongsHere ? view[side].teamId : null, PROPOSE)),
  });
  const reviewAccess = useQuery(accessQuery(null, APPROVE));

  const sides = SIDES.filter((_, index) => sideAccess[index]?.data === true);
  const side = chosenSide && sides.includes(chosenSide) ? chosenSide : (sides[0] ?? null);
  const actingTeamId = belongsHere && side ? view[side].teamId : "";

  const reread = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.encounters(generation) }),
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.playerHomes(generation) }),
    ]);
  };
  const results = () => getFutrobClient().results;

  const teamRead = useSelectionRead<TeamIntent>({
    enabled: actingTeamId !== "",
    queryKey: mobileQueryKeys.teamSelection(generation, organizationId, encounterId, actingTeamId),
    read: (signal) =>
      results().getTeamOfficialSelection(organizationId, encounterId, { actingTeamId }, { signal }),
    send: ({ intent, expectedVersion, commandKey }) => {
      const base = { actingTeamId, expectedVersion, commandKey };
      switch (intent.kind) {
        case "propose":
          return results().proposeOfficialSelection(organizationId, encounterId, {
            ...base,
            selections: [...intent.selections],
          });
        case "confirm":
          return results().confirmOfficialSelection(
            organizationId,
            encounterId,
            intent.proposalId,
            base,
          );
        case "reject":
          return results().rejectOfficialSelection(organizationId, encounterId, intent.proposalId, {
            ...base,
            reason: intent.reason,
          });
        case "propose_alternative":
          return results().proposeAlternativeOfficialSelection(
            organizationId,
            encounterId,
            intent.proposalId,
            { ...base, selections: [...intent.selections], reason: intent.reason },
          );
        case "open_dispute":
          return results().openMatchDispute(organizationId, encounterId, {
            ...base,
            reason: intent.reason,
          });
        default: {
          const exhaustive: never = intent;
          return exhaustive;
        }
      }
    },
    reread,
  });

  const operates = reviewAccess.data === true;
  const reviewRead = useSelectionRead<OperatorIntent>({
    enabled: operates,
    queryKey: mobileQueryKeys.operatorSelection(generation, organizationId, encounterId),
    read: (signal) =>
      results().getOperatorOfficialSelection(organizationId, encounterId, { signal }),
    send: ({ intent, expectedVersion, commandKey }) => {
      const base = { expectedVersion, commandKey, reason: intent.reason };
      switch (intent.kind) {
        case "review_dispute":
          return results().reviewMatchDispute(organizationId, encounterId, base);
        case "approve_proposal":
          return results().resolveMatchDispute(organizationId, encounterId, {
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
          return results().resolveMatchDispute(organizationId, encounterId, {
            ...base,
            decision: { type: "return_to_selection" },
          });
        default: {
          const exhaustive: never = intent;
          return exhaustive;
        }
      }
    },
    reread,
  });

  const encounter: EncounterState = (() => {
    if (viewQuery.isError && !view) {
      return isSelectionRefusal(viewQuery.error)
        ? { kind: "not_found" }
        : {
            kind: "error",
            retry: () => void viewQuery.refetch(),
            retrying: viewQuery.isFetching,
          };
    }
    if (!view) return { kind: "loading" };
    if (!belongsHere) return { kind: "not_found" };
    return { kind: "ready", view };
  })();

  const candidates: CandidatesState = (() => {
    if (candidatesQuery.isError && isSelectionRefusal(candidatesQuery.error)) {
      return { kind: "forbidden" };
    }
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
      return {
        kind: "error",
        retry: () => void candidatesQuery.refetch(),
        retrying: candidatesQuery.isFetching,
      };
    }
    return { kind: "loading" };
  })();

  const team: TeamPanelState =
    side && actingTeamId
      ? { kind: "visible", side, sides, choose: setChosenSide, read: teamRead }
      : { kind: "hidden" };
  const review: ReviewPanelState = operates
    ? { kind: "visible", read: reviewRead }
    : { kind: "hidden" };

  return { encounter, candidates, team, review };
}

/**
 * One persisted selection read plus the command path both panels share: a conflict reloads
 * the read, and every settled command rereads the Encounter views and the player's home.
 */
function useSelectionRead<Intent>({
  enabled,
  queryKey,
  read: load,
  send,
  reread,
}: {
  readonly enabled: boolean;
  readonly queryKey: QueryKey;
  readonly read: (signal: AbortSignal) => Promise<OfficialSelectionViewDto>;
  readonly send: (attempt: Attempt<Intent>) => Promise<OfficialSelectionCommandResponse>;
  readonly reread: () => Promise<void>;
}): SelectionRead<Intent> {
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => load(signal),
    enabled,
    retry: retryUnlessRefused,
  });
  const refresh = () => void query.refetch();

  if (query.isError && isSelectionRefusal(query.error)) return { kind: "forbidden" };
  if (query.data) {
    return {
      kind: "ready",
      view: query.data,
      refreshing: query.isFetching,
      refreshFailed: query.isRefetchError,
      refresh,
      submit: async (attempt): Promise<CommandOutcome> => {
        try {
          await send(attempt);
        } catch (error) {
          const outcome =
            error instanceof Error
              ? commandOutcomeOf(error)
              : ({ ok: false, failure: "unknown", code: null } as const);
          if (!outcome.ok && outcome.failure === "conflict") await query.refetch();
          return outcome;
        }
        await reread();
        return { ok: true };
      },
    };
  }
  if (query.isError) return { kind: "error", retry: refresh };
  return { kind: "loading" };
}

/**
 * Sends an intent as at most one attempt at a time. The ref closes the gap between a second
 * tap and the render that disables the button; the draft decides the key (SDK `beginAttempt`).
 */
export function useCommandAttempt<Command extends string, Intent>(
  dispatch: (event: LifecycleEvent<Command, Intent>) => void,
) {
  const inFlight = useRef(false);
  return function send(
    submission: Submission<Intent>,
    intent: Intent,
    readVersion: number,
    submit: (attempt: Attempt<Intent>) => Promise<CommandOutcome>,
  ) {
    if (inFlight.current) return;
    const attempt = beginAttempt(submission, intent, readVersion, randomUUID());
    if (!attempt) return;
    inFlight.current = true;
    dispatch({ type: "started", attempt });
    void submit(attempt)
      .catch((): CommandOutcome => ({ ok: false, failure: "unknown", code: null }))
      .then((outcome) => {
        inFlight.current = false;
        dispatch({ type: "settled", outcome });
      });
  };
}

/** The competition's open disputes, for operators; refusals are not retried. */
export function useCompetitionDisputes(organizationId: string, competitionId: string) {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.competitionDisputes(generation, organizationId, competitionId),
    queryFn: ({ signal }) =>
      getFutrobClient().results.listCompetitionDisputes(organizationId, competitionId, {
        signal,
      }),
    retry: retryUnlessRefused,
  });
}
