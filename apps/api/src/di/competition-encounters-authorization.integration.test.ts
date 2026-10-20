import { parseOrganizationSlug } from "@futrob/organizations";
import {
  asFixtureRoundId,
  asFixtureStageId,
  ENCOUNTER_PERMISSION,
  type FixtureEncounter,
  type FixturePlan,
} from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type ActorId,
  type CompetitionId,
  type EncounterId,
  type TeamId,
} from "@futrob/shared-kernel";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { stubFetch } from "@/http/http-app.harness.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import { createModules, type AppModules } from "./create-modules.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const TEST_TIMEOUT_MS = 180_000;

const SEEDED_AT = new Date("2026-10-01T12:00:00.000Z");
const KICKOFF = new Date("2026-11-02T01:00:00.000Z");
const ORG = asOrganizationId("org-encounter-list");
const FOREIGN_ORG = asOrganizationId("org-encounter-list-foreign");
const SMALL = asCompetitionId("competition-encounter-list-small");
const LARGE = asCompetitionId("competition-encounter-list-large");
const HOME = asTeamId("team-encounter-list-home");
const RIVAL = asTeamId("team-encounter-list-rival");
const OTHER = asTeamId("team-encounter-list-other");
const ORGANIZER = asActorId("actor-encounter-list-organizer");
const STAFF = asActorId("actor-encounter-list-staff");
const CAPTAIN = asActorId("actor-encounter-list-captain");
const OUTSIDER = asActorId("actor-encounter-list-outsider");
const FOREIGN_ORGANIZER = asActorId("actor-encounter-list-foreign-organizer");

