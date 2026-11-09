import { describe, expect, it, vi } from "vite-plus/test";
import { InMemoryCompetitionEntryRepository } from "@/adapters/competitions/competition-entry.repositories.ts";
import {
  InMemoryCompetitionMembershipRepository,
  InMemoryCompetitionRepository,
} from "@/adapters/competitions/in-memory.repository.ts";
import { createInMemoryAuthorizationStore } from "@/adapters/authorization/in-memory.repository.ts";
import {
  InMemoryMembershipRepository,
  InMemoryOrganizationRepository,
} from "@/adapters/organizations/in-memory.repository.ts";
import { InMemoryPlayerProfileRepository } from "@/adapters/teams/in-memory.repository.ts";
import { InMemoryOrganizationRosterActorReader } from "@/adapters/teams/organization-roster-actor.reader.ts";
import {
  InMemoryCompetitionRosterMembershipRepository,
  InMemoryTeamRepository,
} from "@/adapters/teams/team-roster.repositories.ts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import {
  DEFAULT_ORGANIZATION_LOGO,
  MEMBER_DIRECTORY_CATALOG_LIMIT,
  parseOrganizationSlug,
  type AccessGrant,
  type OrganizationMembership,
} from "@futrob/organizations";
import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type ActorId,
  type CompetitionId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type { OrganizationRosterActorAssignment } from "@futrob/teams";
import { ContextualAuthorizationAdapter } from "./contextual-authorization.adapter.ts";
import {
  OrganizationMemberAccessSummarizerAdapter,
  summarizeMemberCompetitionAccess,
} from "./organization-member-access.ts";

const now = new Date("2026-08-07T12:00:00.000Z");
const orgA = asOrganizationId("org-a");
const orgB = asOrganizationId("org-b");
const compA = asCompetitionId("comp-a");
const compB = asCompetitionId("comp-b");
const compForeign = asCompetitionId("comp-foreign");
const teamA = asTeamId("team-a");
const organizer = asActorId("organizer");
const staff = asActorId("staff");
const plain = asActorId("plain");
const captain = asActorId("captain");
const vice = asActorId("vice");
const roleless = asActorId("roleless");
const reader = asActorId("reader");
const superuser = asActorId("superuser");

