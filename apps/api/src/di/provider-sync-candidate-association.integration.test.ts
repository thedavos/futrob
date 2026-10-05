import { parseOrganizationSlug } from "@futrob/organizations";
import type { EncounterCandidateAssociation } from "@futrob/results";
import { asFixtureStageId } from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type CompetitionId,
  type EncounterId,
  type OrganizationId,
  type TeamId,
} from "@futrob/shared-kernel";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Pool } from "pg";
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

const KICKOFF = new Date("2026-10-10T20:00:00.000Z");
const ORG = asOrganizationId("org-sync-association");
const COMPETITION = asCompetitionId("competition-sync-association");
const HOME = asTeamId("team-sync-home");
const AWAY = asTeamId("team-sync-away");
const ENCOUNTER = asEncounterId("encounter-sync-target");
const UNAFFECTED = asEncounterId("encounter-sync-unaffected");
const OTHER_TEAMS = asEncounterId("encounter-sync-other-teams");
const OTHER_EDITION = asEncounterId("encounter-sync-other-edition");
const OTHER_PLATFORM = asEncounterId("encounter-sync-other-platform");
const FOREIGN_ORG = asOrganizationId("org-sync-foreign");
const FOREIGN_COMPETITION = asCompetitionId("competition-sync-foreign");
const FOREIGN_HOME = asTeamId("team-sync-foreign-home");
const FOREIGN_AWAY = asTeamId("team-sync-foreign-away");
const FOREIGN_ENCOUNTER = asEncounterId("encounter-sync-foreign");
const CAPTAIN = asActorId("actor-sync-captain");
const CREATOR = asActorId("actor-sync-creator");

