import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { ONBOARDING_PATH } from "@futrob/identity";
import {
  listMyAccessibleCompetitions,
  listOrganizationCompetitions,
} from "@/modules/competitions/presentation/competitions-browser-client.ts";
import { useOnboardingStatusQuery } from "@/modules/identity/presentation/identity-queries.ts";
import { useMyMembershipsQuery } from "@/modules/organizations/presentation/organization-queries.ts";
import {
  useMyPlayerProfileQuery,
  useMyTeamsQuery,
} from "@/modules/teams/presentation/player-queries.ts";
import {
  SHELL_PERMISSIONS,
  allowedFromCapabilityState,
  capabilityStateFromQuery,
  getEffectiveAccess,
} from "@/context/permissions.ts";
import { invalidateEffectiveAccessQueries } from "@/shared/presentation/query/invalidate-effective-access.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { teamIdForCompetition } from "./team-scope.ts";
import {
  WORKSPACE_SELECTION_KIND,
  type CompetitionSelectorOption,
  type OrganizationSelectorOption,
  type WorkspaceSelection,
  isSameWorkspaceSelection,
  personalWorkspaceSelection,
  resolveDefaultWorkspaceSelection,
  resolvePersonalExternalClubId,
  workspaceSelectionFromPathname,
} from "./workspace-selection.ts";
import {
  readStoredWorkspaceSelection,
  writeStoredWorkspaceSelection,
} from "./workspace-selection-storage.ts";
import { buildWorkspaceSelectorModel } from "./workspace-selector-model.ts";
import { commandBarIdentity } from "./command-bar-identity.ts";

type WorkspaceSelectionState = ReturnType<typeof useWorkspaceSelectionState>;

const WorkspaceSelectionContext = createContext<WorkspaceSelectionState | null>(null);

export function WorkspaceSelectionProvider({ children }: { readonly children: ReactNode }) {
  const value = useWorkspaceSelectionState();
  return (
    <WorkspaceSelectionContext.Provider value={value}>
      {children}
    </WorkspaceSelectionContext.Provider>
  );
}

export function useWorkspaceSelection(): WorkspaceSelectionState {
  const value = useContext(WorkspaceSelectionContext);
  if (!value) {
    throw new Error("useWorkspaceSelection requires WorkspaceSelectionProvider");
  }
  return value;
}

export function useWorkspaceSelectedClubId(): {
  readonly externalClubId: string | undefined;
  readonly profileReady: boolean;
} {
  const value = useContext(WorkspaceSelectionContext);
  if (!value) {
    throw new Error("useWorkspaceSelectedClubId requires WorkspaceSelectionProvider");
  }
  return {
    externalClubId:
      value.selection.kind === WORKSPACE_SELECTION_KIND.personal
        ? value.selection.externalClubId
        : undefined,
    profileReady: value.playerIdentityReady,
  };
}

