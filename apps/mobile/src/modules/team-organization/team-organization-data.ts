import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChangeOrganizationRoleRequest,
  CreateOrganizationInvitationRequest,
  CreateRosterInvitationRequestInput,
  RosterMembershipRoleDto,
  UpdateOrganizationProfileRequest,
} from "@futrob/api-contracts";
import { FutrobApiError, type TeamScope } from "@futrob/sdk";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { allowedPermissionSet, MOBILE_PERMISSION } from "@/modules/authorization/permissions";
import type { SessionGeneration } from "@/modules/identity/session-store";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";

/**
 * 401s need no handling here: the client clears the stored session only when the rejected
 * bearer is still the current one, so an older session's late answer never ends a newer one.
 * Screens send a 401 back to login through `isUnauthorized`.
 */
export function isUnauthorized(error: Error | null): boolean {
  return error instanceof FutrobApiError && error.status === 401;
}

export function isForbidden(error: Error | null): boolean {
  return error instanceof FutrobApiError && error.status === 403;
}

export function errorStatus(error: Error | null): number | undefined {
  return error instanceof FutrobApiError ? error.status : undefined;
}

export function errorCode(error: Error | null): string | undefined {
  return error instanceof FutrobApiError ? error.code : undefined;
}

/** Roster permissions a Team page asks `EffectiveAccess` for, with the Team in scope. */
const TEAM_PERMISSIONS = [
  MOBILE_PERMISSION.teamsRosterRead,
  MOBILE_PERMISSION.teamsRosterManage,
  MOBILE_PERMISSION.teamsRosterRolesManage,
  MOBILE_PERMISSION.teamsInvitationsManage,
] as const;

export function useMyTeams() {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.teamOrganization(generation, "my-teams"),
    queryFn: ({ signal }) => getFutrobClient().players.listTeams({ signal }),
    retry: false,
  });
}

export function useSetActiveTeam() {
  const generation = useSessionGeneration();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rosterMembershipId: string) =>
      getFutrobClient().players.setActiveTeam({ rosterMembershipId }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: mobileQueryKeys.teamOrganization(generation, "my-teams"),
        }),
        queryClient.invalidateQueries({
          queryKey: mobileQueryKeys.workspaceOptions(generation),
        }),
      ]),
  });
}

/** `EffectiveAccess` for one Team: the roster permissions the page may offer. */
export function useTeamAccess(scope: TeamScope | undefined) {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.teamOrganization(
      generation,
      "team-access",
      scope?.organizationId,
      scope?.competitionId,
      scope?.teamId,
    ),
    queryFn: async ({ signal }) => {
      const access = await getFutrobClient().authorization.getEffectiveAccess(
        scope!,
        TEAM_PERMISSIONS,
        { signal },
      );
      return allowedPermissionSet(access);
    },
    enabled: scope !== undefined,
    retry: false,
  });
}

function teamDetailKey(generation: SessionGeneration, scope: TeamScope | undefined) {
  return mobileQueryKeys.teamOrganization(
    generation,
    "team-detail",
    scope?.organizationId,
    scope?.competitionId,
    scope?.teamId,
  );
}

export function useTeamDetail(scope: TeamScope | undefined, enabled: boolean) {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: teamDetailKey(generation, scope),
    queryFn: ({ signal }) =>
      getFutrobClient().teams.getCompetitionTeamManagement(
        scope!.organizationId,
        scope!.competitionId,
        scope!.teamId,
        { signal },
      ),
    enabled: scope !== undefined && enabled,
    retry: false,
  });
}

/** Roster writes refresh the Team detail they change. */
function useTeamMutation<Input, Output>(
  scope: TeamScope,
  run: (scope: TeamScope, input: Input) => Promise<Output>,
  refresh = true,
) {
  const generation = useSessionGeneration();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Input) => run(scope, input),
    onSuccess: () =>
      refresh
        ? queryClient.invalidateQueries({ queryKey: teamDetailKey(generation, scope) })
        : undefined,
  });
}

export function useChangeRosterRole(scope: TeamScope) {
  return useTeamMutation(
    scope,
    (team, input: { membershipId: string; role: RosterMembershipRoleDto }) =>
      getFutrobClient().teams.rosters.changeRole(
        team.organizationId,
        team.competitionId,
        team.teamId,
        input.membershipId,
        { role: input.role },
      ),
  );
}

export function useSetRosterOpen(scope: TeamScope) {
  return useTeamMutation(scope, (team, open: boolean) => {
    const rosters = getFutrobClient().teams.rosters;
    return open
      ? rosters.open(team.organizationId, team.competitionId, team.teamId)
      : rosters.close(team.organizationId, team.competitionId, team.teamId);
  });
}

export function useCreateRosterInvitation(scope: TeamScope) {
  return useTeamMutation(
    scope,
    (team, input: CreateRosterInvitationRequestInput) =>
      getFutrobClient().teams.rosterInvitations.create(
        team.organizationId,
        team.competitionId,
        team.teamId,
        input,
      ),
    false,
  );
}

function membersKey(generation: SessionGeneration, organizationId: string) {
  return mobileQueryKeys.teamOrganization(generation, "members", organizationId);
}

export function useOrganizationMembers(organizationId: string, enabled: boolean) {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: membersKey(generation, organizationId),
    queryFn: ({ signal }) =>
      getFutrobClient().organizations.listMembers(organizationId, { signal }),
    enabled,
    retry: false,
  });
}

export function useChangeOrganizationRole(organizationId: string) {
  const generation = useSessionGeneration();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { actorId: string; role: ChangeOrganizationRoleRequest["role"] }) =>
      getFutrobClient().authorization.changeOrganizationRole(organizationId, input.actorId, {
        role: input.role,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: membersKey(generation, organizationId) }),
  });
}

export function useCreateOrganizationInvitation(organizationId: string) {
  return useMutation({
    mutationFn: (input: CreateOrganizationInvitationRequest) =>
      getFutrobClient().organizations.createInvitation(organizationId, input),
  });
}

function profileKey(generation: SessionGeneration, organizationId: string) {
  return mobileQueryKeys.teamOrganization(generation, "organization-profile", organizationId);
}

export function useOrganizationProfile(organizationId: string, enabled: boolean) {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: profileKey(generation, organizationId),
    queryFn: ({ signal }) => getFutrobClient().organizations.get(organizationId, { signal }),
    enabled,
    retry: false,
  });
}

export function useUpdateOrganizationProfile(organizationId: string) {
  const generation = useSessionGeneration();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOrganizationProfileRequest) =>
      getFutrobClient().organizations.updateProfile(organizationId, input),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKey(generation, organizationId), profile);
      // The context selector names organizations from the workspace options.
      return queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.workspaceOptions(generation),
      });
    },
  });
}

const ACTIVITY_PAGE_SIZE = 20;

/** One activity feed, newest first, a page at a time. */
export function useActivityFeed(source: { readonly organizationId?: string }) {
  const generation = useSessionGeneration();
  return useInfiniteQuery({
    queryKey: mobileQueryKeys.teamOrganization(generation, "activity", source.organizationId),
    queryFn: ({ pageParam, signal }) => {
      // The first page has no cursor; "" stands for it.
      const input = { limit: ACTIVITY_PAGE_SIZE, cursor: pageParam || undefined };
      const activities = getFutrobClient().activities;
      return source.organizationId
        ? activities.listForOrganization(source.organizationId, input, { signal })
        : activities.listMine(input, { signal });
    },
    initialPageParam: "",
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
  });
}
