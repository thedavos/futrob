import { ONBOARDING_PATH, type OnboardingPath } from "@futrob/identity";

export const WORKSPACE_SELECTION_KIND = {
  personal: "personal",
  competition: "competition",
  organization: "organization",
} as const;

export type WorkspaceSelectionKind =
  (typeof WORKSPACE_SELECTION_KIND)[keyof typeof WORKSPACE_SELECTION_KIND];

export type WorkspaceSelection =
  | { readonly kind: typeof WORKSPACE_SELECTION_KIND.personal }
  | {
      readonly kind: typeof WORKSPACE_SELECTION_KIND.competition;
      readonly competitionId: string;
      readonly organizationId: string | null;
      readonly label?: string;
    }
  | {
      readonly kind: typeof WORKSPACE_SELECTION_KIND.organization;
      readonly organizationId: string;
      readonly label?: string;
    };

export type CompetitionSelectorOption = {
  readonly competitionId: string;
  readonly organizationId: string;
  readonly name: string;
};

export type OrganizationSelectorOption = {
  readonly organizationId: string;
  readonly name: string;
};

export type ResolveDefaultWorkspaceSelectionInput = {
  readonly path: OnboardingPath | null;
  readonly organizationId: string | null;
  readonly competitionId: string | null;
  readonly organizationLabel?: string | null;
  readonly competitionLabel?: string | null;
};

export function resolveDefaultWorkspaceSelection(
  input: ResolveDefaultWorkspaceSelectionInput,
): WorkspaceSelection {
  if (input.path === ONBOARDING_PATH.invitation && input.competitionId) {
    return {
      kind: WORKSPACE_SELECTION_KIND.competition,
      competitionId: input.competitionId,
      organizationId: input.organizationId,
      label: input.competitionLabel ?? undefined,
    };
  }

  if (input.path === ONBOARDING_PATH.organization && input.organizationId) {
    return {
      kind: WORKSPACE_SELECTION_KIND.organization,
      organizationId: input.organizationId,
      label: input.organizationLabel ?? undefined,
    };
  }

  return { kind: WORKSPACE_SELECTION_KIND.personal };
}

const orgCompetitionPath = /^\/orgs\/([^/]+)\/competitions\/([^/]+)(?:\/|$)/;
const orgPath = /^\/orgs\/([^/]+)(?:\/|$)/;

export function workspaceSelectionFromPathname(pathname: string): WorkspaceSelection | null {
  const competitionMatch = orgCompetitionPath.exec(pathname);
  if (competitionMatch && competitionMatch[2] !== "new") {
    return {
      kind: WORKSPACE_SELECTION_KIND.competition,
      organizationId: competitionMatch[1]!,
      competitionId: competitionMatch[2]!,
    };
  }

  if (pathname === "/orgs/new") {
    return null;
  }

  const orgMatch = orgPath.exec(pathname);
  if (orgMatch && orgMatch[1] !== "new") {
    return {
      kind: WORKSPACE_SELECTION_KIND.organization,
      organizationId: orgMatch[1]!,
    };
  }

  if (pathname === "/player" || pathname.startsWith("/player/")) {
    return { kind: WORKSPACE_SELECTION_KIND.personal };
  }

  return null;
}

export function pathForWorkspaceSelection(selection: WorkspaceSelection): string {
  switch (selection.kind) {
    case WORKSPACE_SELECTION_KIND.personal:
      return "/player";
    case WORKSPACE_SELECTION_KIND.organization:
      return `/orgs/${selection.organizationId}`;
    case WORKSPACE_SELECTION_KIND.competition:
      if (selection.organizationId) {
        return `/orgs/${selection.organizationId}/competitions/${selection.competitionId}`;
      }
      return `/player/competitions/${selection.competitionId}`;
  }
}

export function workspaceSelectionKey(selection: WorkspaceSelection): string {
  switch (selection.kind) {
    case WORKSPACE_SELECTION_KIND.personal:
      return WORKSPACE_SELECTION_KIND.personal;
    case WORKSPACE_SELECTION_KIND.organization:
      return `${WORKSPACE_SELECTION_KIND.organization}:${selection.organizationId}`;
    case WORKSPACE_SELECTION_KIND.competition:
      return `${WORKSPACE_SELECTION_KIND.competition}:${selection.competitionId}`;
  }
}

export function isSameWorkspaceSelection(
  left: WorkspaceSelection,
  right: WorkspaceSelection,
): boolean {
  return workspaceSelectionKey(left) === workspaceSelectionKey(right);
}