describe("organization member access", () => {
  it("loads the catalog and each supporting read once, including a caller who is not a member", async () => {
    const calls = { catalog: 0, memberships: 0, rosters: 0, grants: 0, superusers: 0 };
    let actorIds: readonly ActorId[] = [];
    const summarizer = new OrganizationMemberAccessSummarizerAdapter({
      competitions: {
        listNamesByOrganization: async () => {
          calls.catalog += 1;
          return [{ id: compA, name: "Copa" }];
        },
      },
      competitionMemberships: {
        listForOrganizationActors: async (_organizationId, ids) => {
          calls.memberships += 1;
          actorIds = ids;
          return [];
        },
      },
      rosters: {
        listByOrganizationActors: async () => {
          calls.rosters += 1;
          return [];
        },
      },
      grants: {
        listForOrganizationActors: async () => {
          calls.grants += 1;
          return [];
        },
      },
      platformRoles: {
        listSuperusersAmong: async () => {
          calls.superusers += 1;
          return [];
        },
      },
    });

    const access = await summarizer.summarize({
      organizationId: orgA,
      callerId: reader,
      members: [member(staff, "staff"), member(plain, "member")],
    });

    expect(access.isOk()).toBe(true);
    expect(calls).toEqual({ catalog: 1, memberships: 1, rosters: 1, grants: 1, superusers: 1 });
    expect(actorIds).toEqual([reader, staff, plain]);
  });

  it("skips every read when the organization has no members", async () => {
    const catalog = vi.fn(async () => []);
    const summarizer = new OrganizationMemberAccessSummarizerAdapter({
      competitions: { listNamesByOrganization: catalog },
      competitionMemberships: { listForOrganizationActors: async () => [] },
      rosters: { listByOrganizationActors: async () => [] },
      grants: { listForOrganizationActors: async () => [] },
      platformRoles: { listSuperusersAmong: async () => [] },
    });

    const access = await summarizer.summarize({
      organizationId: orgA,
      callerId: reader,
      members: [],
    });

    expect(access.isOk() && access.value.size).toBe(0);
    expect(catalog).not.toHaveBeenCalled();
  });

  it("stops before the other reads when the catalog exceeds the ceiling", async () => {
    const memberships = vi.fn(async () => []);
    const summarizer = new OrganizationMemberAccessSummarizerAdapter({
      competitions: {
        listNamesByOrganization: async (_organizationId, limit) => {
          expect(limit).toBe(MEMBER_DIRECTORY_CATALOG_LIMIT + 1);
          return Array.from({ length: limit }, (_, index) => ({
            id: asCompetitionId(`comp-${index}`),
            name: `Competition ${index}`,
          }));
        },
      },
      competitionMemberships: { listForOrganizationActors: memberships },
      rosters: { listByOrganizationActors: async () => [] },
      grants: { listForOrganizationActors: async () => [] },
      platformRoles: { listSuperusersAmong: async () => [] },
    });

    const access = await summarizer.summarize({
      organizationId: orgA,
      callerId: organizer,
      members: [member(staff, "staff")],
    });

    expect(access.isOk()).toBe(false);
    if (!access.isOk()) {
      expect(access.error.code).toBe("organizations.member_directory_catalog_limit_reached");
    }
    expect(memberships).not.toHaveBeenCalled();
  });

  it("matches competition read bits and keeps inherited, restricted, assigned, and absent access distinct", async () => {
    const world = await createWorld();
    await world.grants.upsert(
      grant(staff, "deny", COMPETITION_PERMISSION.update, "organization", orgA),
    );
    await world.competitionMemberships.add({
      organizationId: orgA,
      competitionId: compA,
      actorId: captain,
      role: "captain",
      createdAt: now,
    });
    await world.rosters.add({
      id: "roster-captain",
      organizationId: orgA,
      competitionId: compA,
      teamId: teamA,
      playerProfileId: "profile-captain",
      gameAccountId: null,
      role: "vice_captain",
      createdAt: now,
    });
    await world.profiles.saveIfAbsent({ id: "profile-captain", actorId: captain, createdAt: now });
    await world.profiles.saveIfAbsent({ id: "profile-vice", actorId: vice, createdAt: now });
    await world.rosters.add({
      id: "roster-vice",
      organizationId: orgA,
      competitionId: compB,
      teamId: teamA,
      playerProfileId: "profile-vice",
      gameAccountId: null,
      role: "vice_captain",
      createdAt: now,
    });
    await world.grants.upsert(
      grant(roleless, "allow", COMPETITION_PERMISSION.read, "competition", compA),
    );
    await world.competitionMemberships.add({
      organizationId: orgB,
      competitionId: compForeign,
      actorId: plain,
      role: "captain",
      createdAt: now,
    });
    await world.grants.upsert(
      grant(plain, "allow", COMPETITION_PERMISSION.read, "competition", compForeign, orgB),
    );

    const summarized = await world.summarizer.summarize({
      organizationId: orgA,
      callerId: organizer,
      members: world.members,
    });
    if (!summarized.isOk()) throw new Error(summarized.error.code);
    const access = summarized.value;

    expect(access.get(organizer)).toEqual({ kind: "inherited" });
    expect(access.get(staff)).toMatchObject({ kind: "inherited-with-restriction" });
    const staffAccess = access.get(staff);
    expect(staffAccess?.kind === "inherited-with-restriction" && staffAccess.competitions).toEqual([
      { competitionId: compA, name: "Copa A", read: "allowed", role: null },
      { competitionId: compB, name: "Copa B", read: "allowed", role: null },
    ]);
    expect(access.get(plain)).toEqual({ kind: "none" });
    expect(access.get(captain)).toEqual({
      kind: "assigned",
      competitions: [{ competitionId: compA, name: "Copa A", read: "allowed", role: "captain" }],
    });
    expect(access.get(vice)).toEqual({
      kind: "assigned",
      competitions: [
        { competitionId: compB, name: "Copa B", read: "allowed", role: "vice_captain" },
      ],
    });
    expect(access.get(roleless)).toEqual({
      kind: "assigned",
      competitions: [{ competitionId: compA, name: "Copa A", read: "allowed", role: null }],
    });

    for (const actorId of [organizer, staff, plain, captain, vice, roleless]) {
      for (const competitionId of [compA, compB]) {
        expect(await world.readAllowed(actorId, competitionId)).toBe(
          directoryRead(access.get(actorId), competitionId),
        );
      }
    }
  });

  it("treats an organization deny followed by a competition allow as specific access", async () => {
    const world = await createWorld();
    await world.grants.upsert(
      grant(staff, "deny", COMPETITION_PERMISSION.read, "organization", orgA),
    );
    await world.grants.upsert(
      grant(staff, "allow", COMPETITION_PERMISSION.read, "competition", compA),
    );

    const access = await summarize(world, organizer);
    expect(access.get(staff)).toEqual({
      kind: "assigned",
      competitions: [{ competitionId: compA, name: "Copa A", read: "allowed", role: null }],
    });
    expect(await world.readAllowed(staff, compA)).toBe(true);
    expect(await world.readAllowed(staff, compB)).toBe(false);
  });

  it("keeps a competition read bit when a narrower competition-permission deny blocks inherited access", async () => {
    const world = await createWorld();
    await world.grants.upsert(grant(staff, "deny", COMPETITION_PERMISSION.read, "team", teamA));

    const access = await summarize(world, organizer);
    expect(access.get(staff)?.kind).toBe("inherited-with-restriction");
    expect(await world.readAllowed(staff, compA)).toBe(true);
    expect(directoryRead(access.get(staff), compA)).toBe(true);
  });

  it("lets a grant-only caller see the catalog and hides competitions that caller cannot read", async () => {
    const world = await createWorld();
    await world.grants.upsert(
      grant(reader, "allow", COMPETITION_PERMISSION.read, "organization", orgA),
    );
    const visible = await summarize(world, reader);
    expect(visible.get(staff)).toEqual({ kind: "inherited" });

    await world.grants.upsert(
      grant(reader, "deny", COMPETITION_PERMISSION.read, "competition", compB),
    );
    const hidden = await summarize(world, reader);
    expect(hidden.get(staff)).toEqual({
      kind: "inherited-with-restriction",
      competitions: [{ competitionId: compA, name: "Copa A", read: "allowed", role: null }],
    });
    expect(JSON.stringify(hidden.get(captain))).not.toContain("Copa B");
  });

  it("lets a platform reader without a membership see every competition name", async () => {
    const world = await createWorld();
    await world.platformRoles.assignSuperuser({
      actorId: superuser,
      role: "superuser",
      assignedByActorId: superuser,
      createdAt: now,
    });

    const access = await summarize(world, superuser);
    expect(access.get(organizer)).toEqual({ kind: "inherited" });
    expect(access.get(plain)).toEqual({ kind: "none" });
  });

  it("applies platform allows and denies with the normal competition resolver", async () => {
    const world = await createWorld();
    await world.grants.upsert(
      grant(plain, "allow", COMPETITION_PERMISSION.read, "platform", "platform"),
    );
    let access = await summarize(world, organizer);
    expect(access.get(plain)).toEqual({ kind: "inherited" });
    expect(await world.readAllowed(plain, compA)).toBe(true);
    await world.grants.upsert(
      grant(plain, "deny", COMPETITION_PERMISSION.update, "platform", "platform"),
    );
    access = await summarize(world, organizer);
    expect(access.get(plain)?.kind).toBe("inherited-with-restriction");
    expect(directoryRead(access.get(plain), compA)).toBe(await world.readAllowed(plain, compA));
  });

  it("ignores another organization's memberships and grants", () => {
    const access = summarizeMemberCompetitionAccess({
      organizationId: orgA,
      callerId: organizer,
      members: [member(plain, "member")],
      catalog: [{ id: compA, name: "Copa A" }],
      competitionMemberships: [
        {
          organizationId: orgB,
          competitionId: compA,
          actorId: plain,
          role: "captain",
          createdAt: now,
        },
      ],
      rosterAssignments: [] satisfies readonly OrganizationRosterActorAssignment[],
      grants: [grant(plain, "allow", COMPETITION_PERMISSION.read, "competition", compA, orgB)],
      superuserIds: new Set(),
    });

    expect(access.get(plain)).toEqual({ kind: "none" });
  });
});

