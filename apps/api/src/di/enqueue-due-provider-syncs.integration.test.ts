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
import { assignOrganizationPlanForTest } from "@/testing/organization-plan.fixture.ts";
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
      expect(second).toMatchObject({ enqueued: 0, alreadyCovered: 0, jobs: [] });
      expect(index.rows.map((row) => row.indexname)).toEqual(["provider_sync_jobs_dedupe_latest"]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "defers automatic syncs at the quota limit and resumes without exceeding the available units",
    async () => {
      const modules = createModules({
        pool: isolated.pool,
        clock: { now: () => NOW },
        fetcher: async () => {
          throw new Error("Enqueue must not call EA");
        },
        eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
      });
      await seedActors(isolated.pool, CREATOR);
      await seedOrganization(modules);
      await seedClub(
        modules,
        asTeamId("quota-team"),
        "quota-club",
        asEncounterId("quota-encounter"),
        NOW,
        "scheduled",
      );
      await isolated.pool.query(`UPDATE billing_plans SET entitlements = jsonb_set(
      entitlements, '{quotas,provider_sync_jobs,amount}', '0') WHERE key = 'free'`);
      expect(await modules.gameData.enqueueDueProviderSyncs.execute()).toMatchObject({
        enqueued: 0,
        alreadyCovered: 0,
        deferred: 3,
        jobs: [],
      });
      await isolated.pool.query(`UPDATE billing_plans SET entitlements = jsonb_set(
      entitlements, '{quotas,provider_sync_jobs,amount}', '1') WHERE key = 'free'`);
      expect(await modules.gameData.enqueueDueProviderSyncs.execute()).toMatchObject({
        enqueued: 1,
        deferred: 2,
      });
      const stored = await isolated.pool.query(
        `SELECT
      (SELECT COUNT(*)::int FROM provider_sync_jobs WHERE organization_id = $1) AS jobs,
      (SELECT COUNT(*)::int FROM billing_quota_consumptions WHERE organization_id = $1) AS usage`,
        [ORG],
      );
      expect(stored.rows[0]).toEqual({ jobs: 1, usage: 1 });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "reaches all 82 open clubs across ticks, beyond both former scan limits",
    async () => {
      let currentTime = NOW;
      const modules = createModules({
        fetcher: async () => {
          throw new Error("Enqueuing must not call EA");
        },
        eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
        pool: isolated.pool,
        clock: { now: () => currentTime },
      });
      await seedActors(isolated.pool, CREATOR);
      await seedOrganization(modules);
      await assignOrganizationPlanForTest(modules, { organizationId: ORG, actorId: CREATOR });
      for (let index = 0; index < 82; index += 1) {
        const suffix = String(index).padStart(3, "0");
        await seedClub(
          modules,
          asTeamId(`team-${suffix}`),
          `club-${suffix}`,
          asEncounterId(`encounter-${suffix}`),
          NOW,
          "scheduled",
        );
      }
      // Repeated slots for club 000 used to consume the entire 1000-row SQL prefix.
      await isolated.pool.query(`
      INSERT INTO encounter_schedule_snapshots
        (encounter_id, organization_id, competition_id, stage_id, home_team_id,
         away_team_id, scheduled_start_at, official_match_count)
      SELECT 'duplicate-' || n, organization_id, competition_id, stage_id, home_team_id,
             away_team_id, scheduled_start_at - interval '1 millisecond', 1
      FROM encounter_schedule_snapshots CROSS JOIN generate_series(1, 1001) AS n
      WHERE encounter_id = 'encounter-000'`);
      await isolated.pool.query(`
      INSERT INTO official_matches
        (id, encounter_id, organization_id, competition_id, slot, status, scheduled_start_at, created_at)
      SELECT encounter_id, encounter_id, organization_id, competition_id, 1, 'scheduled',
             scheduled_start_at, scheduled_start_at
      FROM encounter_schedule_snapshots WHERE encounter_id LIKE 'duplicate-%'`);

      const seen = new Set<string>();
      for (let tick = 0; tick < 13; tick += 1) {
        currentTime = new Date(NOW.getTime() + tick * 60_000);
        const result = await modules.gameData.enqueueDueProviderSyncs.execute();
        expect(result.enqueued).toBeLessThanOrEqual(20);
        for (const job of result.jobs) seen.add(job.id);
        // Keep a mix of active jobs and finished jobs still inside their cooldown.
        if (tick % 3 !== 0) {
          await isolated.pool.query(
            `UPDATE provider_sync_jobs SET status = $2, completed_at = $3,
             available_at = NULL, last_error_code = $4 WHERE id = ANY($1::text[])`,
            [
              result.jobs.map((job) => job.id),
              tick % 3 === 1 ? "succeeded" : "dead",
              currentTime.toISOString(),
              tick % 3 === 1 ? null : "game_data.test_failure",
            ],
          );
        }
      }
      expect(seen.size).toBe(246);
      const jobs = await isolated.pool.query(`
      SELECT input_json->>'externalClubId' AS club, count(*)::int AS total
      FROM provider_sync_jobs GROUP BY input_json->>'externalClubId'`);
      expect(jobs.rows).toHaveLength(82);
      expect(jobs.rows).toContainEqual({ club: "club-080", total: 3 });
      expect(jobs.rows).toContainEqual({ club: "club-081", total: 3 });
      expect(jobs.rows.every((row) => row.total === 3)).toBe(true);
      expect((await modules.gameData.enqueueDueProviderSyncs.execute()).enqueued).toBe(0);

      // The cutoff is inclusive: successes completed at minute 1 become due at minute 16.
      currentTime = new Date(NOW.getTime() + 16 * 60_000);
      expect((await modules.gameData.enqueueDueProviderSyncs.execute()).enqueued).toBe(20);
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
