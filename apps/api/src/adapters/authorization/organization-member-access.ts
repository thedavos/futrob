import {
  COMPETITION_PERMISSIONS,
  COMPETITION_ROLE_PERMISSIONS,
  type CompetitionMembership,
  type CompetitionMembershipRepository,
  type CompetitionRepository,
} from "@futrob/competitions";
import {
  MEMBER_DIRECTORY_CATALOG_LIMIT,
  OrganizationMemberDirectoryCatalogLimitReached,
  type AccessGrant,
  type AccessGrantRepository,
  type MemberCompetitionAccess,
  type MemberCompetitionAssignment,
  type MemberCompetitionRole,
  type OrganizationMemberAccessSummarizer,
  type OrganizationMembership,
  type PlatformRoleRepository,
} from "@futrob/organizations";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import {
  err,
  ok,
  type ActorId,
  type CompetitionId,
  type OrganizationId,
  type Permission,
  type Result,
} from "@futrob/shared-kernel";
import type {
  OrganizationRosterActorAssignment,
  OrganizationRosterActorReader,
  RosterMembershipRole,
} from "@futrob/teams";
import {
  ALL_PERMISSIONS,
  contextualCompetitionRolePermissions,
  contextualOrganizationRolePermissions,
} from "./contextual-role-permissions.ts";
import { resolvePermission, type Layer } from "./contextual-resolution.ts";

const COMPETITION_PERMISSION_SET = new Set<Permission>(COMPETITION_PERMISSIONS);

export class OrganizationMemberAccessSummarizerAdapter implements OrganizationMemberAccessSummarizer {
  constructor(
    private readonly deps: {
      readonly competitions: Pick<CompetitionRepository, "listNamesByOrganization">;
      readonly competitionMemberships: Pick<
        CompetitionMembershipRepository,
        "listForOrganizationActors"
      >;
      readonly rosters: OrganizationRosterActorReader;
      readonly grants: Pick<AccessGrantRepository, "listForOrganizationActors">;
      readonly platformRoles: Pick<PlatformRoleRepository, "listSuperusersAmong">;
    },
  ) {}

  async summarize(input: {
    readonly organizationId: OrganizationId;
    readonly callerId: ActorId;
    readonly members: readonly OrganizationMembership[];
  }): Promise<
    Result<
      ReadonlyMap<ActorId, MemberCompetitionAccess>,
      OrganizationMemberDirectoryCatalogLimitReached
    >
  > {
    if (input.members.length === 0) return ok(new Map());

    const catalog = await this.deps.competitions.listNamesByOrganization(
      input.organizationId,
      MEMBER_DIRECTORY_CATALOG_LIMIT + 1,
    );
    if (catalog.length > MEMBER_DIRECTORY_CATALOG_LIMIT) {
      return err(
        new OrganizationMemberDirectoryCatalogLimitReached({
          code: "organizations.member_directory_catalog_limit_reached",
          message: "The organization has more competitions than the directory can summarize",
        }),
      );
    }

    const actorIds = uniqueActorIds([
      input.callerId,
      ...input.members.map((member) => member.actorId),
    ]);
    const [competitionMemberships, rosterAssignments, grants, superusers] = await Promise.all([
      this.deps.competitionMemberships.listForOrganizationActors(input.organizationId, actorIds),
      this.deps.rosters.listByOrganizationActors({
        organizationId: input.organizationId,
        actorIds,
      }),
      this.deps.grants.listForOrganizationActors(input.organizationId, actorIds),
      this.deps.platformRoles.listSuperusersAmong(actorIds),
    ]);

    return ok(
      summarizeMemberCompetitionAccess({
        organizationId: input.organizationId,
        callerId: input.callerId,
        members: input.members,
        catalog,
        competitionMemberships,
        rosterAssignments,
        grants,
        superuserIds: new Set(superusers.map((assignment) => assignment.actorId)),
      }),
    );
  }
}