function useWorkspaceSelectionState() {
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const onboardingQuery = useOnboardingStatusQuery();
  const membershipsQuery = useMyMembershipsQuery();
  const profileQuery = useMyPlayerProfileQuery();
  const teamsQuery = useMyTeamsQuery();
  const [override, setOverride] = useState<WorkspaceSelection | null>(null);

  const associatedClubs = useMemo(
    () =>
      (profileQuery.data?.externalClubs ?? []).map((club) => ({
        name: club.externalClubName,
        imageUrl: club.imageUrl ?? null,
        externalClubId: club.externalClubId,
      })),
    [profileQuery.data?.externalClubs],
  );
  const associatedClubIds = useMemo(
    () => associatedClubs.map((club) => club.externalClubId),
    [associatedClubs],
  );

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

  const accessRoleByCompetitionId = useMemo(() => {
    const roles = new Map<string, "staff" | "captain" | "vice_captain" | "player">();
    for (const item of accessibleCompetitionsQuery.data?.competitions ?? []) {
      roles.set(item.competition.id, item.role);
    }
    return roles;
  }, [accessibleCompetitionsQuery.data?.competitions]);

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

  const selectorModel = useMemo(
    () =>
      buildWorkspaceSelectorModel({
        memberships: (membershipsQuery.data?.memberships ?? []).map((item) => ({
          organizationId: item.organizationId,
          name: item.organizationName,
          role: item.role,
        })),
        competitions: competitions.map((competition) => ({
          competitionId: competition.competitionId,
          organizationId: competition.organizationId,
          name: competition.name,
          accessRole: accessRoleByCompetitionId.get(competition.competitionId) ?? null,
        })),
        associatedClubs,
        clubRosterRoles: [],
      }),
    [accessRoleByCompetitionId, associatedClubs, competitions, membershipsQuery.data?.memberships],
  );

  const selection = useMemo(() => {
    const stored = readStoredWorkspaceSelection();
    const preferredClubId = preferredPersonalExternalClubId(override, stored);
    const withPersonalClub = (base: WorkspaceSelection): WorkspaceSelection => {
      if (base.kind !== WORKSPACE_SELECTION_KIND.personal) {
        return withLabels(base, memberships, competitions);
      }
      return personalWorkspaceSelection(
        resolvePersonalExternalClubId(preferredClubId ?? base.externalClubId, associatedClubIds),
      );
    };

    const fromPath = workspaceSelectionFromPathname(pathname);
    if (fromPath) return withPersonalClub(fromPath);
    if (override) return withPersonalClub(override);
    if (stored && isStoredSelectionValid(stored, memberships, competitions, associatedClubIds)) {
      return withPersonalClub(stored);
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

    return withPersonalClub(defaults);
  }, [
    associatedClubIds,
    competitions,
    memberships,
    onboardingQuery.data?.path,
    override,
    pathname,
  ]);

  const selectedPersonalClub =
    selection.kind === WORKSPACE_SELECTION_KIND.personal
      ? associatedClubs.find((club) => club.externalClubId === selection.externalClubId)
      : undefined;
  const associatedClubName = selectedPersonalClub?.name ?? associatedClubs[0]?.name ?? null;
  const playerIdentity = useMemo(
    () =>
      commandBarIdentity({
        gameAccounts: profileQuery.data?.gameAccounts ?? [],
        clubs: selectedPersonalClub
          ? [
              selectedPersonalClub,
              ...associatedClubs.filter(
                (club) => club.externalClubId !== selectedPersonalClub.externalClubId,
              ),
            ]
          : associatedClubs,
      }),
    [associatedClubs, profileQuery.data?.gameAccounts, selectedPersonalClub],
  );

  const authorizationScope = useMemo(() => {
    if (selection.kind === WORKSPACE_SELECTION_KIND.organization) {
      return { organizationId: selection.organizationId };
    }
    if (selection.kind === WORKSPACE_SELECTION_KIND.competition) {
      const teamId = teamIdForCompetition(selection.competitionId, teamsQuery.data);
      return {
        organizationId: selection.organizationId ?? undefined,
        competitionId: selection.competitionId,
        ...(teamId ? { teamId } : {}),
      };
    }
    return {};
  }, [selection, teamsQuery.data]);
  const effectiveAccessQuery = useQuery({
    queryKey: queryKeys.authorization.effectiveAccess(authorizationScope, SHELL_PERMISSIONS),
    queryFn: () => getEffectiveAccess(authorizationScope),
    enabled: selection.kind !== WORKSPACE_SELECTION_KIND.personal,
    staleTime: 30_000,
  });
  const capability = useMemo(
    () =>
      capabilityStateFromQuery({
        fetchStatus: effectiveAccessQuery.isError
          ? "error"
          : effectiveAccessQuery.isPending
            ? "pending"
            : "success",
        data: effectiveAccessQuery.data,
      }),
    [effectiveAccessQuery.data, effectiveAccessQuery.isError, effectiveAccessQuery.isPending],
  );
  const allowedPermissions = useMemo(() => allowedFromCapabilityState(capability), [capability]);

  function select(next: WorkspaceSelection) {
    writeStoredWorkspaceSelection(next);
    setOverride(next);
    void invalidateEffectiveAccessQueries(queryClient);
  }

  return {
    selection,
    memberships,
    competitions,
    selectorModel,
    associatedClubs,
    associatedClubName,
    playerIdentity,
    playerIdentityReady: !profileQuery.isPending,
    allowedPermissions,
    capability,
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

function preferredPersonalExternalClubId(
  override: WorkspaceSelection | null,
  stored: WorkspaceSelection | null,
): string | undefined {
  if (override?.kind === WORKSPACE_SELECTION_KIND.personal) return override.externalClubId;
  if (stored?.kind === WORKSPACE_SELECTION_KIND.personal) return stored.externalClubId;
  return undefined;
}

function isStoredSelectionValid(
  selection: WorkspaceSelection,
  memberships: readonly OrganizationSelectorOption[],
  competitions: readonly CompetitionSelectorOption[],
  associatedClubIds: readonly string[],
): boolean {
  if (selection.kind === WORKSPACE_SELECTION_KIND.personal) {
    return (
      selection.externalClubId === undefined || associatedClubIds.includes(selection.externalClubId)
    );
  }
  if (selection.kind === WORKSPACE_SELECTION_KIND.organization) {
    return memberships.some((item) => item.organizationId === selection.organizationId);
  }
  return competitions.some((item) => item.competitionId === selection.competitionId);
}
