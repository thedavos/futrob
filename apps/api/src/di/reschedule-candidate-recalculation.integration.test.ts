import type { ProviderMatch } from "@futrob/game-data";
import { parseOrganizationSlug } from "@futrob/organizations";
import { asFixtureStageId, type RescheduleScope } from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOfficialMatchSlotId,
  asOrganizationId,
  asTeamId,
  type EncounterId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { PostgresProviderMatchRepository } from "@/adapters/game-data/persistence/postgres.repository.ts";
import { createApp } from "@/app.ts";
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
// America/Lima is UTC-5, so 15:00 local is 20:00Z.
const T = "2026-10-20T20:00:00.000Z";
const T_PLUS_24H = "2026-10-21T20:00:00.000Z";
const ORG = asOrganizationId("org-reschedule");
const COMPETITION = asCompetitionId("competition-reschedule");
const ENCOUNTER = asEncounterId("encounter-reschedule");
const NEIGHBOR = asEncounterId("encounter-reschedule-neighbor");
const HOME = asTeamId("team-reschedule-home");
const AWAY = asTeamId("team-reschedule-away");
const FOREIGN_ORG = asOrganizationId("org-reschedule-foreign");
const FOREIGN_ENCOUNTER = asEncounterId("encounter-reschedule-foreign");
const OPERATOR = asActorId("actor-reschedule-operator");
const HOME_CAPTAIN = asActorId("actor-reschedule-home-captain");
const AWAY_CAPTAIN = asActorId("actor-reschedule-away-captain");

