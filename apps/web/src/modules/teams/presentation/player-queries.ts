import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AcceptRosterInvitationRequest,
  AddMyPlayerGameAccountRequest,
  AssociateMyPlayerExternalClubRequest,
  AssociateMyPlayerExternalClubResponse,
  GetMyPlayerProfileResponse,
  ListMyRosterInvitationsResponse,
  RespondToRosterInvitationRequest,
  SetActiveTeamRequest,
  UpdateMyPlayerGameAccountRequest,
} from "@futrob/api-contracts";
import { invalidateEffectiveAccessQueries } from "@/shared/presentation/query/invalidate-effective-access.ts";
import { patchQueryData } from "@/shared/presentation/query/patch-query-data.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { teamsBrowserClient } from "./teams-browser-client.ts";

export function useMyPlayerProfileQuery() {
  return useQuery({
    queryKey: queryKeys.players.me(),
    queryFn: () => teamsBrowserClient.getMyProfile(),
  });
}

export function useMyTeamsQuery() {
  return useQuery({
    queryKey: queryKeys.players.meTeams(),
    queryFn: () => teamsBrowserClient.getMyTeams(),
  });
}

export function useAddMyGameAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddMyPlayerGameAccountRequest) =>
      teamsBrowserClient.addMyGameAccount(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.players.me() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.gameData.meRecentMatches() });
    },
  });
}

export function useUpdateMyGameAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMyPlayerGameAccountRequest & { readonly accountId: string }) =>
      teamsBrowserClient.updateMyGameAccount(input.accountId, {
        identifier: input.identifier,
        platform: input.platform,
        gameEdition: input.gameEdition,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.players.me() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.gameData.meRecentMatches() });
    },
  });
}

export function useAssociateMyExternalClubMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssociateMyPlayerExternalClubRequest) =>
      teamsBrowserClient.associateMyExternalClub(input),
    onSuccess: (data) => {
      queryClient.setQueryData<GetMyPlayerProfileResponse>(queryKeys.players.me(), (current) =>
        profileWithAssociatedClub(current, data),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.gameData.meRecentMatches() });
    },
  });
}

export function useSetActiveTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetActiveTeamRequest) => teamsBrowserClient.setActiveTeam(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.players.meTeams() });
      await invalidateEffectiveAccessQueries(queryClient);
    },
  });
}

export function useAcceptRosterInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AcceptRosterInvitationRequest) =>
      teamsBrowserClient.acceptRosterInvitation(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.players.meTeams() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.players.me() });
      await invalidateEffectiveAccessQueries(queryClient);
    },
  });
}

export function useMyNextEncounterQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.players.meNextEncounter(),
    queryFn: () => teamsBrowserClient.getMyNextEncounter(),
    enabled,
  });
}

export function useMyRosterInvitationsQuery() {
  return useQuery({
    queryKey: queryKeys.players.meRosterInvitations(),
    queryFn: () => teamsBrowserClient.listMyRosterInvitations(),
  });
}

export function useRespondToRosterInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RespondToRosterInvitationRequest & { readonly invitationId: string }) =>
      teamsBrowserClient.respondToRosterInvitation(input.invitationId, { action: input.action }),
    // Only a decline is shown before the server answers: accepting grants Team access.
    onMutate: async (input) => {
      if (input.action !== "decline") return { rollback: () => {} };
      const respondedAt = new Date().toISOString();
      return {
        rollback: await patchQueryData<ListMyRosterInvitationsResponse>(
          queryClient,
          queryKeys.players.meRosterInvitations(),
          {
            apply: (inbox) => ({
              invitations: inbox.invitations.map((invitation) =>
                invitation.invitationId === input.invitationId
                  ? { ...invitation, status: "declined", respondedAt }
                  : invitation,
              ),
            }),
            revert: (inbox, previous) => ({
              invitations: inbox.invitations.map((invitation) =>
                invitation.invitationId === input.invitationId
                  ? (previous.invitations.find(
                      (before) => before.invitationId === input.invitationId,
                    ) ?? invitation)
                  : invitation,
              ),
            }),
          },
        ),
      };
    },
    onError: (_error, _input, context) => context?.rollback(),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.players.meRosterInvitations() }),
    onSuccess: async (data) => {
      if (data.status === "accepted") {
        await queryClient.invalidateQueries({ queryKey: queryKeys.players.meTeams() });
        await queryClient.invalidateQueries({ queryKey: queryKeys.players.me() });
        await invalidateEffectiveAccessQueries(queryClient);
      }
    },
  });
}

function profileWithAssociatedClub(
  current: GetMyPlayerProfileResponse | undefined,
  data: AssociateMyPlayerExternalClubResponse,
): GetMyPlayerProfileResponse {
  if (!current) {
    return {
      profile: data.profile,
      gameAccounts: [],
      externalClubs: [data.externalClub],
    };
  }
  return {
    ...current,
    profile: data.profile,
    externalClubs: [
      ...current.externalClubs.filter(
        (item) =>
          !(
            item.providerKey === data.externalClub.providerKey &&
            item.externalClubId === data.externalClub.externalClubId
          ),
      ),
      data.externalClub,
    ],
  };
}
