import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AcceptInvitationRequest,
  CreateInvitationRequest,
  CreateOrganizationInvitationRequest,
  CreateOrganizationRequest,
  OrganizationNameAvailabilityRequest,
  OrganizationSlugAvailabilityRequest,
  UpdateOrganizationProfileRequest,
} from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { changeOrganizationLogo } from "./change-organization-logo.ts";
import {
  OrganizationsClientError,
  organizationsBrowserClient,
} from "./organizations-browser-client.ts";

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

export function useCheckOrganizationNameMutation() {
  return useMutation({
    mutationFn: (input: OrganizationNameAvailabilityRequest) =>
      organizationsBrowserClient.checkNameAvailability(input),
  });
}

export function useCheckOrganizationSlugMutation() {
  return useMutation({
    mutationFn: (input: OrganizationSlugAvailabilityRequest) =>
      organizationsBrowserClient.checkSlugAvailability(input),
  });
}

export function useOrganizationProfileQuery(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.organizations.profile(organizationId),
    queryFn: () => organizationsBrowserClient.getProfile(organizationId),
  });
}

export function useUpdateOrganizationProfileMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateOrganizationProfileRequest) =>
      organizationsBrowserClient.updateProfile(organizationId, input),
    onSuccess: async (profile) => {
      queryClient.setQueryData(queryKeys.organizations.profile(organizationId), profile);
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.mine() });
    },
  });
}

export function useChangeOrganizationLogoMutation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File | null) => changeOrganizationLogo(organizationId, file),
    onSuccess: async (profile) => {
      queryClient.setQueryData(queryKeys.organizations.profile(organizationId), profile);
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

export function useCreateOrganizationInvitationMutation(organizationId: string) {
  return useMutation({
    mutationFn: (input: CreateOrganizationInvitationRequest) =>
      organizationsBrowserClient.createOrganizationInvitation(organizationId, input),
  });
}

export function useCreateCompetitionInvitationMutation(
  organizationId: string,
  competitionId: string,
) {
  return useMutation({
    mutationFn: (input: CreateInvitationRequest) =>
      organizationsBrowserClient.createCompetitionInvitation(organizationId, competitionId, input),
  });
}

export function organizationMembersQueryOptions(organizationId: string) {
  return {
    queryKey: queryKeys.organizations.members(organizationId),
    queryFn: async ({ signal }: { readonly signal: AbortSignal }) => {
      try {
        return {
          kind: "data" as const,
          ...(await organizationsBrowserClient.listMembers(organizationId, { signal })),
        };
      } catch (error) {
        if (error instanceof OrganizationsClientError && [401, 403, 404].includes(error.status)) {
          return { kind: "denied" as const };
        }
        throw error;
      }
    },
  };
}

export function useOrganizationMembersQuery(organizationId: string, enabled: boolean) {
  return useQuery({ ...organizationMembersQueryOptions(organizationId), enabled });
}
