import { parseOrganizationSlug } from "@futrob/organizations";
import { asFixtureStageId } from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOfficialMatchSlotId,
  asOrganizationId,
  asTeamId,
  type EncounterId,
  type TeamId,
} from "@futrob/shared-kernel";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
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
const NOW = new Date("2026-10-10T20:00:00.000Z");
const ORG = asOrganizationId("org-due-sync");
const COMPETITION = asCompetitionId("competition-due-sync");
const CREATOR = asActorId("actor-due-sync");

suite("enqueue due provider syncs on Postgres", () => {
  let isolated: IsolatedSchema;

  beforeEach(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "due_sync");
    await migrateIsolatedSchema(isolated.pool);
  }, TEST_TIMEOUT_MS);

  afterEach(async () => {
    await isolated?.drop();
  }, TEST_TIMEOUT_MS);

  it(
    "persists one job per match type for an open slot and skips clubs outside that window",
    async () => {
      let providerCalls = 0;
      const modules = createModules({
        fetcher: async () => {
          providerCalls += 1;
          return Response.json([]);
        },
        eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
        pool: isolated.pool,
        clock: { now: () => NOW },
      });
      await seedActors(isolated.pool, CREATOR);
      await seedOrganization(modules);
      await seedClub(
        modules,
        asTeamId("team-due-home"),
        "club-home",
        asEncounterId("encounter-due"),
        NOW,
        "scheduled",
      );
      await seedClub(
        modules,
        asTeamId("team-due-late"),
        "club-late",
        asEncounterId("encounter-late"),
        new Date(NOW.getTime() + 7 * 60 * 60 * 1000),
        "scheduled",
      );
      await seedClub(
        modules,
        asTeamId("team-due-selected"),
        "club-selected",
        asEncounterId("encounter-selected"),
        NOW,
        "selected",
      );

      const first = await modules.gameData.enqueueDueProviderSyncs.execute();
      const second = await modules.gameData.enqueueDueProviderSyncs.execute();
      const stored = await Promise.all(
        first.jobs.map((job) => modules.gameData.jobs.findById(job.id)),
      );
      const index = await isolated.pool.query<{ indexname: string }>(
        "SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'provider_sync_jobs_dedupe_latest'",
      );

      expect(providerCalls).toBe(0);
      expect(first.enqueued).toBe(3);
      expect(stored.map((job) => job?.sync.externalClubId)).toEqual([
        "club-home",
        "club-home",
        "club-home",
      ]);
      expect(stored.map((job) => job?.sync.matchType).sort()).toEqual([
        "friendlyMatch",
        "leagueMatch",
        "playoffMatch",
      ]);
      expect(second).toMatchObject({ enqueued: 0, alreadyCovered: 3, jobs: [] });
      expect(index.rows.map((row) => row.indexname)).toEqual(["provider_sync_jobs_dedupe_latest"]);
    },
    TEST_TIMEOUT_MS,
  );
});

async function seedOrganization(modules: AppModules): Promise<void> {
  await modules.organizations.repositories.organizations.create({
    id: ORG,
    name: "org-due-sync",
    normalizedName: "org-due-sync",
    slug: parseOrganizationSlug("org-due-sync")!,
    timeZone: "America/Lima",
    logo: { kind: "monogram" },
    createdAt: NOW,
    createdByActorId: CREATOR,
  });
  await modules.competitions.repository.saveDraft({
    competition: {
      id: COMPETITION,
      organizationId: ORG,
      name: "org-due-sync",
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
      createdByActorId: CREATOR,
      createdAt: NOW,
      updatedAt: NOW,
    },
    rules: {
      competitionId: COMPETITION,
      version: 1,
      regularStage: null,
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: 11,
      rankingEligibility: null,
      createdAt: NOW,
    },
  });
}

async function seedClub(
  modules: AppModules,
  teamId: TeamId,
  externalClubId: string,
  encounterId: EncounterId,
  scheduledStartAt: Date,
  status: "scheduled" | "selected",
): Promise<void> {
  const rivalId = asTeamId(`${teamId}-rival`);
  await modules.teams.repositories.teams.save({
    id: teamId,
    organizationId: ORG,
    name: teamId,
    createdAt: NOW,
    createdByActorId: CREATOR,
    creationKey: null,
  });
  await modules.teams.repositories.teams.save({
    id: rivalId,
    organizationId: ORG,
    name: rivalId,
    createdAt: NOW,
    createdByActorId: CREATOR,
    creationKey: null,
  });
  await modules.teams.externalClubConnections.upsert({
    teamId,
    providerKey: "ea-clubs",
    externalClubId,
    externalClubName: externalClubId,
    gameEdition: "fc26",
    platform: "common-gen5",
  });
  await modules.scheduling.encounters.upsert({
    encounterId,
    organizationId: ORG,
    competitionId: COMPETITION,
    stageId: asFixtureStageId(`stage-${encounterId}`),
    homeTeamId: teamId,
    awayTeamId: rivalId,
    scheduledStartAt,
    officialMatchCount: 1,
  });
  await modules.scheduling.officialMatches.upsertMany([
    {
      id: asOfficialMatchSlotId(`slot-${encounterId}`),
      encounterId,
      organizationId: ORG,
      competitionId: COMPETITION,
      slot: 1,
      status,
      scheduledStartAt,
      createdAt: NOW,
    },
  ]);
}
