import { useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ONBOARDING_PATH } from "@futrob/identity";
import { useOnboardingStatusQuery } from "@/modules/identity/presentation/identity-queries.ts";
import { useMyMembershipsQuery } from "@/modules/organizations/presentation/organization-queries.ts";
import { useMyPlayerProfileQuery } from "@/modules/teams/presentation/player-queries.ts";
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

  const associatedClubName = profileQuery.data?.externalClub?.externalClubName ?? null;

  const memberships: readonly OrganizationSelectorOption[] = useMemo(
    () =>
      (membershipsQuery.data?.memberships ?? []).map((item) => ({
        organizationId: item.organizationId,
        name: item.organizationName,
      })),
    [membershipsQuery.data?.memberships],
  );

  // Competition list API is not wired yet; keep empty and enrich from the active URL.
  const competitions: readonly CompetitionSelectorOption[] = useMemo(() => {
    const fromPath = workspaceSelectionFromPathname(pathname);
    if (fromPath?.kind === WORKSPACE_SELECTION_KIND.competition && fromPath.organizationId) {
      return [
        {
          competitionId: fromPath.competitionId,
          organizationId: fromPath.organizationId,
          name: fromPath.label ?? "Competición activa",
        },
      ];
    }
    return [];
  }, [pathname]);

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

  function select(next: WorkspaceSelection) {
    writeStoredWorkspaceSelection(next);
    setOverride(next);
  }

  return {
    selection,
    memberships,
    competitions,
    associatedClubName,
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
  return (
    competitions.some((item) => item.competitionId === selection.competitionId) ||
    Boolean(selection.competitionId)
  );
}
