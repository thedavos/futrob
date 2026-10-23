import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AcceptEntryInvitationRequest,
  InviteTeamCaptainRequest,
  ListSentEntryInvitationsResponse,
} from "@futrob/api-contracts";
import { patchQueryData } from "@/shared/presentation/query/patch-query-data.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  acceptEntryInvitation,
  declineEntryInvitation,
  getEntryInvitationLink,
  getPublicEntryInvitationLink,
  inviteTeamCaptain,
  listMyEntryInvitations,
  listSentEntryInvitations,
  previewEntryInvitation,
  regenerateEntryInvitationLink,
  revokeEntryInvitation,
  searchEntryInvitees,
  type EntryInvitationReference,
} from "./entry-invitations-browser-client.ts";

export function referenceKey(reference: EntryInvitationReference): string {
  return "code" in reference ? `link:${reference.code}` : `id:${reference.invitationId}`;
}

export function useSentEntryInvitationsQuery(
  organizationId: string,
  competitionId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.competitions.entryInvitations(organizationId, competitionId),
    queryFn: () => listSentEntryInvitations(organizationId, competitionId),
    enabled,
  });
}

/** The link is created on first read, so it is fetched only while the link tab is open. */
export function useEntryInvitationLinkQuery(
  organizationId: string,
  competitionId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.competitions.entryInvitationLink(organizationId, competitionId),
    queryFn: () => getEntryInvitationLink(organizationId, competitionId),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useEntryInvitationCommands(organizationId: string, competitionId: string) {
  const queryClient = useQueryClient();
  const sentKey = queryKeys.competitions.entryInvitations(organizationId, competitionId);
  const invite = useMutation({
    mutationFn: (input: InviteTeamCaptainRequest) =>
      inviteTeamCaptain(organizationId, competitionId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sentKey, exact: true }),
  });
  const revoke = useMutation({
    mutationFn: (invitationId: string) =>
      revokeEntryInvitation(organizationId, competitionId, invitationId),
    onMutate: async (invitationId) => {
      const respondedAt = new Date().toISOString();
      return {
        rollback: await patchQueryData<ListSentEntryInvitationsResponse>(
          queryClient,
          sentKey,
          (sent) => ({
            invitations: sent.invitations.map((invitation) =>
              invitation.id === invitationId
                ? { ...invitation, status: "revoked", respondedAt }
                : invitation,
            ),
          }),
        ),
      };
    },
    onError: (_error, _invitationId, context) => context?.rollback(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: sentKey, exact: true }),
  });
  const regenerateLink = useMutation({
    mutationFn: () => regenerateEntryInvitationLink(organizationId, competitionId),
    onSuccess: (link) =>
      queryClient.setQueryData(
        queryKeys.competitions.entryInvitationLink(organizationId, competitionId),
        link,
      ),
  });
  const search = useCallback(
    (query: string) => searchEntryInvitees(organizationId, competitionId, query),
    [organizationId, competitionId],
  );
  return { invite, revoke, regenerateLink, search };
}

export function useEntryInvitationPreviewQuery(reference: EntryInvitationReference) {
  return useQuery({
    queryKey: queryKeys.competitions.entryInvitation(referenceKey(reference)),
    queryFn: () => previewEntryInvitation(reference),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function usePublicEntryInvitationLinkQuery(code: string) {
  return useQuery({
    queryKey: queryKeys.competitions.publicEntryInvitationLink(code),
    queryFn: () => getPublicEntryInvitationLink(code),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useMyEntryInvitationsQuery() {
  return useQuery({
    queryKey: queryKeys.competitions.myEntryInvitations(),
    queryFn: listMyEntryInvitations,
  });
}

export function useRespondToEntryInvitation(reference: EntryInvitationReference) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.myEntryInvitations() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.mine() }),
    ]);
  return {
    accept: useMutation({
      mutationFn: (input: AcceptEntryInvitationRequest) => acceptEntryInvitation(reference, input),
      onSuccess: refresh,
    }),
    decline: useMutation({
      mutationFn: (invitationId: string) => declineEntryInvitation(invitationId),
      onSuccess: refresh,
    }),
  };
}