async function createWorld() {
  const organizations = new InMemoryOrganizationRepository();
  const organizationMemberships = new InMemoryMembershipRepository(organizations);
  const competitions = new InMemoryCompetitionRepository();
  const competitionMemberships = new InMemoryCompetitionMembershipRepository();
  const profiles = new InMemoryPlayerProfileRepository();
  const rosters = new InMemoryCompetitionRosterMembershipRepository();
  const store = createInMemoryAuthorizationStore();
  const slugA = parseOrganizationSlug("members-a");
  const slugB = parseOrganizationSlug("members-b");
  if (!slugA || !slugB) throw new Error("fixture slug must be valid");
  await organizations.create({
    id: orgA,
    name: "Members A",
    normalizedName: "members a",
    slug: slugA,
    timeZone: "UTC",
    logo: DEFAULT_ORGANIZATION_LOGO,
    createdAt: now,
    createdByActorId: organizer,
  });
  await organizations.create({
    id: orgB,
    name: "Members B",
    normalizedName: "members b",
    slug: slugB,
    timeZone: "UTC",
    logo: DEFAULT_ORGANIZATION_LOGO,
    createdAt: now,
    createdByActorId: organizer,
  });
  await saveCompetition(competitions, compA, orgA, "Copa A");
  await saveCompetition(competitions, compB, orgA, "Copa B");
  await saveCompetition(competitions, compForeign, orgB, "Foreign");
  const members = [
    member(organizer, "organizer"),
    member(staff, "staff"),
    member(plain, "member"),
    member(captain, "member"),
    member(vice, "member"),
    member(roleless, "member"),
  ];
  for (const row of members) await organizationMemberships.add(row);

  const authorization = new ContextualAuthorizationAdapter({
    organizations,
    organizationMemberships,
    competitionMemberships,
    competitions,
    entries: new InMemoryCompetitionEntryRepository(),
    teams: new InMemoryTeamRepository(),
    profiles,
    rosters,
    grants: store.grants,
    platformRoles: store.platformRoles,
  });
  const summarizer = new OrganizationMemberAccessSummarizerAdapter({
    competitions,
    competitionMemberships,
    rosters: new InMemoryOrganizationRosterActorReader(rosters, profiles),
    grants: store.grants,
    platformRoles: store.platformRoles,
  });

  return {
    grants: store.grants,
    platformRoles: store.platformRoles,
    competitionMemberships,
    rosters,
    profiles,
    members,
    summarizer,
    async readAllowed(actorId: ActorId, competitionId: CompetitionId) {
      const effective = await authorization.getEffectiveAccess({
        actorId,
        scope: { organizationId: orgA, competitionId },
        permissions: [COMPETITION_PERMISSION.read],
      });
      return effective.permissions.some(
        (permission) => permission.permission === COMPETITION_PERMISSION.read && permission.allowed,
      );
    },
  };
}

