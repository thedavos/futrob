import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AcceptScheduleChangeProposalRequest,
  CounterScheduleChangeProposalRequest,
  CreateScheduleChangeRequestBody,
  EncounterViewDto,
  RejectScheduleChangeProposalRequest,
  ResolveScheduleChangeRequestBody,
  ScheduleChangeCreationOptionsDto,
  ScheduleChangeRequestDto,
} from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { onProductUnauthorized } from "@/modules/identity/session-lifecycle";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";

export interface ProposalTarget {
  readonly requestId: string;
  readonly proposalId: string;
}

/** Every command rereads the Encounter, its requests and the player's next Encounter. */
export interface ScheduleChangeCommands {
  readonly create: (body: CreateScheduleChangeRequestBody) => Promise<void>;
  readonly accept: (
    target: ProposalTarget,
    body: AcceptScheduleChangeProposalRequest,
  ) => Promise<void>;
  readonly reject: (
    target: ProposalTarget,
    body: RejectScheduleChangeProposalRequest,
  ) => Promise<void>;
  readonly counter: (
    target: ProposalTarget,
    body: CounterScheduleChangeProposalRequest,
  ) => Promise<void>;
  readonly resolve: (requestId: string, body: ResolveScheduleChangeRequestBody) => Promise<void>;
}

export type EncounterState =
  | { readonly kind: "loading" }
  | { readonly kind: "not_found" }
  | { readonly kind: "error"; readonly retry: () => void; readonly retrying: boolean }
  | { readonly kind: "ready"; readonly view: EncounterViewDto };

export type ScheduleChangesState =
  | { readonly kind: "loading" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly retry: () => void; readonly retrying: boolean }
  | {
      readonly kind: "ready";
      readonly requests: readonly ScheduleChangeRequestDto[];
      readonly creation: ScheduleChangeCreationOptionsDto;
      readonly refreshing: boolean;
      readonly refreshFailed: boolean;
      readonly refresh: () => void;
      readonly commands: ScheduleChangeCommands;
    };

export interface EncounterScheduleChanges {
  readonly encounter: EncounterState;
  readonly changes: ScheduleChangesState;
}

/** 401 ends the session; 403 and 404 are refusals, never retried or shown as «no data». */
const isRefusal = (error: Error | null) =>
  error instanceof FutrobApiError && [401, 403, 404].includes(error.status);

async function read<Result>(load: () => Promise<Result>): Promise<Result> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof FutrobApiError && error.status === 401) {
      await onProductUnauthorized(() => undefined);
    }
    throw error;
  }
}

/**
 * The Encounter and its schedule change requests, read like web's Encounter route: requests load
 * only once the Encounter is known to belong to the competition in the URL.
 */
export function useEncounterScheduleChanges({
  organizationId,
  competitionId,
  encounterId,
}: {
  readonly organizationId: string;
  readonly competitionId: string;
  readonly encounterId: string;
}): EncounterScheduleChanges {
  const generation = useSessionGeneration();
  const client = useQueryClient();
  const viewQuery = useQuery({
    queryKey: mobileQueryKeys.encounterView(generation, organizationId, encounterId),
    queryFn: ({ signal }) =>
      read(() => getFutrobClient().encounters.getView(organizationId, encounterId, { signal })),
    retry: (attempt, error) => !isRefusal(error) && attempt < 2,
  });
  const view = viewQuery.data;
  const belongsHere = view?.competition.id === competitionId;
  const listQuery = useQuery({
    queryKey: mobileQueryKeys.scheduleChanges(generation, encounterId),
    queryFn: ({ signal }) =>
      read(() => getFutrobClient().encounters.listScheduleChangeRequests(encounterId, { signal })),
    enabled: belongsHere,
    retry: (attempt, error) => !isRefusal(error) && attempt < 2,
  });

  const encounter: EncounterState = (() => {
    if (viewQuery.isError && !view) {
      return isRefusal(viewQuery.error)
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

  const changes: ScheduleChangesState = (() => {
    if (isRefusal(listQuery.error)) return { kind: "forbidden" };
    if (listQuery.data) {
      // Success or failure, the Encounter and the list must show what the server now holds.
      const reread = () =>
        Promise.all([
          client.invalidateQueries({ queryKey: mobileQueryKeys.encounters(generation) }),
          client.invalidateQueries({ queryKey: mobileQueryKeys.playerHomes(generation) }),
        ]);
      const run = async <Result>(command: () => Promise<Result>): Promise<void> => {
        try {
          await command();
        } catch (error) {
          // The form hears about the failure now; the reread must not hold it back.
          void reread();
          throw error;
        }
        await reread();
      };
      const api = getFutrobClient().encounters;
      return {
        kind: "ready",
        requests: listQuery.data.requests,
        creation: listQuery.data.creation,
        refreshing: listQuery.isFetching,
        refreshFailed: listQuery.isRefetchError,
        refresh: () => void listQuery.refetch(),
        commands: {
          create: (body) => run(() => api.createScheduleChangeRequest(encounterId, body)),
          accept: (target, body) =>
            run(() => api.acceptScheduleChangeProposal({ encounterId, ...target }, body)),
          reject: (target, body) =>
            run(() => api.rejectScheduleChangeProposal({ encounterId, ...target }, body)),
          counter: (target, body) =>
            run(() => api.counterScheduleChangeProposal({ encounterId, ...target }, body)),
          resolve: (requestId, body) =>
            run(() => api.resolveScheduleChangeRequest(encounterId, requestId, body)),
        },
      };
    }
    if (listQuery.isError) {
      return {
        kind: "error",
        retry: () => void listQuery.refetch(),
        retrying: listQuery.isFetching,
      };
    }
    return { kind: "loading" };
  })();

  return { encounter, changes };
}
