import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CompetitionParticipantInput,
  CreateCompetitionDraftRequest,
  UpdateCompetitionDraftRequest,
} from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  createCompetitionDraft,
  getCompetitionDraft,
  listOrganizationCompetitions,
  updateCompetitionDraft,
  listCompetitionParticipants,
  listOrganizationTeams,
  addCompetitionParticipant,
  removeCompetitionParticipant,
  publishCompetition,
} from "./competitions-browser-client.ts";

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

export function useCompetitionDraftQuery(organizationId: string, competitionId: string) {
  return useQuery({
    queryKey: queryKeys.competitions.draft(organizationId, competitionId),
    queryFn: () => getCompetitionDraft(organizationId, competitionId),
  });
}

export function useCreateCompetitionDraftMutation(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompetitionDraftRequest) =>
      createCompetitionDraft(organizationId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.competitions.byOrganization(organizationId),
      });
    },
  });
}
