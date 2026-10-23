import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type {
  ApplyToCompetitionRequest,
  CompetitionDraftDto,
  CompetitionParticipantInput,
  CreateCompetitionDraftRequest,
  ExploreCompetitionsQueryInput,
  ListCompetitionParticipantsResponse,
  UpdateCompetitionDraftRequest,
} from "@futrob/api-contracts";
import { exploreCompetitionsQuerySchema } from "@futrob/api-contracts";
import type { CoverSelection } from "@/modules/competitions/presentation/competition-profile-fields-value.ts";
import { patchQueryData } from "@/shared/presentation/query/patch-query-data.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { readKeepingRefusal, refusalLabel } from "@/shared/presentation/query/stored-refusal.ts";
import {
  createCompetitionDraft,
  exploreCompetitions,
  getCompetitionDraft,
  getExploreCompetition,
  listMyAccessibleCompetitions,
  listOrganizationCompetitions,
  updateCompetitionDraft,
  listCompetitionParticipants,
  listOrganizationTeams,
  addCompetitionParticipant,
  removeCompetitionParticipant,
  publishCompetition,
  setCompetitionRegistration,
  uploadCompetitionCover,
  updateCompetitionCover,
  getMyCompetitionApplication,
  applyToCompetition,
  CompetitionsClientError,
} from "./competitions-browser-client.ts";

export function useExploreCompetitionsInfiniteQuery(query: ExploreCompetitionsQueryInput = {}) {
  const parsed = exploreCompetitionsQuerySchema.parse(query);
  type Page = Awaited<ReturnType<typeof exploreCompetitions>>;
  return useInfiniteQuery<
    Page,
    Error,
    InfiniteData<Page>,
    ReturnType<typeof queryKeys.competitions.explore>,
    string | undefined
  >({
    queryKey: queryKeys.competitions.explore(parsed),
    queryFn: ({ pageParam }) =>
      exploreCompetitions({
        ...parsed,
        cursor: pageParam,
      }),
    initialPageParam: undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}

export function useExploreCompetitionQuery(competitionId: string) {
  return useQuery({
    queryKey: queryKeys.competitions.exploreDetail(competitionId),
    queryFn: () => getExploreCompetition(competitionId),
    enabled: competitionId.length > 0,
  });
}

export function useMyCompetitionApplicationQuery(competitionId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.competitions.exploreApplication(competitionId),
    queryFn: () => getMyCompetitionApplication(competitionId),
    enabled: enabled && competitionId.length > 0,
  });
}

export function useApplyToCompetitionMutation(competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyToCompetitionRequest) => applyToCompetition(competitionId, input),
    onSuccess: async (application) => {
      queryClient.setQueryData(queryKeys.competitions.exploreApplication(competitionId), {
        application,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.competitions.exploreDetail(competitionId),
      });
    },
  });
}

export function useMyAccessibleCompetitionsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.competitions.mine(),
    queryFn: listMyAccessibleCompetitions,
    enabled,
  });
}

export function useOrganizationCompetitionsQuery(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.competitions.byOrganization(organizationId),
    queryFn: () => listOrganizationCompetitions(organizationId),
    enabled: organizationId.length > 0,
  });
}

export function useCompetitionParticipantsQuery(organizationId: string, competitionId: string) {
  return useQuery({
    queryKey: queryKeys.competitions.participants(organizationId, competitionId),
    queryFn: () => listCompetitionParticipants(organizationId, competitionId),
  });
}

export function useOrganizationTeamsQuery(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.competitions.teams(organizationId),
    queryFn: () => listOrganizationTeams(organizationId),
  });
}

/**
 * Commands that rewrite the stored draft share one scope, so they reach the server in the order
 * the organizer sent them: a background save always lands before a later publish or cover change.
 */
function draftScope(organizationId: string, competitionId: string) {
  return { id: `competition-draft:${organizationId}:${competitionId}` };
}

export function useUpdateCompetitionDraftMutation(organizationId: string, competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: draftScope(organizationId, competitionId),
    mutationFn: (input: UpdateCompetitionDraftRequest) =>
      updateCompetitionDraft(organizationId, competitionId, input),
    onSuccess: (draft) => {
      queryClient.setQueryData(queryKeys.competitions.draft(organizationId, competitionId), draft);
    },
  });
}

export function useAddCompetitionParticipantMutation(
  organizationId: string,
  competitionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompetitionParticipantInput) =>
      addCompetitionParticipant(organizationId, competitionId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.competitions.participants(organizationId, competitionId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.competitions.teams(organizationId) }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.competitionManagement(organizationId, competitionId),
        }),
      ]);
    },
  });
}