suite("competition Encounter list authorization on Postgres", () => {
  let isolated: IsolatedSchema;
  let modules: AppModules;

  beforeEach(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "encounter_list_authorization");
    await migrateIsolatedSchema(isolated.pool);
    modules = createModules({
      fetcher: stubFetch,
      eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
      pool: isolated.pool,
    });
    await seed(modules, isolated);
  }, TEST_TIMEOUT_MS);

  afterEach(async () => {
    vi.restoreAllMocks();
    await isolated?.drop();
  }, TEST_TIMEOUT_MS);

  const ownOf = (competitionId: CompetitionId) => asEncounterId(`${competitionId}:own`);
  const othersOf = (competitionId: CompetitionId, count: number) =>
    Array.from({ length: count }, (_, index) => asEncounterId(`${competitionId}:other-${index}`));

  async function list(actorId: ActorId, competitionId: CompetitionId, organizationId = ORG) {
    const result = await modules.listCompetitionEncounters.execute({
      actorId,
      organizationId,
      competitionId,
    });
    return result ? result.encounters.map((entry) => entry.encounterId).sort() : null;
  }

  async function grant(actorId: ActorId, encounterId: EncounterId, effect: "allow" | "deny") {
    await modules.organizations.repositories.grants.upsert({
      id: `${effect}:${actorId}:${encounterId}`,
      organizationId: ORG,
      actorId,
      permission: ENCOUNTER_PERMISSION.read,
      effect,
      scopeType: "encounter",
      scopeId: encounterId,
      grantedByActorId: ORGANIZER,
      reason: null,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    });
  }

  /** SQL statements the listing sends to Postgres for one actor. */
  async function statements(actorId: ActorId, competitionId: CompetitionId) {
    const query = vi.spyOn(isolated.pool, "query");
    await list(actorId, competitionId);
    const count = query.mock.calls.length;
    query.mockRestore();
    return count;
  }

  it(
    "honours Encounter denials and grants per actor and keeps tenants apart",
    async () => {
      const others = othersOf(LARGE, 50);
      await grant(STAFF, ownOf(LARGE), "deny");
      await grant(CAPTAIN, others[0]!, "allow");
      await grant(OUTSIDER, others[1]!, "allow");

      expect(await list(ORGANIZER, LARGE)).toEqual([ownOf(LARGE), ...others].sort());
      expect(await list(STAFF, LARGE)).toEqual([...others].sort());
      expect(await list(CAPTAIN, LARGE)).toEqual([ownOf(LARGE), others[0]].sort());
      expect(await list(OUTSIDER, LARGE)).toEqual([others[1]]);
      expect(await list(OUTSIDER, SMALL)).toBeNull();
      expect(await list(FOREIGN_ORGANIZER, LARGE)).toBeNull();
      expect(await list(FOREIGN_ORGANIZER, LARGE, FOREIGN_ORG)).toBeNull();

      await grant(CAPTAIN, ownOf(LARGE), "deny");
      expect(await list(CAPTAIN, LARGE)).toEqual([others[0]]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "sends as many statements for 51 Encounters as for 2",
    async () => {
      await grant(STAFF, ownOf(LARGE), "deny");
      await grant(STAFF, ownOf(SMALL), "deny");
      for (const actorId of [STAFF, CAPTAIN, OUTSIDER]) {
        const small = await statements(actorId, SMALL);
        const large = await statements(actorId, LARGE);
        expect({ actorId, large }).toEqual({ actorId, large: small });
      }
    },
    TEST_TIMEOUT_MS,
  );

  async function seed(app: AppModules, schema: IsolatedSchema) {
    await seedActors(schema.pool, ORGANIZER, STAFF, CAPTAIN, OUTSIDER, FOREIGN_ORGANIZER);
    for (const [id, slug, organizer] of [
      [ORG, "org-encounter-list", ORGANIZER],
      [FOREIGN_ORG, "org-encounter-list-foreign", FOREIGN_ORGANIZER],
    ] as const) {
      await app.organizations.repositories.organizations.create({
        id,
        name: slug,
        normalizedName: slug,
        slug: parseOrganizationSlug(slug)!,
        timeZone: "America/Lima",
        logo: { kind: "monogram" },
        createdAt: SEEDED_AT,
        createdByActorId: organizer,
      });
      await app.organizations.repositories.memberships.add({
        organizationId: id,
        actorId: organizer,
        role: "organizer",
        createdAt: SEEDED_AT,
      });
    }
    await app.organizations.repositories.memberships.add({
      organizationId: ORG,
      actorId: STAFF,
      role: "staff",
      createdAt: SEEDED_AT,
    });
    for (const team of [HOME, RIVAL, OTHER]) {
      await app.teams.repositories.teams.save({
        id: team,
        organizationId: ORG,
        name: team,
        createdAt: SEEDED_AT,
        createdByActorId: ORGANIZER,
        creationKey: null,
      });
    }
    const profile = await app.teams.repositories.profiles.saveIfAbsent({
      id: `profile-${CAPTAIN}`,
      actorId: CAPTAIN,
      createdAt: SEEDED_AT,
    });
    for (const [competitionId, otherCount] of [
      [SMALL, 1],
      [LARGE, 50],
    ] as const) {
      await competition(app, competitionId);
      for (const team of [HOME, RIVAL, OTHER]) {
        await app.competitions.entryRepository.save({
          id: `entry-${competitionId}-${team}`,
          organizationId: ORG,
          competitionId,
          teamId: team,
          status: "approved",
          createdAt: SEEDED_AT,
          creationKey: null,
        });
      }
      await app.teams.repositories.rosters.add({
        id: `roster-${competitionId}-${CAPTAIN}`,
        organizationId: ORG,
        competitionId,
        teamId: HOME,
        playerProfileId: profile.id,
        gameAccountId: null,
        role: "captain",
        createdAt: SEEDED_AT,
      });
      const encounters: [EncounterId, TeamId, TeamId][] = [
        [ownOf(competitionId), HOME, RIVAL],
        ...othersOf(competitionId, otherCount).map((id): [EncounterId, TeamId, TeamId] => [
          id,
          RIVAL,
          OTHER,
        ]),
      ];
      const stageId = asFixtureStageId(`${competitionId}:stage:1`);
      const roundId = asFixtureRoundId(`${stageId}:round:1`);
      for (const [encounterId, homeTeamId, awayTeamId] of encounters) {
        await app.scheduling.encounters.upsert({
          encounterId,
          organizationId: ORG,
          competitionId,
          stageId,
          homeTeamId,
          awayTeamId,
          scheduledStartAt: KICKOFF,
          officialMatchCount: 1,
        });
      }
      const fixtureEncounters = encounters.map(([id, home, away], index): FixtureEncounter => ({
        id,
        stageId,
        roundId,
        order: index + 1,
        home: { kind: "team", teamId: home },
        away: { kind: "team", teamId: away },
        scheduledStartAt: KICKOFF,
        officialMatchCount: 1,
        series: null,
      }));
      const plan: FixturePlan = {
        id: `${competitionId}:plan`,
        revision: 1,
        status: "active",
        generationKey: `${competitionId}:key`,
        generationFingerprint: `${competitionId}:fingerprint`,
        organizationId: ORG,
        competitionId,
        rulesVersion: 1,
        generationVersion: 1,
        format: "league",
        timeZone: "America/Lima",
        homeAndAway: false,
        seed: [HOME, RIVAL, OTHER],
        stages: [
          {
            id: stageId,
            kind: "league",
            order: 1,
            rounds: [
              {
                id: roundId,
                stageId,
                number: 1,
                scheduledStartAt: KICKOFF,
                encounters: fixtureEncounters,
              },
            ],
          },
        ],
      };
      await app.scheduling.fixturePlans.save(plan);
    }
  }
});

async function competition(app: AppModules, id: CompetitionId) {
  await app.competitions.repository.saveDraft({
    competition: {
      id,
      organizationId: ORG,
      name: id,
      status: "published",
      modality: "fc-clubs",
      gameEdition: "fc26",
      platform: "playstation",
      region: "south-america",
      timeZone: "America/Lima",
      format: "league",
      teams: { min: 2, max: null },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
      createdByActorId: ORGANIZER,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    rules: {
      competitionId: id,
      version: 1,
      regularStage: {
        officialMatchesPerEncounter: 1,
        resolutionMode: "independent_matches",
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        allowRescheduling: true,
        maxReschedulesPerTeam: 2,
        minimumRescheduleNoticeHours: 12,
        rescheduleProposalExpiryHours: 12,
        rescheduleRequiresOpponentApproval: true,
        rescheduleRequiresOrganizerApproval: false,
      },
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: 11,
      createdAt: SEEDED_AT,
    },
  });
}
