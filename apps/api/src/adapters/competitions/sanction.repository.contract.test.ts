import type { CompetitionSanction, CompetitionSanctionRepository } from "@futrob/competitions";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vite-plus/test";
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

contract("in-memory competition sanction repository", () => new InMemoryCompetitionSanctionRepository());

describe.skipIf(!databaseUrl)("postgres competition sanctions", () => {
  let isolated: IsolatedSchema;

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "competition_sanctions");
    await migrateIsolatedSchema(isolated.pool);
  }, 180_000);

  afterAll(async () => {
    await isolated?.drop();
  }, 180_000);

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