export function useRemoveCompetitionParticipantMutation(
  organizationId: string,
  competitionId: string,
) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.competitions.participants(organizationId, competitionId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.teams.competitionManagement(organizationId, competitionId),
      }),
    ]);
  return useMutation({
    mutationFn: (entryId: string) =>
      removeCompetitionParticipant(organizationId, competitionId, entryId),
    onMutate: async (entryId) => ({
      rollback: await patchQueryData<ListCompetitionParticipantsResponse>(
        queryClient,
        queryKeys.competitions.participants(organizationId, competitionId),
        {
          apply: (list) => ({
            ...list,
            participants: list.participants.filter((entry) => entry.id !== entryId),
          }),
          revert: (list, previous) => {
            const index = previous.participants.findIndex((entry) => entry.id === entryId);
            const removed = previous.participants[index];
            if (!removed || list.participants.some((entry) => entry.id === entryId)) return list;
            return {
              ...list,
              participants: [
                ...list.participants.slice(0, index),
                removed,
                ...list.participants.slice(index),
              ],
            };
          },
        },
      ),
    }),
    onError: (_error, _entryId, context) => {
      context?.rollback();
      void refresh();
    },
    onSuccess: refresh,
  });
}

export function usePublishCompetitionMutation(organizationId: string, competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: draftScope(organizationId, competitionId),
    mutationFn: () => publishCompetition(organizationId, competitionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.competitions.draft(organizationId, competitionId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.competitions.byOrganization(organizationId),
        }),
      ]);
    },
  });
}

export function useCompetitionRegistrationMutation(organizationId: string, competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: draftScope(organizationId, competitionId),
    mutationFn: (action: "open" | "close") =>
      setCompetitionRegistration(organizationId, competitionId, action),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.competitions.draft(organizationId, competitionId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.competitions.byOrganization(organizationId),
        }),
      ]);
    },
  });
}

export function useUpdateCompetitionCoverMutation(organizationId: string, competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: draftScope(organizationId, competitionId),
    mutationFn: async (cover: CoverSelection) => {
      const resolved =
        cover.kind === "file"
          ? {
              kind: "upload" as const,
              key: (
                await uploadCompetitionCover(
                  organizationId,
                  `${competitionId}-${Date.now()}`,
                  cover.file,
                )
              ).key,
            }
          : cover;
      return updateCompetitionCover(organizationId, competitionId, { cover: resolved });
    },
    onSuccess: async (draft) => {
      queryClient.setQueryData(queryKeys.competitions.draft(organizationId, competitionId), draft);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.competitions.byOrganization(organizationId),
      });
    },
  });
}

export function useCompetitionDraftQuery(organizationId: string, competitionId: string) {
  return useQuery({
    queryKey: queryKeys.competitions.draft(organizationId, competitionId),
    queryFn: () => getCompetitionDraft(organizationId, competitionId),
  });
}

export type CompetitionRulesRead =
  | { readonly kind: "rules"; readonly draft: CompetitionDraftDto }
  | { readonly kind: "refused"; readonly refusal: "forbidden" | "not_found" };

/**
 * The rules page keeps refusals as query values, so the cache's last successful read is the
 * refusal itself: a later transient error, or a remount, never brings back rules read before it.
 * Its own key keeps this shape apart from the setup page's draft cache.
 */
export function useCompetitionRulesQuery(organizationId: string, competitionId: string) {
  return useQuery({
    queryKey: queryKeys.competitions.rules(organizationId, competitionId),
    queryFn: async (): Promise<CompetitionRulesRead> => {
      const readResult = await readKeepingRefusal(
        () => getCompetitionDraft(organizationId, competitionId),
        (error) => (error instanceof CompetitionsClientError ? error.status : undefined),
      );
      if (readResult.outcome === "refused") {
        return { kind: "refused", refusal: refusalLabel(readResult.status) };
      }
      return { kind: "rules", draft: readResult.value };
    },
  });
}

/**
 * Uploads a chosen file first (keyed by `creationKey`), then creates the draft with the same key,
 * so retrying after a partial failure overwrites the object and returns the same draft.
 */
export function useCreateCompetitionDraftMutation(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      request,
      cover,
    }: {
      readonly request: CreateCompetitionDraftRequest & { readonly creationKey: string };
      readonly cover: CoverSelection;
    }) => {
      const resolved =
        cover.kind === "file"
          ? {
              kind: "upload" as const,
              key: (await uploadCompetitionCover(organizationId, request.creationKey, cover.file))
                .key,
            }
          : cover;
      return createCompetitionDraft(organizationId, { ...request, cover: resolved });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.competitions.byOrganization(organizationId),
      });
    },
  });
}