suite("provider sync candidate association on Postgres", () => {
  let isolated: IsolatedSchema;

  beforeEach(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "provider_sync_association");
    await migrateIsolatedSchema(isolated.pool);
  }, TEST_TIMEOUT_MS);

  afterEach(async () => {
    vi.restoreAllMocks();
    await isolated?.drop();
  }, TEST_TIMEOUT_MS);

  it(
    "recovers a crash after ingestion and converges tenant-scoped candidates without officializing",
    async () => {
      let providerCalls = 0;
      const fetcher: typeof fetch = async () => {
        providerCalls += 1;
        return Response.json(providerPayload());
      };
      const modules = createModules({
        fetcher,
        eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
        pool: isolated.pool,
      });
      await seedActors(isolated.pool, CAPTAIN, CREATOR);
      await seedScenario(modules);
      await seedUntouchedCandidate(modules, ORG, UNAFFECTED, "prior-unaffected");
      await seedUntouchedCandidate(modules, FOREIGN_ORG, FOREIGN_ENCOUNTER, "prior-foreign");
      for (const encounterId of [OTHER_TEAMS, OTHER_EDITION, OTHER_PLATFORM]) {
        await seedUntouchedCandidate(modules, ORG, encounterId, `prior-${encounterId}`);
      }
      const untouchedBefore = await untouchedContent();

      const queued = await modules.gameData.enqueueProviderSyncJob.execute({
        organizationId: ORG,
        providerKey: "ea-clubs",
        requestId: "request-sync-association",
        sync: {
          externalClubId: "club-home",
          platform: "common-gen5",
          gameEdition: "fc26",
          matchType: "friendlyMatch",
          maxResultCount: 10,
        },
      });
      vi.spyOn(modules.results.associateEncounterCandidates, "execute").mockRejectedValueOnce(
        new Error("simulated process crash after provider persistence"),
      );

      await expect(modules.gameData.executeProviderSyncJob.execute(queued.id)).rejects.toThrow(
        "simulated process crash after provider persistence",
      );

      await expect(persistedJobStatus(queued.id)).resolves.toBe("running");
      await expect(persistedExternalMatchIds()).resolves.toEqual(["m-1", "m-2"]);
      const matchIdentities = await isolated.pool.query(
        "SELECT id, external_match_id, home_goals, away_goals FROM provider_matches ORDER BY external_match_id",
      );
      expect(matchIdentities.rows).toEqual([
        { id: "ea-clubs:m-1", external_match_id: "m-1", home_goals: 2, away_goals: 1 },
        { id: "ea-clubs:m-2", external_match_id: "m-2", home_goals: 2, away_goals: 1 },
      ]);
      await expect(countRows("raw_provider_observations")).resolves.toBe(2);
      const checkpoint = await isolated.pool.query(
        "SELECT ingested_matches_json FROM provider_sync_jobs WHERE id = $1",
        [queued.id],
      );
      expect(checkpoint.rows[0].ingested_matches_json).toEqual([
        target("m-1", "2026-10-10T21:00:00.000Z"),
        target("m-2", "2026-10-11T03:00:00.000Z"),
      ]);
      await expect(candidateRefs(ORG, ENCOUNTER)).resolves.toEqual([]);
      await expect(candidateRefs(ORG, UNAFFECTED)).resolves.toEqual(["prior-unaffected"]);
      await expect(candidateRefs(FOREIGN_ORG, FOREIGN_ENCOUNTER)).resolves.toEqual([
        "prior-foreign",
      ]);

      await isolated.pool.query(
        `UPDATE provider_sync_jobs
         SET lease_expires_at = NOW() - INTERVAL '1 second'
         WHERE id = $1`,
        [queued.id],
      );
      const restartPool = new Pool({
        connectionString: databaseUrl,
        options: `-c search_path=${isolated.schema}`,
      });
      const restarted = createModules({
        // Recent matches can disappear from EA between ingestion and recovery.
        fetcher: async () => {
          providerCalls += 1;
          return Response.json([]);
        },
        eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
        pool: restartPool,
      });
      try {
        const recovered = await restarted.gameData.executeProviderSyncJob.execute(queued.id);

        expect(recovered).toMatchObject({ status: "succeeded", attempt: 2 });
        expect(await candidateRows(ORG, ENCOUNTER)).toEqual([
          {
            id: `${ORG}:${ENCOUNTER}:ea-clubs:m-1`,
            external_match_id: "m-1",
            eligible: true,
          },
        ]);
        expect(await candidateRefs(ORG, UNAFFECTED)).toEqual(["prior-unaffected"]);
        expect(await candidateRefs(FOREIGN_ORG, FOREIGN_ENCOUNTER)).toEqual(["prior-foreign"]);

        const beforeReplay = await candidateRows(ORG, ENCOUNTER);
        const replay = await restarted.gameData.executeProviderSyncJob.execute(queued.id);
        expect(replay).toMatchObject({ status: "succeeded", attempt: 2 });
        expect(await candidateRows(ORG, ENCOUNTER)).toEqual(beforeReplay);
        expect(await persistedExternalMatchIds()).toEqual(["m-1", "m-2"]);
        expect(await countRows("raw_provider_observations")).toBe(2);
        expect(
          (
            await isolated.pool.query(
              "SELECT id, external_match_id, home_goals, away_goals FROM provider_matches ORDER BY external_match_id",
            )
          ).rows,
        ).toEqual(matchIdentities.rows);
        expect(providerCalls).toBe(1);
        expect(await untouchedContent()).toEqual(untouchedBefore);

        // Compare with the normal path starting without any target associations.
        await isolated.pool.query(
          "DELETE FROM encounter_candidates WHERE organization_id = $1 AND encounter_id = $2",
          [ORG, ENCOUNTER],
        );
        await isolated.pool.query(
          "DELETE FROM encounter_candidate_sets WHERE organization_id = $1 AND encounter_id = $2",
          [ORG, ENCOUNTER],
        );
        const fresh = await modules.gameData.enqueueProviderSyncJob.execute({
          organizationId: ORG,
          providerKey: "ea-clubs",
          requestId: "request-fresh-sync",
          sync: queued.sync,
        });
        expect(await modules.gameData.executeProviderSyncJob.execute(fresh.id)).toMatchObject({
          status: "succeeded",
          attempt: 1,
        });
        expect(await candidateRows(ORG, ENCOUNTER)).toEqual(beforeReplay);
        expect(await persistedExternalMatchIds()).toEqual(["m-1", "m-2"]);
        expect(await countRows("raw_provider_observations")).toBe(2);
        expect(providerCalls).toBe(2);
        expect(await untouchedContent()).toEqual(untouchedBefore);
        const another = await enqueue(modules);
        expect(await modules.gameData.executeProviderSyncJob.execute(another.id)).toMatchObject({
          status: "succeeded",
          attempt: 1,
        });
        expect(await candidateRows(ORG, ENCOUNTER)).toEqual(beforeReplay);
        expect(await persistedExternalMatchIds()).toEqual(["m-1", "m-2"]);
        expect(await countRows("raw_provider_observations")).toBe(2);

        const listed = await restarted.results.listEncounterCandidates.execute({
          actorId: CAPTAIN,
          organizationId: ORG,
          encounterId: ENCOUNTER,
        });
        expect(
          listed.isOk() && listed.value.status === "ready"
            ? listed.value.candidates.map((candidate) => candidate.reference.externalId)
            : null,
        ).toEqual(["m-1"]);
        const foreign = await restarted.results.listEncounterCandidates.execute({
          actorId: CAPTAIN,
          organizationId: ORG,
          encounterId: FOREIGN_ENCOUNTER,
        });
        expect(foreign.isErr() && foreign.error.code).toBe("results.encounter_not_found");

        const outsideWindow = await restarted.officialSelection.propose.execute({
          actorId: CAPTAIN,
          organizationId: ORG,
          encounterId: ENCOUNTER,
          actingTeamId: HOME,
          selections: [slot("m-2")],
          expectedVersion: 0,
          commandKey: "outside-window",
        });
        expect(outsideWindow.isErr() && outsideWindow.error.code).toBe(
          "results.candidate_not_associated",
        );

        const eligible = await restarted.officialSelection.propose.execute({
          actorId: CAPTAIN,
          organizationId: ORG,
          encounterId: ENCOUNTER,
          actingTeamId: HOME,
          selections: [slot("m-1")],
          expectedVersion: 0,
          commandKey: "eligible-match",
        });
        expect(eligible.isOk() && eligible.value.selection.status).toBe(
          "awaiting_opponent_confirmation",
        );
        await expect(countRows("official_results")).resolves.toBe(0);
        await expect(countRows("team_match_contributions")).resolves.toBe(0);
        await expect(countRows("player_match_contributions")).resolves.toBe(0);
      } finally {
        await restartPool.end();
      }
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "persists a Results failure code and retries only the pending association",
    async () => {
      const modules = createModules({
        fetcher: async () => Response.json(providerPayload()),
        eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
        pool: isolated.pool,
      });
      await seedActors(isolated.pool, CAPTAIN, CREATOR);
      await seedScenario(modules);
      const queued = await enqueue(modules);
      vi.spyOn(modules.results.associations, "replaceForEncounter").mockRejectedValueOnce(
        new Error("candidate storage temporarily unavailable"),
      );

      expect(await modules.gameData.executeProviderSyncJob.execute(queued.id)).toMatchObject({
        status: "retry_scheduled",
        lastErrorCode: "results.candidate_data_unavailable",
      });
      const pending = await isolated.pool.query(
        "SELECT status, last_error_code, ingested_matches_json FROM provider_sync_jobs WHERE id = $1",
        [queued.id],
      );
      expect(pending.rows).toEqual([
        {
          status: "retry_scheduled",
          last_error_code: "results.candidate_data_unavailable",
          ingested_matches_json: [
            target("m-1", "2026-10-10T21:00:00.000Z"),
            target("m-2", "2026-10-11T03:00:00.000Z"),
          ],
        },
      ]);
      expect(await persistedExternalMatchIds()).toEqual(["m-1", "m-2"]);
      expect(await candidateRows(ORG, ENCOUNTER)).toEqual([]);
      await isolated.pool.query(
        "UPDATE provider_sync_jobs SET available_at = NOW() WHERE id = $1",
        [queued.id],
      );
      const restarted = createModules({
        fetcher: async () => {
          throw new Error("EA must not be needed for association recovery");
        },
        eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
        pool: isolated.pool,
      });
      expect(await restarted.gameData.executeProviderSyncJob.execute(queued.id)).toMatchObject({
        status: "succeeded",
        attempt: 2,
      });
      expect(await candidateRows(ORG, ENCOUNTER)).toEqual([
        {
          id: `${ORG}:${ENCOUNTER}:ea-clubs:m-1`,
          external_match_id: "m-1",
          eligible: true,
        },
      ]);
      expect(await countRows("official_results")).toBe(0);
      expect(await countRows("team_match_contributions")).toBe(0);
      expect(await countRows("player_match_contributions")).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "rolls back matches and raw observations when the checkpoint cannot commit",
    async () => {
      const modules = createModules({
        fetcher: async () => Response.json(providerPayload()),
        eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
        pool: isolated.pool,
      });
      await seedActors(isolated.pool, CAPTAIN, CREATOR);
      await seedScenario(modules);
      const queued = await enqueue(modules);
      vi.spyOn(modules.gameData.jobs, "recordIngestion").mockResolvedValueOnce(false);
      await expect(modules.gameData.executeProviderSyncJob.execute(queued.id)).rejects.toThrow(
        "Provider sync ingestion lease lost",
      );
      expect(await persistedExternalMatchIds()).toEqual([]);
      expect(await countRows("raw_provider_observations")).toBe(0);
      expect(await candidateRows(ORG, ENCOUNTER)).toEqual([]);
      const pending = await isolated.pool.query(
        "SELECT status, ingested_matches_json FROM provider_sync_jobs WHERE id = $1",
        [queued.id],
      );
      expect(pending.rows).toEqual([{ status: "running", ingested_matches_json: null }]);
      await isolated.pool.query(
        "UPDATE provider_sync_jobs SET lease_expires_at = NOW() WHERE id = $1",
        [queued.id],
      );
      expect(await modules.gameData.executeProviderSyncJob.execute(queued.id)).toMatchObject({
        status: "succeeded",
        attempt: 2,
      });
      expect(await persistedExternalMatchIds()).toEqual(["m-1", "m-2"]);
      expect(await candidateRefs(ORG, ENCOUNTER)).toEqual(["m-1"]);
    },
    TEST_TIMEOUT_MS,
  );

  function enqueue(modules: AppModules) {
    return modules.gameData.enqueueProviderSyncJob.execute({
      organizationId: ORG,
      providerKey: "ea-clubs",
      requestId: "request-sync-failure",
      sync: {
        externalClubId: "club-home",
        platform: "common-gen5",
        gameEdition: "fc26",
        matchType: "friendlyMatch",
        maxResultCount: 10,
      },
    });
  }

  async function countRows(table: string): Promise<number> {
    const result = await isolated.pool.query(`SELECT count(*)::int AS count FROM ${table}`);
    return Number(result.rows[0].count);
  }

  async function persistedJobStatus(jobId: string): Promise<string | null> {
    const result = await isolated.pool.query(
      "SELECT status FROM provider_sync_jobs WHERE id = $1",
      [jobId],
    );
    return result.rows[0]?.status ?? null;
  }

  async function persistedExternalMatchIds(): Promise<string[]> {
    const result = await isolated.pool.query(
      "SELECT external_match_id FROM provider_matches ORDER BY external_match_id ASC",
    );
    return result.rows.map((row) => String(row.external_match_id));
  }

  async function candidateRefs(
    organizationId: OrganizationId,
    encounterId: EncounterId,
  ): Promise<string[]> {
    return (await candidateRows(organizationId, encounterId)).map((row) => row.external_match_id);
  }

  async function candidateRows(organizationId: OrganizationId, encounterId: EncounterId) {
    const result = await isolated.pool.query(
      `SELECT id, external_match_id, eligible
       FROM encounter_candidates
       WHERE organization_id = $1 AND encounter_id = $2
       ORDER BY external_match_id ASC`,
      [organizationId, encounterId],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      external_match_id: String(row.external_match_id),
      eligible: Boolean(row.eligible),
    }));
  }

  async function untouchedContent() {
    const candidates = await isolated.pool.query(
      "SELECT * FROM encounter_candidates WHERE encounter_id = ANY($1::text[]) ORDER BY id",
      [[UNAFFECTED, FOREIGN_ENCOUNTER, OTHER_TEAMS, OTHER_EDITION, OTHER_PLATFORM]],
    );
    const generations = await isolated.pool.query(
      `SELECT * FROM encounter_candidate_sets
       WHERE encounter_id = ANY($1::text[]) ORDER BY encounter_id`,
      [[UNAFFECTED, FOREIGN_ENCOUNTER, OTHER_TEAMS, OTHER_EDITION, OTHER_PLATFORM]],
    );
    return { candidates: candidates.rows, generations: generations.rows };
  }
});