async function summarize(world: Awaited<ReturnType<typeof createWorld>>, callerId: ActorId) {
  const result = await world.summarizer.summarize({
    organizationId: orgA,
    callerId,
    members: world.members,
  });
  if (!result.isOk()) throw new Error(result.error.code);
  return result.value;
}

function directoryRead(
  access:
    | {
        readonly kind: string;
        readonly competitions?: readonly {
          readonly competitionId: CompetitionId;
          readonly read: string;
        }[];
      }
    | undefined,
  competitionId: CompetitionId,
): boolean {
  if (!access) return false;
  if (access.kind === "inherited") return true;
  if (access.kind === "none") return false;
  return (
    access.competitions?.find((competition) => competition.competitionId === competitionId)
      ?.read === "allowed"
  );
}

function member(actorId: ActorId, role: OrganizationMembership["role"]): OrganizationMembership {
  return { organizationId: orgA, actorId, role, createdAt: now };
}

function grant(
  actorId: ActorId,
  effect: "allow" | "deny",
  permission: AccessGrant["permission"],
  scopeType: AccessGrant["scopeType"],
  scopeId: string,
  organizationId: OrganizationId | null = orgA,
): AccessGrant {
  return {
    id: `${actorId}:${permission}:${effect}:${scopeType}:${scopeId}`,
    organizationId: scopeType === "platform" ? null : organizationId,
    actorId,
    permission,
    effect,
    scopeType,
    scopeId,
    grantedByActorId: organizer,
    reason: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function saveCompetition(
  competitions: InMemoryCompetitionRepository,
  id: CompetitionId,
  organizationId: OrganizationId,
  name: string,
) {
  await competitions.saveDraft({
    competition: {
      id,
      organizationId,
      name,
      status: "draft",
      modality: "fc-clubs",
      gameEdition: "fc26",
      platform: "playstation",
      region: "south-america",
      timeZone: "America/Lima",
      format: "league",
      teams: { min: 2, max: null },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
      createdByActorId: organizer,
      createdAt: now,
      updatedAt: now,
    },
    rules: {
      competitionId: id,
      version: 1,
      regularStage: null,
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: 11,
      rankingEligibility: null,
      createdAt: now,
    },
  });
}
