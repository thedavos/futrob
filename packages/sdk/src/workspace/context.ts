import type {
  AccessibleCompetitionDto,
  MembershipSummaryDto,
  OrgMembershipRoleDto,
  PlayerExternalClubAssociationDto,
} from "@futrob/api-contracts";

/**
 * The single active context of the authenticated shell (design.md, «Selector de contexto»):
 * the personal space (optionally narrowed to one associated EA club), an organization, or a
 * competition. Web and mobile share these destinations; each platform draws its own chrome.
 */
export type WorkspaceContext =
  | { readonly kind: "personal"; readonly externalClubId?: string }
  | { readonly kind: "organization"; readonly organizationId: string }
  | {
      readonly kind: "competition";
      readonly organizationId: string;
      readonly competitionId: string;
    };

export type WorkspaceRole = OrgMembershipRoleDto | AccessibleCompetitionDto["role"];

export type WorkspaceClubOption = {
  readonly externalClubId: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly context: WorkspaceContext;
};

export type WorkspaceCompetitionOption = {
  readonly competitionId: string;
  readonly organizationId: string;
  readonly name: string;
  readonly role: WorkspaceRole;
  readonly context: WorkspaceContext;
};

export type WorkspaceOrganizationOption = {
  readonly organizationId: string;
  readonly name: string;
  readonly role: OrgMembershipRoleDto;
  readonly context: WorkspaceContext;
};

/** Selector groups, in the order the shell lists them after «Espacio personal». */
export type WorkspaceOptions = {
  readonly clubs: readonly WorkspaceClubOption[];
  readonly competitions: readonly WorkspaceCompetitionOption[];
  readonly organizations: readonly WorkspaceOrganizationOption[];
};

const COMPETITION_ROLE_RANK = {
  organizer: 5,
  staff: 4,
  captain: 3,
  vice_captain: 2,
  player: 1,
  member: 0,
} as const satisfies Record<WorkspaceRole, number>;

/** The strongest role the actor holds in a competition: its organization role or its own. */
function competitionRole(
  organizationRole: OrgMembershipRoleDto | undefined,
  accessRole: AccessibleCompetitionDto["role"],
): WorkspaceRole {
  if (organizationRole === "organizer" || organizationRole === "staff") {
    return COMPETITION_ROLE_RANK[organizationRole] > COMPETITION_ROLE_RANK[accessRole]
      ? organizationRole
      : accessRole;
  }
  return accessRole;
}

/** Builds the selector groups from `/organizations/mine`, `/competitions/mine` and `/players/me`. */
export function buildWorkspaceOptions(input: {
  readonly memberships: readonly MembershipSummaryDto[];
  readonly competitions: readonly AccessibleCompetitionDto[];
  readonly externalClubs: readonly PlayerExternalClubAssociationDto[];
}): WorkspaceOptions {
  const organizationRoles = new Map(
    input.memberships.map((membership) => [membership.organizationId, membership.role] as const),
  );
  return {
    clubs: input.externalClubs.map((club) => ({
      externalClubId: club.externalClubId,
      name: club.externalClubName,
      imageUrl: club.imageUrl,
      context: { kind: "personal", externalClubId: club.externalClubId },
    })),
    competitions: input.competitions.map(({ competition, role }) => ({
      competitionId: competition.id,
      organizationId: competition.organizationId,
      name: competition.name,
      role: competitionRole(organizationRoles.get(competition.organizationId), role),
      context: {
        kind: "competition",
        organizationId: competition.organizationId,
        competitionId: competition.id,
      },
    })),
    organizations: input.memberships.map((membership) => ({
      organizationId: membership.organizationId,
      name: membership.organizationName,
      role: membership.role,
      context: { kind: "organization", organizationId: membership.organizationId },
    })),
  };
}

/** Stable identity of a context; a personal context with a club differs from one without. */
export function workspaceContextKey(context: WorkspaceContext): string {
  switch (context.kind) {
    case "personal":
      return context.externalClubId ? `personal:${context.externalClubId}` : "personal";
    case "organization":
      return `organization:${context.organizationId}`;
    case "competition":
      return `competition:${context.competitionId}`;
  }
}

export function isSameWorkspaceContext(left: WorkspaceContext, right: WorkspaceContext): boolean {
  return workspaceContextKey(left) === workspaceContextKey(right);
}

/** The shared route of a context: `/player`, `/orgs/:orgId` or `/orgs/:orgId/competitions/:id`. */
export function workspaceContextPath(context: WorkspaceContext): string {
  switch (context.kind) {
    case "personal":
      return context.externalClubId
        ? `/player?club=${encodeURIComponent(context.externalClubId)}`
        : "/player";
    case "organization":
      return `/orgs/${encodeURIComponent(context.organizationId)}`;
    case "competition":
      return `/orgs/${encodeURIComponent(context.organizationId)}/competitions/${encodeURIComponent(context.competitionId)}`;
  }
}

/**
 * The name of the entity behind a context, if the options know it. The personal space has no
 * entity name of its own: it returns the selected club, or `undefined`.
 */
export function workspaceContextName(
  context: WorkspaceContext,
  options: WorkspaceOptions | undefined,
): string | undefined {
  switch (context.kind) {
    case "personal":
      return options?.clubs.find((club) => club.externalClubId === context.externalClubId)?.name;
    case "organization":
      return options?.organizations.find((item) => item.organizationId === context.organizationId)
        ?.name;
    case "competition":
      return options?.competitions.find((item) => item.competitionId === context.competitionId)
        ?.name;
  }
}

/** Keeps a preferred club only while it is still associated; otherwise the first association. */
export function resolvePersonalExternalClubId(
  preferredId: string | undefined,
  associatedClubIds: readonly string[],
): string | undefined {
  if (preferredId !== undefined && associatedClubIds.includes(preferredId)) return preferredId;
  return associatedClubIds[0];
}