suite("candidate recalculation after an applied reschedule on Postgres", () => {
  let isolated: IsolatedSchema;
  const pools: Pool[] = [];

  beforeEach(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "reschedule_recalculation");
    await migrateIsolatedSchema(isolated.pool);
  }, TEST_TIMEOUT_MS);

  afterEach(async () => {
    vi.restoreAllMocks();
    for (const pool of pools.splice(0)) await pool.end();
    await isolated?.drop();
  }, TEST_TIMEOUT_MS);

  function restartedModules(): AppModules {
    const pool = new Pool({
      connectionString: databaseUrl,
      options: `-c search_path=${isolated.schema}`,
    });
    pools.push(pool);
    return modulesOn(pool);
  }

  it(
    "moves T to T+24h: keeps m-1 as ineligible evidence, enables m-3, recovers a failed run and never officializes",
    async () => {
      const modules = await seed(isolated.pool, {
        officialMatchCount: 1,
        matches: [
          match("m-1", "2026-10-20T20:10:00.000Z"),
          match("m-3", "2026-10-21T20:10:00.000Z"),
        ],
      });
      const m1Before = await candidate("m-1");
      expect(await eligibility(ORG, ENCOUNTER)).toEqual([["m-1", true]]);
      const untouchedBefore = await untouchedState();

      await reschedule(modules, { type: "entire_encounter" }, { day: 21, hour: 15 });
      expect(await encounterStart()).toBe(T_PLUS_24H);
      // Applying the schedule alone leaves candidates for the consumer.
      expect(await eligibility(ORG, ENCOUNTER)).toEqual([["m-1", true]]);

      vi.spyOn(modules.results.recalculateEncounterCandidates, "execute").mockRejectedValueOnce(
        new Error("simulated crash during recalculation"),
      );
      await expect(modules.recalculateRescheduledCandidates.execute()).rejects.toThrow(
        "simulated crash during recalculation",
      );
      expect(await checkpoints()).toEqual([]);
      expect(await eligibility(ORG, ENCOUNTER)).toEqual([["m-1", true]]);

      const restarted = restartedModules();
      const app = createApp({
        modules: restarted,
        checkDbHealth: () => Promise.resolve("skipped"),
        internalJobSecret: "job-secret",
        correlationLogger: { info: () => undefined, error: () => undefined },
      });
      const run = (authorization: string) =>
        app.request("/api/v1/internal/results/candidate-recalculation/run", {
          method: "POST",
          headers: { Authorization: authorization },
        });
      expect((await run("Bearer wrong-secret")).status).toBe(401);
      expect(await checkpoints()).toEqual([]);

      const recovered = await run("Bearer job-secret");

      expect({ status: recovered.status, body: await recovered.json() }).toEqual({
        status: 200,
        body: { recalculated: 1 },
      });
      expect(await eligibility(ORG, ENCOUNTER)).toEqual([
        ["m-1", false],
        ["m-3", true],
      ]);
      const m1After = await candidate("m-1");
      expect(m1After).toMatchObject({ id: m1Before.id, associated_at: m1Before.associated_at });
      expect(await checkpoints()).toEqual([
        { encounter_id: ENCOUNTER, organization_id: ORG, outcome: "associated" },
      ]);

      const converged = await candidateTable(ORG, ENCOUNTER);
      const replay = await restarted.recalculateRescheduledCandidates.execute();
      expect(replay.isOk() && replay.value).toEqual({ recalculated: 0 });
      expect(await candidateTable(ORG, ENCOUNTER)).toEqual(converged);

      // A crash after recalculating but before the checkpoint repeats the same work.
      await isolated.pool.query("DELETE FROM encounter_candidate_recalculations");
      const repeated = await restarted.recalculateRescheduledCandidates.execute();
      expect(repeated.isOk() && repeated.value).toEqual({ recalculated: 1 });
      expect(
        (await candidateTable(ORG, ENCOUNTER)).map(({ last_evaluated_at: _, ...row }) => row),
      ).toEqual(converged.map(({ last_evaluated_at: _, ...row }) => row));

      expect(await untouchedState()).toEqual(untouchedBefore);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "moves only slot 2: slot 1 keeps its start and candidates, old slot 2 references stay as evidence",
    async () => {
      const modules = await seed(isolated.pool, {
        officialMatchCount: 2,
        slot2StartAt: "2026-10-20T21:00:00.000Z",
        matches: [
          match("slot-1-played", "2026-10-20T20:10:00.000Z"),
          match("slot-2-old", "2026-10-21T02:30:00.000Z"),
          match("slot-2-new", "2026-10-21T21:10:00.000Z"),
        ],
      });
      expect(await eligibility(ORG, ENCOUNTER)).toEqual([
        ["slot-1-played", true],
        ["slot-2-old", true],
      ]);
      const slot1Before = await candidate("slot-1-played");
      const untouchedBefore = await untouchedState();

      await reschedule(modules, { type: "official_match", officialSlot: 2 }, { day: 21, hour: 16 });
      const recalculated = await modules.recalculateRescheduledCandidates.execute();

      expect(recalculated.isOk() && recalculated.value).toEqual({ recalculated: 1 });
      expect(await slotStarts()).toEqual([
        { slot: 1, at: T },
        { slot: 2, at: "2026-10-21T21:00:00.000Z" },
      ]);
      expect(await encounterStart()).toBe(T);
      expect(await eligibility(ORG, ENCOUNTER)).toEqual([
        ["slot-1-played", true],
        ["slot-2-new", true],
        ["slot-2-old", false],
      ]);
      expect(await candidate("slot-1-played")).toMatchObject({
        id: slot1Before.id,
        associated_at: slot1Before.associated_at,
        eligible: true,
      });

      const converged = await candidateTable(ORG, ENCOUNTER);
      const replay = await restartedModules().recalculateRescheduledCandidates.execute();
      expect(replay.isOk() && replay.value).toEqual({ recalculated: 0 });
      expect(await candidateTable(ORG, ENCOUNTER)).toEqual(converged);
      expect(await untouchedState()).toEqual(untouchedBefore);
    },
    TEST_TIMEOUT_MS,
  );

  async function reschedule(
    modules: AppModules,
    scope: RescheduleScope,
    wall: { readonly day: number; readonly hour: number },
  ): Promise<void> {
    const created = await modules.scheduling.createScheduleChangeRequest.execute({
      actorId: HOME_CAPTAIN,
      organizationId: ORG,
      competitionId: COMPETITION,
      encounterId: ENCOUNTER,
      requestingTeamId: HOME,
      scope,
      timeZone: "America/Lima",
      proposedWallTime: {
        year: 2026,
        month: 10,
        day: wall.day,
        hour: wall.hour,
        minute: 0,
        second: 0,
      },
      reason: "Travel conflict",
      idempotencyKey: "reschedule-1",
    });
    if (created.isErr()) throw created.error;
    const accepted = await modules.scheduling.acceptScheduleChangeProposal.execute({
      actorId: AWAY_CAPTAIN,
      organizationId: ORG,
      competitionId: COMPETITION,
      encounterId: ENCOUNTER,
      requestId: created.value.id,
      proposalId: created.value.proposals[0]?.id ?? "missing",
      expectedVersion: created.value.version,
      commandKey: "accept-1",
      responder: { authority: "rival_team", teamId: AWAY },
    });
    if (accepted.isErr()) throw accepted.error;
    expect(accepted.value.request.status).toBe("accepted");
  }

  async function eligibility(organizationId: OrganizationId, encounterId: EncounterId) {
    return (await candidateTable(organizationId, encounterId)).map((row) => [
      row.external_match_id,
      row.eligible,
    ]);
  }

  async function candidateTable(organizationId: OrganizationId, encounterId: EncounterId) {
    const result = await isolated.pool.query<{
      id: string;
      external_match_id: string;
      eligible: boolean;
      associated_at: Date;
      last_evaluated_at: Date;
    }>(
      `SELECT id, external_match_id, eligible, associated_at, last_evaluated_at
       FROM encounter_candidates
       WHERE organization_id = $1 AND encounter_id = $2
       ORDER BY external_match_id ASC`,
      [organizationId, encounterId],
    );
    return result.rows;
  }

  async function candidate(externalId: string) {
    const row = (await candidateTable(ORG, ENCOUNTER)).find(
      (entry) => entry.external_match_id === externalId,
    );
    if (!row) throw new Error(`Missing candidate ${externalId}`);
    return row;
  }

  async function checkpoints() {
    const result = await isolated.pool.query(
      `SELECT organization_id, encounter_id, outcome
       FROM encounter_candidate_recalculations ORDER BY application_id`,
    );
    return result.rows;
  }

  async function encounterStart(): Promise<string> {
    const result = await isolated.pool.query<{ scheduled_start_at: Date }>(
      "SELECT scheduled_start_at FROM encounter_schedule_snapshots WHERE encounter_id = $1",
      [ENCOUNTER],
    );
    return result.rows[0]?.scheduled_start_at.toISOString() ?? "missing";
  }

  async function slotStarts() {
    const result = await isolated.pool.query<{ slot: number; scheduled_start_at: Date }>(
      "SELECT slot, scheduled_start_at FROM official_matches WHERE encounter_id = $1 ORDER BY slot",
      [ENCOUNTER],
    );
    return result.rows.map((row) => ({ slot: row.slot, at: row.scheduled_start_at.toISOString() }));
  }

  /** Other tenants, a neighbor Encounter, selections, results and statistics. */
  async function untouchedState() {
    const candidates = await isolated.pool.query(
      `SELECT * FROM encounter_candidates WHERE encounter_id = ANY($1::text[]) ORDER BY id`,
      [[NEIGHBOR, FOREIGN_ENCOUNTER]],
    );
    const counts = await isolated.pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM official_match_selections) AS selections,
         (SELECT COUNT(*)::int FROM official_results) AS results,
         (SELECT COUNT(*)::int FROM player_competition_stats) AS player_stats,
         (SELECT COUNT(*)::int FROM team_competition_stats) AS team_stats,
         (SELECT COUNT(*)::int FROM competition_standing_snapshots) AS standings`,
    );
    return { candidates: candidates.rows, counts: counts.rows[0] };
  }
});

function modulesOn(pool: Pool): AppModules {
  return createModules({
    fetcher: stubFetch,
    eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
    pool,
  });
}

function match(externalMatchId: string, occurredAt: string): ProviderMatch {
  return {
    id: `ea-clubs:${externalMatchId}`,
    provider: { key: "ea-clubs", externalMatchId },
    game: { edition: "FC 26", platform: "common-gen5", mode: "clubs" },
    occurredAt: new Date(occurredAt),
    home: { externalClubId: "club-home", name: "Home", goals: 2, imageUrl: null },
    away: { externalClubId: "club-away", name: "Away", goals: 1, imageUrl: null },
    players: [],
    metadata: {
      durationSeconds: 720,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "complete",
    },
  };
}

async function seed(
  pool: Pool,
  input: {
    readonly officialMatchCount: 1 | 2;
    readonly slot2StartAt?: string;
    readonly matches: readonly ProviderMatch[];
  },
): Promise<AppModules> {
  await seedActors(pool, OPERATOR, HOME_CAPTAIN, AWAY_CAPTAIN);
  await new PostgresProviderMatchRepository(pool).upsertMany(input.matches);
  const modules = modulesOn(pool);
  for (const [id, slug] of [
    [ORG, "org-reschedule"],
    [FOREIGN_ORG, "org-reschedule-foreign"],
  ] as const) {
    await modules.organizations.repositories.organizations.create({
      id,
      name: slug,
      normalizedName: slug,
      slug: parseOrganizationSlug(slug)!,
      timeZone: "America/Lima",
      logo: { kind: "monogram" },
      createdAt: SEEDED_AT,
      createdByActorId: OPERATOR,
    });
  }
  await modules.competitions.repository.saveDraft({
    competition: {
      id: COMPETITION,
      organizationId: ORG,
      name: "Liga",
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
      createdByActorId: OPERATOR,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    rules: {
      competitionId: COMPETITION,
      version: 1,
      regularStage: {
        officialMatchesPerEncounter: input.officialMatchCount,
        resolutionMode: "independent_matches",
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        allowRescheduling: true,
        maxReschedulesPerTeam: 2,
        minimumRescheduleNoticeHours: 12,
        rescheduleRequiresOpponentApproval: true,
        rescheduleRequiresOrganizerApproval: false,
      },
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: 11,
      createdAt: SEEDED_AT,
    },
  });
  for (const [teamId, clubId, captain] of [
    [HOME, "club-home", HOME_CAPTAIN],
    [AWAY, "club-away", AWAY_CAPTAIN],
  ] as const) {
    await modules.teams.repositories.teams.save({
      id: teamId,
      organizationId: ORG,
      name: clubId,
      createdAt: SEEDED_AT,
      createdByActorId: OPERATOR,
      creationKey: null,
    });
    await modules.competitions.entryRepository.save({
      id: `entry-${teamId}`,
      organizationId: ORG,
      competitionId: COMPETITION,
      teamId,
      status: "approved",
      createdAt: SEEDED_AT,
      creationKey: null,
    });
    await modules.teams.externalClubConnections.upsert({
      teamId,
      providerKey: "ea-clubs",
      externalClubId: clubId,
      externalClubName: clubId,
      gameEdition: "FC 26",
      platform: "common-gen5",
    });
    const profile = await modules.teams.repositories.profiles.saveIfAbsent({
      id: `profile-${captain}`,
      actorId: captain,
      createdAt: SEEDED_AT,
    });
    await modules.teams.repositories.rosters.add({
      id: `roster-${captain}`,
      organizationId: ORG,
      competitionId: COMPETITION,
      teamId,
      playerProfileId: profile.id,
      gameAccountId: null,
      role: "captain",
      createdAt: SEEDED_AT,
    });
  }
  for (const encounterId of [ENCOUNTER, NEIGHBOR]) {
    await modules.scheduling.encounters.upsert({
      encounterId,
      organizationId: ORG,
      competitionId: COMPETITION,
      homeTeamId: HOME,
      awayTeamId: AWAY,
      scheduledStartAt: new Date(T),
      officialMatchCount: input.officialMatchCount,
      stageId: asFixtureStageId("stage-league"),
    });
  }
  if (input.slot2StartAt) {
    await modules.scheduling.officialMatches.saveSchedules(
      [1, 2].map((slot) => ({
        id: asOfficialMatchSlotId(`${ENCOUNTER}:slot-${slot}`),
        encounterId: ENCOUNTER,
        organizationId: ORG,
        competitionId: COMPETITION,
        slot: slot as 1 | 2,
        status: "scheduled" as const,
        scheduledStartAt: new Date(slot === 1 ? T : input.slot2StartAt!),
        createdAt: SEEDED_AT,
      })),
    );
  }
  for (const encounterId of [ENCOUNTER, NEIGHBOR]) {
    const associated = await modules.results.associateEncounterCandidates.execute({
      organizationId: ORG,
      encounterId,
    });
    if (associated.isErr()) throw associated.error;
  }
  // Out of every window: a wrong recalculation of these Encounters would mark them ineligible.
  for (const [organizationId, encounterId] of [
    [ORG, NEIGHBOR],
    [FOREIGN_ORG, FOREIGN_ENCOUNTER],
  ] as const) {
    const loaded = await modules.results.associations.loadForEncounter(organizationId, encounterId);
    await modules.results.associations.replaceForEncounter(
      organizationId,
      encounterId,
      [
        ...loaded.associations,
        {
          id: `${organizationId}:${encounterId}:ea-clubs:prior-evidence`,
          organizationId,
          encounterId,
          providerMatchRef: { providerKey: "ea-clubs", externalId: "prior-evidence" },
          eligible: true,
          associatedAt: SEEDED_AT,
          lastEvaluatedAt: SEEDED_AT,
        },
      ],
      loaded.generation,
    );
  }
  return modules;
}
