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
  CompetitionParticipantInput,
  CreateCompetitionDraftRequest,
  ExploreCompetitionsQueryInput,
  UpdateCompetitionDraftRequest,
} from "@futrob/api-contracts";
import { exploreCompetitionsQuerySchema } from "@futrob/api-contracts";
import type { CoverSelection } from "@/modules/competitions/presentation/competition-profile-fields-value.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
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

export function useUpdateCompetitionDraftMutation(organizationId: string, competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCompetitionDraftRequest) =>
      updateCompetitionDraft(organizationId, competitionId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.competitions.draft(organizationId, competitionId),
      });
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
      ]);
    },
  });
}

export function useRemoveCompetitionParticipantMutation(
  organizationId: string,
  competitionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) =>
      removeCompetitionParticipant(organizationId, competitionId, entryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.competitions.participants(organizationId, competitionId),
      });
    },
  });
}

export function usePublishCompetitionMutation(organizationId: string, competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
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