export interface MemberAccessFacts {
  readonly organizationId: OrganizationId;
  readonly callerId: ActorId;
  readonly members: readonly OrganizationMembership[];
  readonly catalog: readonly { readonly id: CompetitionId; readonly name: string }[];
  readonly competitionMemberships: readonly CompetitionMembership[];
  readonly rosterAssignments: readonly OrganizationRosterActorAssignment[];
  readonly grants: readonly AccessGrant[];
  readonly superuserIds: ReadonlySet<ActorId>;
}

export function summarizeMemberCompetitionAccess(
  facts: MemberAccessFacts,
): ReadonlyMap<ActorId, MemberCompetitionAccess> {
  const orgMemberships = new Map(
    facts.members
      .filter((member) => member.organizationId === facts.organizationId)
      .map((member) => [member.actorId, member]),
  );
  const competitionMemberships = indexAssignments(
    facts.competitionMemberships.filter(
      (membership) => membership.organizationId === facts.organizationId,
    ),
  );
  const rosters = indexAssignments(facts.rosterAssignments);
  const grantsByActor = new Map<ActorId, AccessGrant[]>();
  for (const grant of facts.grants) {
    if (grant.organizationId !== null && grant.organizationId !== facts.organizationId) continue;
    if (grant.organizationId === null && grant.scopeType !== "platform") continue;
    const current = grantsByActor.get(grant.actorId) ?? [];
    current.push(grant);
    grantsByActor.set(grant.actorId, current);
  }

  const catalogIds = facts.catalog.map((competition) => competition.id);
  const caller = actorView({
    actorId: facts.callerId,
    organizationId: facts.organizationId,
    membership: orgMemberships.get(facts.callerId) ?? null,
    superuser: facts.superuserIds.has(facts.callerId),
    catalogIds,
    competitionMemberships,
    rosters,
    grants: grantsByActor.get(facts.callerId) ?? [],
  });
  const visibleCatalog = facts.catalog.filter(
    (competition) => caller.readByCompetition.get(competition.id) === true,
  );
  const callerSeesCatalog = visibleCatalog.length === facts.catalog.length;

  const access = new Map<ActorId, MemberCompetitionAccess>();
  for (const member of facts.members) {
    if (member.organizationId !== facts.organizationId) continue;
    const view = actorView({
      actorId: member.actorId,
      organizationId: facts.organizationId,
      membership: member,
      superuser: facts.superuserIds.has(member.actorId),
      catalogIds,
      competitionMemberships,
      rosters,
      grants: grantsByActor.get(member.actorId) ?? [],
    });
    access.set(member.actorId, foldAccess(view, facts.catalog, visibleCatalog, callerSeesCatalog));
  }
  return access;
}

interface ActorView {
  readonly inheritedAllow: boolean;
  readonly applicableDeny: boolean;
  readonly readByCompetition: ReadonlyMap<CompetitionId, boolean>;
  readonly roleByCompetition: ReadonlyMap<CompetitionId, MemberCompetitionRole | null>;
}

function actorView(input: {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly membership: OrganizationMembership | null;
  readonly superuser: boolean;
  readonly catalogIds: readonly CompetitionId[];
  readonly competitionMemberships: ReadonlyMap<string, CompetitionMembership>;
  readonly rosters: ReadonlyMap<string, OrganizationRosterActorAssignment>;
  readonly grants: readonly AccessGrant[];
}): ActorView {
  const platform = platformLayer(input.superuser);
  const organization = organizationLayer(input.organizationId, input.membership);
  const inherited = resolvePermission("competitions.read", [platform, organization], input.grants);
  const readByCompetition = new Map<CompetitionId, boolean>();
  const roleByCompetition = new Map<CompetitionId, MemberCompetitionRole | null>();
  for (const competitionId of input.catalogIds) {
    const key = assignmentKey(input.actorId, competitionId);
    const membership = input.competitionMemberships.get(key) ?? null;
    const roster = membership ? null : (input.rosters.get(key) ?? null);
    readByCompetition.set(
      competitionId,
      resolvePermission(
        "competitions.read",
        [platform, organization, competitionLayer(competitionId, membership, roster)],
        input.grants,
      ).allowed,
    );
    roleByCompetition.set(competitionId, displayRole(membership, roster));
  }
  return {
    inheritedAllow: inherited.allowed,
    applicableDeny: input.grants.some(
      (grant) => grant.effect === "deny" && COMPETITION_PERMISSION_SET.has(grant.permission),
    ),
    readByCompetition,
    roleByCompetition,
  };
}

