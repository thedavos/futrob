import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import type {
  ChangeRosterRoleRequest,
  ConnectTeamExternalClubRequest,
  CreateRosterInvitationRequestInput,
} from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { teamsBrowserClient } from "./teams-browser-client.ts";

export function useCompetitionTeamManagementQuery(organizationId: string, competitionId: string) {
  type Page = Awaited<ReturnType<typeof teamsBrowserClient.listCompetitionManagement>>;
  return useInfiniteQuery<
    Page,
    Error,
    InfiniteData<Page>,
    ReturnType<typeof queryKeys.teams.competitionManagement>,
    string | undefined
  >({
    queryKey: queryKeys.teams.competitionManagement(organizationId, competitionId),
    queryFn: ({ pageParam }) =>
      teamsBrowserClient.listCompetitionManagement(organizationId, competitionId, {
        cursor: pageParam,
        limit: 25,
      }),
    initialPageParam: undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: organizationId.length > 0 && competitionId.length > 0,
  });
}

export function useCompetitionTeamManagementDetailQuery(
  organizationId: string,
  competitionId: string,
  teamId: string | null,
) {
  return useQuery({
    queryKey: queryKeys.teams.competitionManagementDetail(
      organizationId,
      competitionId,
      teamId ?? "",
    ),
    queryFn: () =>
      teamsBrowserClient.getCompetitionTeamManagement(organizationId, competitionId, teamId!),
    enabled: organizationId.length > 0 && competitionId.length > 0 && Boolean(teamId),
  });
}

type TeamMutationScope = {
  readonly organizationId: string;
  readonly competitionId: string;
  readonly teamId: string;
};

async function invalidateTeamManagement(
  queryClient: QueryClient,
  { organizationId, competitionId, teamId }: TeamMutationScope,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.teams.competitionManagement(organizationId, competitionId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.teams.competitionManagementDetail(organizationId, competitionId, teamId),
    }),
  ]);
}

export function useChangeRosterRoleMutation(scope: TeamMutationScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { readonly membershipId: string } & ChangeRosterRoleRequest) =>
      teamsBrowserClient.changeRosterRole(
        scope.organizationId,
        scope.competitionId,
        scope.teamId,
        input.membershipId,
        { role: input.role },
      ),
    onSuccess: async () => {
      await Promise.all([
        invalidateTeamManagement(queryClient, scope),
        queryClient.invalidateQueries({ queryKey: queryKeys.players.meTeams() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.authorization.all }),
      ]);
    },
  });
}

export function useSetRosterOpenMutation(scope: TeamMutationScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (open: boolean) =>
      open
        ? teamsBrowserClient.openRoster(scope.organizationId, scope.competitionId, scope.teamId)
        : teamsBrowserClient.closeRoster(scope.organizationId, scope.competitionId, scope.teamId),
    onSuccess: () => invalidateTeamManagement(queryClient, scope),
  });
}

export function useConnectExternalClubMutation(scope: TeamMutationScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConnectTeamExternalClubRequest) =>
      teamsBrowserClient.connectExternalClub(
        scope.organizationId,
        scope.competitionId,
        scope.teamId,
        input,
      ),
    onSuccess: () => invalidateTeamManagement(queryClient, scope),
  });
}

export function useCreateRosterInvitationMutation(scope: TeamMutationScope) {
  return useMutation({
    mutationFn: (input: CreateRosterInvitationRequestInput) =>
      teamsBrowserClient.createRosterInvitation(
        scope.organizationId,
        scope.competitionId,
        scope.teamId,
        input,
      ),
  });
}

export function useDecideTeamEntryMutation(
  organizationId: string,
  competitionId: string,
  teamId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { readonly entryId: string; readonly decision: "approve" | "reject" }) =>
      teamsBrowserClient.decideEntry(organizationId, competitionId, input.entryId, input.decision),
    onSuccess: async () => {
      await Promise.all([
        invalidateTeamManagement(queryClient, { organizationId, competitionId, teamId }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.competitions.participants(organizationId, competitionId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.authorization.all }),
      ]);
    },
  });
}
