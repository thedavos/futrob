import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { ONBOARDING_PATH } from "@futrob/identity";
import {
  listMyAccessibleCompetitions,
  listOrganizationCompetitions,
} from "@/modules/competitions/presentation/competitions-browser-client.ts";
import { useOnboardingStatusQuery } from "@/modules/identity/presentation/identity-queries.ts";
import { useMyMembershipsQuery } from "@/modules/organizations/presentation/organization-queries.ts";
import { useMyPlayerProfileQuery } from "@/modules/teams/presentation/player-queries.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  SHELL_PERMISSIONS,
  allowedPermissionSet,
  getEffectiveAccess,
} from "@/context/permissions.ts";
import {
  WORKSPACE_SELECTION_KIND,
  type CompetitionSelectorOption,
  type OrganizationSelectorOption,
  type WorkspaceSelection,
  isSameWorkspaceSelection,
  resolveDefaultWorkspaceSelection,
  workspaceSelectionFromPathname,
} from "./workspace-selection.ts";
import {
  readStoredWorkspaceSelection,
  writeStoredWorkspaceSelection,
} from "./workspace-selection-storage.ts";

export function useWorkspaceSelection() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const onboardingQuery = useOnboardingStatusQuery();
  const membershipsQuery = useMyMembershipsQuery();
  const profileQuery = useMyPlayerProfileQuery();
  const [override, setOverride] = useState<WorkspaceSelection | null>(null);

  const associatedClub = useMemo(() => {
    const club = profileQuery.data?.externalClub;
    if (!club) return null;
    return {
      name: club.externalClubName,
      imageUrl: club.imageUrl ?? null,
    };
  }, [profileQuery.data?.externalClub]);

  const associatedClubName = associatedClub?.name ?? null;

  const memberships: readonly OrganizationSelectorOption[] = useMemo(
    () =>
      (membershipsQuery.data?.memberships ?? []).map((item) => ({
        organizationId: item.organizationId,
        name: item.organizationName,
      })),
    [membershipsQuery.data?.memberships],
  );
  const organizationPortfolioIds = useMemo(
    () =>
      (membershipsQuery.data?.memberships ?? [])
        .filter((membership) => membership.role === "organizer" || membership.role === "staff")
        .map((membership) => membership.organizationId),
    [membershipsQuery.data?.memberships],
  );

  const competitionQueries = useQueries({
    queries: organizationPortfolioIds.map((organizationId) => ({
      queryKey: queryKeys.competitions.byOrganization(organizationId),
      queryFn: () => listOrganizationCompetitions(organizationId),
    })),
  });
  const accessibleCompetitionsQuery = useQuery({
    queryKey: queryKeys.competitions.mine(),
    queryFn: listMyAccessibleCompetitions,
  });

  const competitions: readonly CompetitionSelectorOption[] = useMemo(() => {
    const byId = new Map<string, CompetitionSelectorOption>();
    for (const item of accessibleCompetitionsQuery.data?.competitions ?? []) {
      byId.set(item.competition.id, {
        competitionId: item.competition.id,
        organizationId: item.competition.organizationId,
        name: item.competition.name,
      });
    }
    for (const query of competitionQueries) {
      for (const competition of query.data?.competitions ?? []) {
        byId.set(competition.id, {
          competitionId: competition.id,
          organizationId: competition.organizationId,
          name: competition.name,
        });
      }
    }

    const fromPath = workspaceSelectionFromPathname(pathname);
    if (
      fromPath?.kind === WORKSPACE_SELECTION_KIND.competition &&
      fromPath.organizationId &&
      !byId.has(fromPath.competitionId)
    ) {
      byId.set(fromPath.competitionId, {
        competitionId: fromPath.competitionId,
        organizationId: fromPath.organizationId,
        name: fromPath.label ?? "Competición activa",
      });
    }

    return [...byId.values()];
  }, [accessibleCompetitionsQuery.data?.competitions, competitionQueries, pathname]);

  const selection = useMemo(() => {
    const fromPath = workspaceSelectionFromPathname(pathname);
    if (fromPath) {
      return withLabels(fromPath, memberships, competitions);
    }

    if (override) {
      return withLabels(override, memberships, competitions);
    }

    const stored = readStoredWorkspaceSelection();
    if (stored && isStoredSelectionValid(stored, memberships, competitions)) {
      return withLabels(stored, memberships, competitions);
    }

    const path = onboardingQuery.data?.path ?? null;
    const firstOrg = memberships[0] ?? null;
    const firstCompetition = competitions[0] ?? null;

    const defaults = resolveDefaultWorkspaceSelection({
      path:
        path === ONBOARDING_PATH.player ||
        path === ONBOARDING_PATH.organization ||
        path === ONBOARDING_PATH.invitation
          ? path
          : null,
      organizationId: firstOrg?.organizationId ?? null,
      competitionId: firstCompetition?.competitionId ?? null,
      organizationLabel: firstOrg?.name ?? null,
      competitionLabel: firstCompetition?.name ?? null,
    });

    return withLabels(defaults, memberships, competitions);
  }, [competitions, memberships, onboardingQuery.data?.path, override, pathname]);

  const authorizationScope = useMemo(() => {
    if (selection.kind === WORKSPACE_SELECTION_KIND.organization) {
      return { organizationId: selection.organizationId };
    }
    if (selection.kind === WORKSPACE_SELECTION_KIND.competition) {
      return {
        organizationId: selection.organizationId ?? undefined,
        competitionId: selection.competitionId,
      };
    }
    return {};
  }, [selection]);
  const effectiveAccessQuery = useQuery({
    queryKey: queryKeys.authorization.effectiveAccess(authorizationScope, SHELL_PERMISSIONS),
    queryFn: () => getEffectiveAccess(authorizationScope),
    enabled: selection.kind !== WORKSPACE_SELECTION_KIND.personal,
    staleTime: 30_000,
  });
  const allowedPermissions = useMemo(
    () => allowedPermissionSet(effectiveAccessQuery.data),
    [effectiveAccessQuery.data],
  );

  function select(next: WorkspaceSelection) {
    writeStoredWorkspaceSelection(next);
    setOverride(next);
  }

  return {
    selection,
    memberships,
    competitions,
    associatedClub,
    associatedClubName,
    allowedPermissions,
    effectiveAccessQuery,
    select,
    isSame: (other: WorkspaceSelection) => isSameWorkspaceSelection(selection, other),
  };
}

function withLabels(
  selection: WorkspaceSelection,
  memberships: readonly OrganizationSelectorOption[],
  competitions: readonly CompetitionSelectorOption[],
): WorkspaceSelection {
  if (selection.kind === WORKSPACE_SELECTION_KIND.organization) {
    const match = memberships.find((item) => item.organizationId === selection.organizationId);
    return match ? { ...selection, label: match.name } : selection;
  }
  if (selection.kind === WORKSPACE_SELECTION_KIND.competition) {
    const match = competitions.find((item) => item.competitionId === selection.competitionId);
    return match ? { ...selection, label: match.name } : selection;
  }
  return selection;
}

function isStoredSelectionValid(
  selection: WorkspaceSelection,
  memberships: readonly OrganizationSelectorOption[],
  competitions: readonly CompetitionSelectorOption[],
): boolean {
  if (selection.kind === WORKSPACE_SELECTION_KIND.personal) return true;
  if (selection.kind === WORKSPACE_SELECTION_KIND.organization) {
    return memberships.some((item) => item.organizationId === selection.organizationId);
  }
  return competitions.some((item) => item.competitionId === selection.competitionId);
}