function foldAccess(
  view: ActorView,
  catalog: readonly { readonly id: CompetitionId; readonly name: string }[],
  visibleCatalog: readonly { readonly id: CompetitionId; readonly name: string }[],
  callerSeesCatalog: boolean,
): MemberCompetitionAccess {
  const everyCompetitionReadable = catalog.every(
    (competition) => view.readByCompetition.get(competition.id) === true,
  );
  if (
    view.inheritedAllow &&
    everyCompetitionReadable &&
    !view.applicableDeny &&
    callerSeesCatalog
  ) {
    return { kind: "inherited" };
  }
  if (view.inheritedAllow) {
    return {
      kind: "inherited-with-restriction",
      competitions: assignmentsFor(view, visibleCatalog),
    };
  }
  const competitions = assignmentsFor(view, visibleCatalog).filter(
    (assignment) => assignment.read === "allowed",
  );
  if (competitions.length === 0) return { kind: "none" };
  return { kind: "assigned", competitions };
}

function assignmentsFor(
  view: ActorView,
  competitions: readonly { readonly id: CompetitionId; readonly name: string }[],
): readonly MemberCompetitionAssignment[] {
  return [...competitions]
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
    .map((competition) => ({
      competitionId: competition.id,
      name: competition.name,
      read: view.readByCompetition.get(competition.id) === true ? "allowed" : "denied",
      role: view.roleByCompetition.get(competition.id) ?? null,
    }));
}

function platformLayer(superuser: boolean): Layer {
  return {
    scopeType: "platform",
    scopeId: "platform",
    roles: [],
    baseline: new Set(superuser ? ALL_PERMISSIONS : [STATISTICS_PERMISSION.readOwn]),
  };
}

function organizationLayer(
  organizationId: OrganizationId,
  membership: OrganizationMembership | null,
): Layer {
  return {
    scopeType: "organization",
    scopeId: organizationId,
    roles: [],
    baseline: new Set(membership ? contextualOrganizationRolePermissions(membership.role) : []),
  };
}

function competitionLayer(
  competitionId: CompetitionId,
  membership: CompetitionMembership | null,
  roster: OrganizationRosterActorAssignment | null,
): Layer {
  const baseline = new Set<Permission>();
  if (membership) {
    for (const permission of COMPETITION_ROLE_PERMISSIONS[membership.role])
      baseline.add(permission);
    for (const permission of contextualCompetitionRolePermissions(membership.role)) {
      baseline.add(permission);
    }
  } else if (roster) {
    for (const permission of COMPETITION_ROLE_PERMISSIONS[rosterPermissionRole(roster.role)]) {
      baseline.add(permission);
    }
  }
  return {
    scopeType: "competition",
    scopeId: competitionId,
    roles: [],
    baseline,
  };
}

function rosterPermissionRole(
  role: RosterMembershipRole,
): keyof typeof COMPETITION_ROLE_PERMISSIONS {
  switch (role) {
    case "vice_captain":
      return "captain";
    case "captain":
    case "player":
      return role;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function displayRole(
  membership: CompetitionMembership | null,
  roster: OrganizationRosterActorAssignment | null,
): MemberCompetitionRole | null {
  return membership?.role ?? roster?.role ?? null;
}

function assignmentKey(actorId: ActorId, competitionId: CompetitionId): string {
  return `${actorId}:${competitionId}`;
}

function indexAssignments<
  T extends { readonly actorId: ActorId; readonly competitionId: CompetitionId },
>(rows: readonly T[]): Map<string, T> {
  const indexed = new Map<string, T>();
  for (const row of rows) indexed.set(assignmentKey(row.actorId, row.competitionId), row);
  return indexed;
}

function uniqueActorIds(actorIds: readonly ActorId[]): ActorId[] {
  return [...new Set(actorIds)];
}
