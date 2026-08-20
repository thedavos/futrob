export const WORKSPACE_DISPLAY_ROLE = {
  organizer: "organizer",
  staff: "staff",
  member: "member",
  captain: "captain",
  vice_captain: "vice_captain",
  player: "player",
} as const;

export type WorkspaceDisplayRole =
  (typeof WORKSPACE_DISPLAY_ROLE)[keyof typeof WORKSPACE_DISPLAY_ROLE];

export type OrgMembershipRoleInput = "organizer" | "staff" | "member";
export type CompetitionAccessRoleInput = "staff" | "captain" | "vice_captain" | "player";
export type RosterRoleInput = "captain" | "vice_captain" | "player";

export type WorkspaceSelectorMembershipInput = {
  readonly organizationId: string;
  readonly name: string;
  readonly role: OrgMembershipRoleInput;
};

export type WorkspaceSelectorCompetitionInput = {
  readonly competitionId: string;
  readonly organizationId: string;
  readonly name: string;
  readonly accessRole?: CompetitionAccessRoleInput | null;
};

export type WorkspaceSelectorClubInput = {
  readonly name: string;
  readonly imageUrl: string | null;
  readonly externalClubId: string;
};

export type WorkspaceSelectorClubRosterInput = {
  readonly externalClubId: string;
  readonly role: RosterRoleInput;
};

export type CreateCompetitionOrgIntent =
  | { readonly kind: "create-organization" }
  | { readonly kind: "navigate"; readonly organizationId: string }
  | {
      readonly kind: "pick-organization";
      readonly organizations: readonly WorkspaceSelectorOrgOption[];
    };

export type WorkspaceSelectorCompetitionOption = {
  readonly competitionId: string;
  readonly organizationId: string;
  readonly name: string;
  readonly role: WorkspaceDisplayRole;
};

export type WorkspaceSelectorOrgOption = {
  readonly organizationId: string;
  readonly name: string;
  readonly role: WorkspaceDisplayRole;
};

export type WorkspaceSelectorClubOption = {
  readonly externalClubId: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly role: WorkspaceDisplayRole;
};

export type WorkspaceSelectorModel = {
  readonly competitions: readonly WorkspaceSelectorCompetitionOption[];
  readonly organizations: readonly WorkspaceSelectorOrgOption[];
  readonly clubs: readonly WorkspaceSelectorClubOption[];
  readonly eligibleHostOrganizations: readonly WorkspaceSelectorOrgOption[];
  readonly createCompetitionIntent: CreateCompetitionOrgIntent;
};

const COMPETITION_ROLE_RANK = {
  organizer: 5,
  staff: 4,
  captain: 3,
  vice_captain: 2,
  player: 1,
  member: 0,
} satisfies Record<WorkspaceDisplayRole, number>;

const ROSTER_ROLE_RANK = {
  captain: 3,
  vice_captain: 2,
  player: 1,
} satisfies Record<RosterRoleInput, number>;

function orgMembershipToDisplayRole(role: OrgMembershipRoleInput): WorkspaceDisplayRole {
  switch (role) {
    case "organizer":
      return WORKSPACE_DISPLAY_ROLE.organizer;
    case "staff":
      return WORKSPACE_DISPLAY_ROLE.staff;
    case "member":
      return WORKSPACE_DISPLAY_ROLE.member;
  }
}

export function buildWorkspaceSelectorModel(input: {
  readonly memberships: readonly WorkspaceSelectorMembershipInput[];
  readonly competitions: readonly WorkspaceSelectorCompetitionInput[];
  readonly associatedClubs: readonly WorkspaceSelectorClubInput[];
  readonly clubRosterRoles?: readonly WorkspaceSelectorClubRosterInput[];
}): WorkspaceSelectorModel {
  const organizations = input.memberships.map((membership) => ({
    organizationId: membership.organizationId,
    name: membership.name,
    role: orgMembershipToDisplayRole(membership.role),
  }));

  const orgRoleById = new Map(
    input.memberships.map((membership) => [membership.organizationId, membership.role] as const),
  );

  const competitions = input.competitions.map((competition) => ({
    competitionId: competition.competitionId,
    organizationId: competition.organizationId,
    name: competition.name,
    role: resolveCompetitionDisplayRole({
      orgRole: orgRoleById.get(competition.organizationId) ?? null,
      accessRole: competition.accessRole ?? null,
    }),
  }));

  const eligibleHostOrganizations = organizations.filter(
    (organization) =>
      organization.role === WORKSPACE_DISPLAY_ROLE.organizer ||
      organization.role === WORKSPACE_DISPLAY_ROLE.staff,
  );

  const clubRosterRoles = input.clubRosterRoles ?? [];

  return {
    competitions,
    organizations,
    clubs: input.associatedClubs.map((club) => resolveClubOption(club, clubRosterRoles)),
    eligibleHostOrganizations,
    createCompetitionIntent: resolveCreateCompetitionIntent(eligibleHostOrganizations),
  };
}

export function resolveCreateCompetitionIntent(
  eligibleHostOrganizations: readonly WorkspaceSelectorOrgOption[],
): CreateCompetitionOrgIntent {
  if (eligibleHostOrganizations.length === 0) {
    return { kind: "create-organization" };
  }
  if (eligibleHostOrganizations.length === 1) {
    return {
      kind: "navigate",
      organizationId: eligibleHostOrganizations[0]!.organizationId,
    };
  }
  return { kind: "pick-organization", organizations: eligibleHostOrganizations };
}

function resolveCompetitionDisplayRole(input: {
  readonly orgRole: OrgMembershipRoleInput | null;
  readonly accessRole: CompetitionAccessRoleInput | null;
}): WorkspaceDisplayRole {
  const candidates: WorkspaceDisplayRole[] = [];
  if (input.orgRole === "organizer" || input.orgRole === "staff") {
    candidates.push(input.orgRole);
  }
  if (input.accessRole) {
    candidates.push(input.accessRole);
  }
  if (candidates.length === 0) return WORKSPACE_DISPLAY_ROLE.player;
  return candidates.reduce((best, role) =>
    COMPETITION_ROLE_RANK[role] > COMPETITION_ROLE_RANK[best] ? role : best,
  );
}

function resolveClubOption(
  associatedClub: WorkspaceSelectorClubInput,
  clubRosterRoles: readonly WorkspaceSelectorClubRosterInput[],
): WorkspaceSelectorClubOption {
  const matching = clubRosterRoles.filter(
    (item) => item.externalClubId === associatedClub.externalClubId,
  );
  const role =
    matching.length === 0
      ? WORKSPACE_DISPLAY_ROLE.player
      : matching.reduce((best, item) =>
          ROSTER_ROLE_RANK[item.role] > ROSTER_ROLE_RANK[best.role] ? item : best,
        ).role;
  return {
    externalClubId: associatedClub.externalClubId,
    name: associatedClub.name,
    imageUrl: associatedClub.imageUrl,
    role,
  };
}
