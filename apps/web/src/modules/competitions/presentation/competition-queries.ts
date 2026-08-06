import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateCompetitionDraftRequest } from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  createCompetitionDraft,
  getCompetitionDraft,
  listOrganizationCompetitions,
} from "./competitions-browser-client.ts";

export function useOrganizationCompetitionsQuery(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.competitions.byOrganization(organizationId),
    queryFn: () => listOrganizationCompetitions(organizationId),
    enabled: organizationId.length > 0,
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
