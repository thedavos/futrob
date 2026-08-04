import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AcceptInvitationRequest, CreateOrganizationRequest } from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { organizationsBrowserClient } from "./organizations-browser-client.ts";

export function useMyMembershipsQuery() {
  return useQuery({
    queryKey: queryKeys.organizations.mine(),
    queryFn: () => organizationsBrowserClient.listMine(),
  });
}

export function useCreateOrganizationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrganizationRequest) => organizationsBrowserClient.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.mine() });
    },
  });
}

export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AcceptInvitationRequest) =>
      organizationsBrowserClient.acceptInvitation(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.mine() });
    },
  });
}