function target(externalMatchId: string, occurredAt: string) {
  return {
    provider: { key: "ea-clubs", externalMatchId },
    game: { edition: "fc26", platform: "common-gen5", mode: "friendlyMatch" },
    occurredAt,
    home: { externalClubId: "club-home" },
    away: { externalClubId: "club-away" },
  };
}

async function seedScenario(modules: AppModules): Promise<void> {
  await seedTenant(modules, {
    organizationId: ORG,
    competitionId: COMPETITION,
    slug: "org-sync-association",
    homeTeamId: HOME,
    awayTeamId: AWAY,
    homeClubId: "club-home",
    awayClubId: "club-away",
  });
  await seedTenant(modules, {
    organizationId: FOREIGN_ORG,
    competitionId: FOREIGN_COMPETITION,
    slug: "org-sync-foreign",
    homeTeamId: FOREIGN_HOME,
    awayTeamId: FOREIGN_AWAY,
    homeClubId: "club-home",
    awayClubId: "club-away",
  });
  const profile = await modules.teams.repositories.profiles.saveIfAbsent({
    id: "profile-sync-captain",
    actorId: CAPTAIN,
    createdAt: KICKOFF,
  });
  await modules.teams.repositories.rosters.add({
    id: "roster-sync-captain",
    organizationId: ORG,
    competitionId: COMPETITION,
    teamId: HOME,
    playerProfileId: profile.id,
    gameAccountId: null,
    role: "captain",
    createdAt: KICKOFF,
  });
  await upsertEncounter(modules, ORG, COMPETITION, HOME, AWAY, ENCOUNTER, KICKOFF);
  for (const [teamId, clubId, edition, platform, encounterId] of [
    [asTeamId("team-other-club"), "club-other", "fc26", "common-gen5", OTHER_TEAMS],
    [asTeamId("team-other-edition"), "club-home", "fc25", "common-gen5", OTHER_EDITION],
    [asTeamId("team-other-platform"), "club-home", "fc26", "common-gen4", OTHER_PLATFORM],
  ] as const) {
    await modules.teams.repositories.teams.save({
      id: teamId,
      organizationId: ORG,
      name: teamId,
      createdAt: KICKOFF,
      createdByActorId: CREATOR,
      creationKey: null,
    });
    await modules.teams.externalClubConnections.upsert({
      teamId,
      providerKey: "ea-clubs",
      externalClubId: clubId,
      externalClubName: clubId,
      gameEdition: edition,
      platform,
    });
    await upsertEncounter(
      modules,
      ORG,
      COMPETITION,
      encounterId === OTHER_TEAMS ? HOME : teamId,
      encounterId === OTHER_TEAMS ? teamId : AWAY,
      encounterId,
      KICKOFF,
    );
  }
  await upsertEncounter(
    modules,
    ORG,
    COMPETITION,
    HOME,
    AWAY,
    UNAFFECTED,
    new Date("2026-10-11T16:00:00.000Z"),
  );
  await upsertEncounter(
    modules,
    FOREIGN_ORG,
    FOREIGN_COMPETITION,
    FOREIGN_HOME,
    FOREIGN_AWAY,
    FOREIGN_ENCOUNTER,
    KICKOFF,
  );
}

