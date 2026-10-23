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
  CompetitionTeamManagementDetailResponse,
  CompetitionTeamManagementListResponse,
  CompetitionTeamManagementRosterDto,
  ConnectTeamExternalClubRequest,
  CreateRosterInvitationRequestInput,
  RosterMembershipRoleDto,
} from "@futrob/api-contracts";
import { patchQueryData } from "@/shared/presentation/query/patch-query-data.ts";
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

type ManagementPage = Awaited<ReturnType<typeof teamsBrowserClient.listCompetitionManagement>>;

/** Walks every cursor page of the competition team list. Callers decide what to keep from each row. */
export async function listEveryCompetitionManagementPage(
  organizationId: string,
  competitionId: string,
  limit: number,
): Promise<ManagementPage["items"]> {
  const items: Array<ManagementPage["items"][number]> = [];
  let cursor: string | undefined;
  do {
    const page = await teamsBrowserClient.listCompetitionManagement(organizationId, competitionId, {
      cursor,
      limit,
    });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return items;
}

/** Loads every management page so setup can map team ids to club names without fetch-in-effect. */
export function useCompetitionTeamClubNamesQuery(organizationId: string, competitionId: string) {
  return useQuery({
    queryKey: queryKeys.teams.competitionManagementClubNames(organizationId, competitionId),
    queryFn: async () => {
      const names: Record<string, string> = {};
      const items = await listEveryCompetitionManagementPage(organizationId, competitionId, 25);
      for (const item of items) {
        if (item.externalClub) names[item.team.id] = item.externalClub.externalClubName;
      }
      return names;
    },
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
    onMutate: async (input) => ({
      rollback: await patchQueryData<CompetitionTeamManagementDetailResponse>(
        queryClient,
        teamDetailKey(scope),
        (detail) => ({
          ...detail,
          members: detail.members.map((member) => ({
            ...member,
            membership: {
              ...member.membership,
              role: roleAfterChange(member.membership, input.membershipId, input.role),
            },
          })),
        }),
      ),
    }),
    onError: (_error, _input, context) => context?.rollback(),
    onSettled: async () => {
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
    onMutate: async (open) => {
      const withRoster = <T extends { readonly roster: CompetitionTeamManagementRosterDto }>(
        item: T,
      ): T => ({ ...item, roster: rosterSetOpen(item.roster, open) });
      const rollbacks = await Promise.all([
        patchQueryData<CompetitionTeamManagementDetailResponse>(
          queryClient,
          teamDetailKey(scope),
          withRoster,
        ),
        patchQueryData<InfiniteData<CompetitionTeamManagementListResponse>>(
          queryClient,
          queryKeys.teams.competitionManagement(scope.organizationId, scope.competitionId),
          (list) => ({
            ...list,
            pages: list.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.team.id === scope.teamId ? withRoster(item) : item,
              ),
            })),
          }),
        ),
      ]);
      return { rollback: () => rollbacks.forEach((rollback) => rollback()) };
    },
    onError: (_error, _open, context) => context?.rollback(),
    onSettled: () => invalidateTeamManagement(queryClient, scope),
  });
}

function teamDetailKey({ organizationId, competitionId, teamId }: TeamMutationScope) {
  return queryKeys.teams.competitionManagementDetail(organizationId, competitionId, teamId);
}

/** The API reports a roster as closed exactly when it has a lock time. */
function rosterSetOpen(
  roster: CompetitionTeamManagementRosterDto,
  open: boolean,
): CompetitionTeamManagementRosterDto {
  if (open) return { ...roster, state: "open", lockedAt: null };
  return { ...roster, state: "closed", lockedAt: roster.lockedAt ?? new Date().toISOString() };
}

/** A Team has one captain, so naming a new one demotes the previous captain to player. */
function roleAfterChange(
  membership: { readonly id: string; readonly role: RosterMembershipRoleDto },
  changedId: string,
  role: RosterMembershipRoleDto,
): RosterMembershipRoleDto {
  if (membership.id === changedId) return role;
  if (role === "captain" && membership.role === "captain") return "player";
  return membership.role;
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
