import type { CompetitionSanction, CompetitionSanctionRepository } from "@futrob/competitions";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createModules } from "@/di/create-modules.ts";
import {
  seedPerformanceModule,
  seedPerformanceResults,
  PERFORMANCE_HOME_CAPTAIN,
  PERFORMANCE_AWAY_CAPTAIN,
} from "@/testing/team-performance-module.fixture.ts";
import {
  performanceScope,
  performanceHome,
} from "../../../../../packages/statistics/src/domain/policies/team-performance.fixture.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import {
  InMemoryCompetitionSanctionRepository,
  PostgresCompetitionSanctionRepository,
} from "./sanction.repositories.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const ORG = asOrganizationId("org-sanctions");
const OTHER_ORG = asOrganizationId("org-elsewhere");
const CMP = asCompetitionId("cmp-sanctions");
const OTHER_CMP = asCompetitionId("cmp-other");
const ORGANIZER = asActorId("act-organizer");
const STAFF = asActorId("act-staff");
const CONDOR = asTeamId("team-condor");
const PUMA = asTeamId("team-puma");

function at(minute: number): Date {
  return new Date(Date.UTC(2026, 10, 10, 12, minute));
}

function sanction(id: string, overrides: Partial<CompetitionSanction> = {}): CompetitionSanction {
  return {
    id,
    organizationId: ORG,
    competitionId: CMP,
    targetType: "team",
    teamId: CONDOR,
    playerProfileId: null,
    type: "points_deduction",
    pointsDeducted: 3,
    suspensionMatches: null,
    encounterId: null,
    reason: "Alineación indebida",
    imposedByActorId: ORGANIZER,
    imposedAt: at(0),
    requestId: `req-${id}`,
    revocation: null,
    ...overrides,
  };
}

const revocation = {
  actorId: STAFF,
  at: at(30),
  reason: "Apelación aceptada",
  requestId: "req-revoke",
};

function contract(name: string, repository: () => CompetitionSanctionRepository) {
  describe(name, () => {
    let sanctions: CompetitionSanctionRepository;

    beforeEach(() => {
      sanctions = repository();
    });

    it("round-trips every type and lists them newest first, per competition and per Team", async () => {
      const suspension = sanction("san-player", {
        targetType: "player",
        playerProfileId: "pp-condor",
        type: "match_suspension",
        pointsDeducted: null,
        suspensionMatches: 2,
        imposedAt: at(5),
      });
      const defeat = sanction("san-defeat", {
        teamId: PUMA,
        type: "administrative_defeat",
        pointsDeducted: null,
        encounterId: "enc-1",
        imposedAt: at(10),
      });
      await sanctions.create(sanction("san-points"));
      await sanctions.create(suspension);
      await sanctions.create(defeat);
      await sanctions.create(sanction("san-elsewhere", { competitionId: OTHER_CMP }));

      expect(await sanctions.findById(ORG, CMP, "san-player")).toEqual(suspension);
      expect((await sanctions.listByCompetition(ORG, CMP)).map((row) => row.id)).toEqual([
        "san-defeat",
        "san-player",
        "san-points",
      ]);
      expect((await sanctions.listByTeam(ORG, CMP, CONDOR)).map((row) => row.id)).toEqual([
        "san-player",
        "san-points",
      ]);
    });

    it("never reads a sanction through another organization or competition", async () => {
      await sanctions.create(sanction("san-1"));

      expect(await sanctions.findById(OTHER_ORG, CMP, "san-1")).toBeNull();
      expect(await sanctions.findById(ORG, OTHER_CMP, "san-1")).toBeNull();
      expect(await sanctions.listByCompetition(OTHER_ORG, CMP)).toEqual([]);
      expect(await sanctions.listByTeam(OTHER_ORG, CMP, CONDOR)).toEqual([]);
      expect(await sanctions.revoke(OTHER_ORG, CMP, "san-1", revocation)).toBeNull();
      expect((await sanctions.findById(ORG, CMP, "san-1"))?.revocation).toBeNull();
    });

    it("revokes an active sanction once and keeps its original audit trail", async () => {
      await sanctions.create(sanction("san-1"));

      const revoked = await sanctions.revoke(ORG, CMP, "san-1", revocation);
      const again = await sanctions.revoke(ORG, CMP, "san-1", {
        ...revocation,
        reason: "Otro motivo",
      });

      expect(revoked).toEqual(sanction("san-1", { revocation }));
      expect(again).toBeNull();
      expect(await sanctions.findById(ORG, CMP, "san-1")).toEqual(
        sanction("san-1", { revocation }),
      );
    });
  });
}

contract(
  "in-memory competition sanction repository",
  () => new InMemoryCompetitionSanctionRepository(),
);