async function seedTenant(
  modules: AppModules,
  input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly slug: string;
    readonly homeTeamId: TeamId;
    readonly awayTeamId: TeamId;
    readonly homeClubId: string;
    readonly awayClubId: string;
  },
): Promise<void> {
  await modules.organizations.repositories.organizations.create({
    id: input.organizationId,
    name: input.slug,
    normalizedName: input.slug,
    slug: parseOrganizationSlug(input.slug)!,
    timeZone: "America/Lima",
    logo: { kind: "monogram" },
    createdAt: KICKOFF,
    createdByActorId: CREATOR,
  });
  await modules.competitions.repository.saveDraft({
    competition: {
      id: input.competitionId,
      organizationId: input.organizationId,
      name: input.slug,
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
      createdAt: KICKOFF,
      updatedAt: KICKOFF,
    },
    rules: {
      competitionId: input.competitionId,
      version: 1,
      regularStage: null,
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: 11,
      createdAt: KICKOFF,
    },
  });
  for (const [teamId, clubId] of [
    [input.homeTeamId, input.homeClubId],
    [input.awayTeamId, input.awayClubId],
  ] as const) {
    await modules.teams.repositories.teams.save({
      id: teamId,
      organizationId: input.organizationId,
      name: String(teamId),
      createdAt: KICKOFF,
      createdByActorId: CREATOR,
      creationKey: null,
    });
    await modules.competitions.entryRepository.save({
      id: `entry-${teamId}`,
      organizationId: input.organizationId,
      competitionId: input.competitionId,
      teamId,
      status: "approved",
      createdAt: KICKOFF,
      creationKey: null,
    });
    await modules.teams.externalClubConnections.upsert({
      teamId,
      providerKey: "ea-clubs",
      externalClubId: clubId,
      externalClubName: clubId,
      gameEdition: "fc26",
      platform: "common-gen5",
    });
  }
}

