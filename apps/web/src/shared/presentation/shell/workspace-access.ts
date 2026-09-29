import { queryOptions } from "@tanstack/react-query";
import type { GetMyTeamsResponse } from "@futrob/api-contracts";
import { SHELL_PERMISSIONS, getEffectiveAccess } from "@/context/permissions.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { teamIdForCompetition } from "./team-scope.ts";
import { WORKSPACE_SELECTION_KIND, type WorkspaceSelection } from "./workspace-selection.ts";
import type { WorkspaceSelectorModel } from "./workspace-selector-model.ts";

export type WorkspaceAuthorizationScope = {
  readonly organizationId?: string;
  readonly competitionId?: string;
  readonly teamId?: string;
};

export function workspaceAuthorizationScope(
  selection: WorkspaceSelection,
  teams: GetMyTeamsResponse | undefined,
): WorkspaceAuthorizationScope {
  if (selection.kind === WORKSPACE_SELECTION_KIND.organization) {
    return { organizationId: selection.organizationId };
  }
  if (selection.kind === WORKSPACE_SELECTION_KIND.competition) {
    const scope = {
      organizationId: selection.organizationId ?? undefined,
      competitionId: selection.competitionId,
    };
    const teamId = teamIdForCompetition(selection.competitionId, teams);
    return teamId ? { ...scope, teamId } : scope;
  }
  return {};
}

/** Shared by the shell query and the selector prefetch so both hit the same cache entry. */
export function workspaceAccessQueryOptions(scope: WorkspaceAuthorizationScope) {
  return queryOptions({
    queryKey: queryKeys.authorization.effectiveAccess(scope, SHELL_PERMISSIONS),
    queryFn: () => getEffectiveAccess(scope),
    staleTime: 30_000,
  });
}

/** Workspaces reachable from the selector whose nav depends on server-resolved permissions. */
export function prefetchableWorkspaceSelections(
  model: WorkspaceSelectorModel,
): readonly WorkspaceSelection[] {
  return [
    ...model.competitions.map(
      (competition): WorkspaceSelection => ({
        kind: WORKSPACE_SELECTION_KIND.competition,
        competitionId: competition.competitionId,
        organizationId: competition.organizationId,
      }),
    ),
    ...model.organizations.map(
      (organization): WorkspaceSelection => ({
        kind: WORKSPACE_SELECTION_KIND.organization,
        organizationId: organization.organizationId,
      }),
    ),
  ];
}