describe.skipIf(!databaseUrl)("postgres competition sanctions", () => {
  let isolated: IsolatedSchema;

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "competition_sanctions");
    await migrateIsolatedSchema(isolated.pool);
  });

  afterAll(async () => {
    await isolated?.drop();
  });

  beforeEach(async () => {
    const schema = `"${isolated.schema}"`;
    await isolated.pool.query(
      `TRUNCATE ${schema}.competition_sanctions, ${schema}.player_profiles,
                ${schema}.organizations, ${schema}.actors CASCADE`,
    );
    await seedActors(isolated.pool, ORGANIZER, STAFF);
    for (const organization of [ORG, OTHER_ORG]) {
      await isolated.pool.query(
        `INSERT INTO organizations (
           id, name, normalized_name, slug, time_zone, created_at, created_by_actor_id
         ) VALUES ($1, $1, $1, $1, 'UTC', NOW(), $2)`,
        [organization, ORGANIZER],
      );
    }
    for (const competition of [CMP, OTHER_CMP]) {
      await isolated.pool.query(
        `INSERT INTO competitions (
           id, organization_id, name, status, modality, game_edition, platform,
           region, time_zone, format, created_by_actor_id, created_at, updated_at
         ) VALUES ($1, $2, 'Liga', 'published', 'fc-clubs', 'FC 26', 'playstation',
                   'south-america', 'UTC', 'league', $3, NOW(), NOW())`,
        [competition, ORG, ORGANIZER],
      );
    }
    for (const team of [CONDOR, PUMA]) {
      await isolated.pool.query(
        `INSERT INTO teams (id, organization_id, name, created_at, created_by_actor_id)
         VALUES ($1, $2, $1, NOW(), $3)`,
        [team, ORG, ORGANIZER],
      );
    }
    await isolated.pool.query(
      `INSERT INTO player_profiles (id, actor_id, created_at) VALUES ('pp-condor', $1, NOW())`,
      [STAFF],
    );
  });

  contract("postgres", () => new PostgresCompetitionSanctionRepository(isolated.pool));

  async function composition() {
    await seedActors(isolated.pool, "actor-1", PERFORMANCE_HOME_CAPTAIN, PERFORMANCE_AWAY_CAPTAIN);
    const modules = createModules({
      pool: isolated.pool,
      fetcher: async () => {
        throw new Error("Sanctions must never call EA");
      },
      eaClubsBaseUrl: "https://provider.invalid",
      clock: { now: () => at(0) },
    });
    await seedPerformanceModule(modules);
    await seedPerformanceResults(modules);
    const scope = { ...performanceScope, actorId: asActorId("actor-1") };
    const impose = () =>
      modules.sanctions.commands.impose.execute({
        ...scope,
        target: { type: "team", teamId: performanceHome },
        type: "points_deduction",
        pointsDeducted: 3,
        reason: "Alineación indebida",
        requestId: "req-impose-composition",
      });
    async function state() {
      const activities = await modules.notifications.listActivities.execute({
        audiences: [{ audience: "organization", audienceId: scope.organizationId }],
      });
      if (activities.isErr()) throw activities.error;
      return {
        sanctions: await modules.competitions.sanctionRepository.listByCompetition(
          scope.organizationId,
          scope.competitionId,
        ),
        standings: await modules.statistics.ports.standings.findByCompetition(scope.competitionId),
        activities: activities.value.items,
      };
    }
    return { modules, scope, impose, state };
  }

  it.each([
    ["impose", "table"],
    ["impose", "feed"],
    ["revoke", "table"],
    ["revoke", "feed"],
  ] as const)(
    "rolls back %s, standings and activity when the %s fails after persistence",
    async (command, stage) => {
      const { modules, scope, impose, state } = await composition();
      const existing = command === "revoke" ? await impose() : null;
      if (existing?.isErr()) throw existing.error;
      const before = await state();
      const rebuild = modules.statistics.useCases.rebuildCompetitionStatistics;
      const writer = modules.notifications.writer;
      const originalRebuild = rebuild.execute.bind(rebuild);
      const originalRecord = writer.record.bind(writer);
      const failure =
        stage === "table"
          ? vi.spyOn(rebuild, "execute").mockImplementationOnce(async (input) => {
              await originalRebuild(input);
              throw new Error("sanction table persistence failed");
            })
          : vi.spyOn(writer, "record").mockImplementationOnce(async (input) => {
              await originalRecord(input);
              throw new Error("sanction feed persistence failed");
            });
      try {
        await expect(
          command === "impose"
            ? impose()
            : modules.sanctions.commands.revoke.execute({
                ...scope,
                sanctionId: existing?.isOk() ? existing.value.id : "",
                reason: "Apelación aceptada",
                requestId: "req-revoke-composition",
              }),
        ).rejects.toThrow(`sanction ${stage} persistence failed`);
      } finally {
        failure.mockRestore();
      }
      expect(await state()).toEqual(before);
    },
  );

  it("keeps approved results and standings unchanged when imposing and revoking a suspension", async () => {
    const { modules, scope, state } = await composition();
    const before = await state();
    const results = await modules.results.results.listByCompetition(scope.competitionId);
    const imposed = await modules.sanctions.commands.impose.execute({
      ...scope,
      target: { type: "team", teamId: performanceHome },
      type: "match_suspension",
      suspensionMatches: 2,
      reason: "Conducta antideportiva",
      requestId: "req-suspension",
    });
    if (imposed.isErr()) throw imposed.error;
    expect((await state()).standings).toEqual(before.standings);
    expect(await modules.results.results.listByCompetition(scope.competitionId)).toEqual(results);
    const revoked = await modules.sanctions.commands.revoke.execute({
      ...scope,
      sanctionId: imposed.value.id,
      reason: "Apelación aceptada",
      requestId: "req-revoke-suspension",
    });
    expect(revoked.isOk()).toBe(true);
    expect((await state()).standings).toEqual(before.standings);
    expect(await modules.results.results.listByCompetition(scope.competitionId)).toEqual(results);
  });

  it("rebuilds official matches plus active deductions identically and restores points on revocation", async () => {
    const { modules, scope, impose, state } = await composition();
    const before = await state();
    const imposed = await impose();
    if (imposed.isErr()) throw imposed.error;
    const deducted = await state();
    const previous = before.standings?.rows.find((row) => row.teamId === performanceHome);
    expect(previous).toBeDefined();
    expect(deducted.standings?.rows.find((row) => row.teamId === performanceHome)).toMatchObject({
      points: (previous?.points ?? 0) - 3,
      pointsDeducted: 3,
      played: previous?.played,
    });
    for (const attempt of [1, 2]) {
      const rebuilt = await modules.statistics.useCases.rebuildCompetitionStatistics.execute(scope);
      expect(rebuilt.isOk(), `rebuild ${attempt}`).toBe(true);
      expect((await state()).standings?.rows).toEqual(deducted.standings?.rows);
    }
    const revoked = await modules.sanctions.commands.revoke.execute({
      ...scope,
      sanctionId: imposed.value.id,
      reason: "Apelación aceptada",
      requestId: "req-revoke-deduction",
    });
    expect(revoked.isOk()).toBe(true);
    const restored = await state();
    expect(restored.standings?.rows).toEqual(before.standings?.rows);
    expect(restored.sanctions).toMatchObject([
      {
        id: imposed.value.id,
        requestId: "req-impose-composition",
        revocation: {
          actorId: scope.actorId,
          reason: "Apelación aceptada",
          requestId: "req-revoke-deduction",
        },
      },
    ]);
    expect(restored.activities.map((entry) => entry.subject.outcome).sort()).toEqual([
      "sanction_imposed",
      "sanction_revoked",
    ]);
  });

  it("rejects deleting a sanction or editing it outside the one revocation", async () => {
    const sanctions = new PostgresCompetitionSanctionRepository(isolated.pool);
    await sanctions.create(sanction("san-1"));

    await expect(
      isolated.pool.query(`DELETE FROM competition_sanctions WHERE id = 'san-1'`),
    ).rejects.toThrow(/append-only/);
    await expect(
      isolated.pool.query(`UPDATE competition_sanctions SET reason = 'Otro' WHERE id = 'san-1'`),
    ).rejects.toThrow(/one revocation/);
    await sanctions.revoke(ORG, CMP, "san-1", revocation);
    await expect(
      isolated.pool.query(
        `UPDATE competition_sanctions SET revocation_reason = 'Otro' WHERE id = 'san-1'`,
      ),
    ).rejects.toThrow(/one revocation/);
    expect((await sanctions.findById(ORG, CMP, "san-1"))?.revocation).toEqual(revocation);
  });

  it("rejects detail that does not belong to the sanction type", async () => {
    const sanctions = new PostgresCompetitionSanctionRepository(isolated.pool);

    await expect(
      sanctions.create(sanction("san-bad", { type: "warning", pointsDeducted: 3 })),
    ).rejects.toThrow();
    await expect(
      sanctions.create(
        sanction("san-player-points", { targetType: "player", playerProfileId: "pp-condor" }),
      ),
    ).rejects.toThrow();
  });

  it("goes away with its competition", async () => {
    const sanctions = new PostgresCompetitionSanctionRepository(isolated.pool);
    await sanctions.create(sanction("san-1"));

    await isolated.pool.query(`DELETE FROM competitions WHERE id = $1`, [CMP]);

    expect(await sanctions.listByCompetition(ORG, CMP)).toEqual([]);
  });
});