function upsertEncounter(
  modules: AppModules,
  organizationId: OrganizationId,
  competitionId: CompetitionId,
  homeTeamId: TeamId,
  awayTeamId: TeamId,
  encounterId: EncounterId,
  scheduledStartAt: Date,
) {
  return modules.scheduling.encounters.upsert({
    encounterId,
    organizationId,
    competitionId,
    stageId: asFixtureStageId(`stage-${encounterId}`),
    homeTeamId,
    awayTeamId,
    scheduledStartAt,
    officialMatchCount: 1,
  });
}

async function seedUntouchedCandidate(
  modules: AppModules,
  organizationId: OrganizationId,
  encounterId: EncounterId,
  externalId: string,
): Promise<void> {
  const candidate: EncounterCandidateAssociation = {
    id: `${organizationId}:${encounterId}:ea-clubs:${externalId}`,
    organizationId,
    encounterId,
    providerMatchRef: { providerKey: "ea-clubs", externalId },
    eligible: true,
    associatedAt: KICKOFF,
    lastEvaluatedAt: KICKOFF,
  };
  await modules.results.associations.replaceForEncounter(
    organizationId,
    encounterId,
    [candidate],
    0,
  );
}

function slot(externalId: string) {
  return {
    officialSlot: 1 as const,
    providerMatchRef: { providerKey: "ea-clubs" as const, externalId },
  };
}

function providerPayload() {
  return [
    eaMatch("m-1", new Date("2026-10-10T21:00:00.000Z")),
    eaMatch("m-2", new Date("2026-10-11T03:00:00.000Z")),
  ];
}

function eaMatch(matchId: string, occurredAt: Date) {
  return {
    matchId,
    timestamp: Math.floor(occurredAt.getTime() / 1_000),
    clubs: {
      "club-home": {
        goals: "2",
        details: { name: "Home", clubId: "club-home" },
      },
      "club-away": {
        goals: "1",
        details: { name: "Away", clubId: "club-away" },
      },
    },
    players: {},
  };
}
