import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AddMyPlayerGameAccountRequest, SetActiveTeamRequest } from "@futrob/api-contracts";
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
    },
  });
}

export function useSetActiveTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetActiveTeamRequest) => teamsBrowserClient.setActiveTeam(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.players.meTeams() });
    },
  });
}
