import {
  CloseActivityUseCase,
  ListActivitiesUseCase,
  RecordActivityUseCase,
  type ActivityEntryRepository,
  type RecordActivityInput,
} from "@futrob/notifications";
import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vite-plus/test";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import { InMemoryActivityEntryRepository } from "./activity-entry.in-memory.repository.ts";
import { PostgresActivityEntryRepository } from "./activity-entry.repository.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const ORG_A = asOrganizationId("org-a");
const ORG_B = asOrganizationId("org-b");
const CMP_A = asCompetitionId("cmp-a");
const CMP_B = asCompetitionId("cmp-b");
const OPENER = asActorId("act-opener");
const OPERATOR = asActorId("act-operator");
const INVITEE = asActorId("act-1");
const ORG_AUDIENCE = { audience: "organization", audienceId: ORG_A } as const;
const PENDING = { audiences: [ORG_AUDIENCE], status: "open", requiresAction: true } as const;

function at(time: string): Date {
  return new Date(`2026-10-07T${time}:00.000Z`);
}

function dispute(id: string, overrides: Partial<RecordActivityInput> = {}): RecordActivityInput {
  return {
    organizationId: ORG_A,
    competitionId: CMP_A,
    kind: "match_dispute",
    source: { name: "match_dispute", id },
    resource: { type: "encounter", id: `enc-${id}` },
    subject: { competitionName: "Liga A", encounterLabel: "Cuervos vs Halcones" },
    actorId: OPENER,
    recipients: [{ ...ORG_AUDIENCE, requiresAction: true }],
    ...overrides,
  };
}

/** Runs the notifications use cases over a repository and asserts only what they list. */
function contract(name: string, repository: () => ActivityEntryRepository) {
  describe(name, () => {
    let now = at("10:00");
    let sequence = 0;
    let record: RecordActivityUseCase;
    let close: CloseActivityUseCase;
    let list: ListActivitiesUseCase;

    beforeEach(() => {
      now = at("10:00");
      const activities = repository();
      const clock = { now: () => now };
      const ids = { generate: () => `${name}-row-${String(++sequence).padStart(5, "0")}` };
      record = new RecordActivityUseCase({ activities, clock, ids });
      close = new CloseActivityUseCase({ activities, clock });
      list = new ListActivitiesUseCase({ activities, clock });
    });

    async function items(input: Parameters<ListActivitiesUseCase["execute"]>[0]) {
      const listed = await list.execute(input);
      if (!listed.isOk()) throw new Error(listed.error.code);
      return listed.value.items;
    }

    it("records a dispute once per audience and survives a retry", async () => {
      const first = await record.execute(dispute("dsp-1"));
      const again = await record.execute(dispute("dsp-1"));
      expect(again.isOk() && again.value[0]?.id).toBe(first.isOk() && first.value[0]?.id);
      expect(await items(PENDING)).toMatchObject([
        {
          kind: "match_dispute",
          status: "open",
          competitionId: "cmp-a",
          resourceId: "enc-dsp-1",
          subject: {
            competitionName: "Liga A",
            encounterLabel: "Cuervos vs Halcones",
            teamName: null,
          },
          openedAt: at("10:00"),
        },
      ]);
    });

    it("closes once and keeps the first close", async () => {
      await record.execute(dispute("dsp-1"));
      now = at("11:00");
      await close.execute({
        source: { name: "match_dispute", id: "dsp-1" },
        closedByActorId: OPERATOR,
      });
      now = at("12:00");
      const again = await close.execute({
        source: { name: "match_dispute", id: "dsp-1" },
        closedByActorId: OPENER,
      });
      expect(again.isOk() && again.value.closed).toBe(0);
      expect(await items(PENDING)).toEqual([]);
      expect(await items({ audiences: [ORG_AUDIENCE] })).toMatchObject([
        {
          status: "closed",
          closedAt: at("11:00"),
          lastEventAt: at("11:00"),
          closedByActorId: OPERATOR,
        },
      ]);
    });

    it("orders a publication born closed behind a later closed dispute", async () => {
      now = at("09:00");
      await record.execute({
        organizationId: ORG_A,
        competitionId: CMP_A,
        kind: "competition_published",
        source: { name: "competition", id: "cmp-a" },
        resource: { type: "competition", id: "cmp-a" },
        subject: { competitionName: "Liga A" },
        actorId: OPERATOR,
        bornClosed: true,
        recipients: [{ ...ORG_AUDIENCE, requiresAction: false }],
      });
      now = at("10:00");
      await record.execute(dispute("dsp-1"));
      now = at("11:00");
      await close.execute({
        source: { name: "match_dispute", id: "dsp-1" },
        closedByActorId: OPERATOR,
      });

      expect(await items(PENDING)).toEqual([]);
      const recent = await items({ audiences: [ORG_AUDIENCE] });
      expect(recent.map((row) => [row.kind, row.status])).toEqual([
        ["match_dispute", "closed"],
        ["competition_published", "closed"],
      ]);
      expect(recent[1]?.closedAt).toEqual(at("09:00"));
    });

    it("keeps organizations apart", async () => {
      await record.execute(
        dispute("dsp-1", {
          organizationId: ORG_B,
          recipients: [{ audience: "organization", audienceId: ORG_B, requiresAction: true }],
        }),
      );
      expect(await items({ audiences: [ORG_AUDIENCE], organizationId: ORG_A })).toEqual([]);
    });

    it("closing an unknown source changes nothing", async () => {
      await record.execute(dispute("dsp-1"));
      const closed = await close.execute({
        source: { name: "match_dispute", id: "missing" },
        closedByActorId: OPERATOR,
      });
      expect(closed.isOk() && closed.value.closed).toBe(0);
      expect((await items(PENDING)).map((row) => row.sourceId)).toEqual(["dsp-1"]);
    });

    it("lists a directed invitation only for its invitee until it expires", async () => {
      await record.execute({
        organizationId: ORG_A,
        competitionId: CMP_A,
        kind: "roster_invitation",
        source: { name: "roster_invitation", id: "inv-1" },
        resource: { type: "roster_invitation", id: "inv-1" },
        subject: { teamName: "Cuervos" },
        actorId: OPENER,
        expiresAt: at("12:00"),
        recipients: [
          { audience: "actor", audienceId: INVITEE, requiresAction: true },
          { ...ORG_AUDIENCE, requiresAction: false },
        ],
      });
      const mine = {
        audiences: [{ audience: "actor", audienceId: INVITEE }],
        status: "open",
        requiresAction: true,
      } as const;
      now = at("11:00");
      expect((await items(mine)).map((row) => row.sourceId)).toEqual(["inv-1"]);
      expect(
        await items({ ...mine, audiences: [{ audience: "actor", audienceId: "act-2" }] }),
      ).toEqual([]);
      now = at("12:01");
      expect(await items(mine)).toEqual([]);
    });

    it("narrows to a competition before the limit, past fifty newer rows elsewhere", async () => {
      now = at("09:00");
      await record.execute(dispute("dsp-active"));
      now = at("10:00");
      for (let index = 0; index < 50; index += 1) {
        await record.execute(dispute(`dsp-other-${index}`, { competitionId: CMP_B }));
      }
      const scoped = await items({ ...PENDING, competitionId: CMP_A, limit: 50 });
      expect(scoped.map((row) => row.sourceId)).toEqual(["dsp-active"]);
      const teamScoped = await items({
        audiences: [{ ...ORG_AUDIENCE, competitionId: CMP_B }],
        limit: 50,
      });
      expect(teamScoped).toHaveLength(50);
    }, 60_000);

    it("pages twelve rows that share times without repeats or gaps", async () => {
      for (let index = 0; index < 12; index += 1) {
        now = index < 6 ? at("10:00") : at("11:00");
        await record.execute(dispute(`dsp-${index}`));
      }
      const first = await list.execute({ audiences: [ORG_AUDIENCE], limit: 10 });
      if (!first.isOk()) throw new Error("first page");
      const second = await list.execute({
        audiences: [ORG_AUDIENCE],
        limit: 10,
        cursor: first.value.nextCursor,
      });
      if (!second.isOk()) throw new Error("second page");
      expect(first.value.items).toHaveLength(10);
      expect(second.value.items).toHaveLength(2);
      expect(second.value.nextCursor).toBeUndefined();
      const ids = [...first.value.items, ...second.value.items].map((row) => row.sourceId);
      expect(new Set(ids).size).toBe(12);
    });
  });
}

contract("in-memory activity repository", () => new InMemoryActivityEntryRepository());

describe.skipIf(!databaseUrl)("postgres activity repository", () => {
  let isolated: IsolatedSchema;

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "activity_entries");
    await migrateIsolatedSchema(isolated.pool);
  }, 180_000);

  afterAll(async () => {
    await isolated?.drop();
  }, 180_000);

  beforeEach(async () => {
    const schema = `"${isolated.schema}"`;
    await isolated.pool.query(
      `TRUNCATE ${schema}.activity_entries, ${schema}.organizations, ${schema}.actors CASCADE`,
    );
    await seedActors(isolated.pool, OPENER, OPERATOR, INVITEE, "organizer");
    for (const organization of [ORG_A, ORG_B]) {
      await isolated.pool.query(
        `INSERT INTO organizations (
           id, name, normalized_name, slug, time_zone, created_at, created_by_actor_id
         ) VALUES ($1, $1, $1, $1, 'UTC', NOW(), 'organizer')`,
        [organization],
      );
    }
    await isolated.pool.query(
      `INSERT INTO competitions (
         id, organization_id, name, status, modality, game_edition, platform,
         region, time_zone, format, created_by_actor_id, created_at, updated_at
       ) VALUES ($1, $2, 'Liga A', 'published', 'fc-clubs', 'fc26', 'playstation',
                 'south-america', 'UTC', 'league', 'organizer', NOW(), NOW())`,
      [CMP_A, ORG_A],
    );
    await isolated.pool.query(
      `INSERT INTO competitions (
         id, organization_id, name, status, modality, game_edition, platform,
         region, time_zone, format, created_by_actor_id, created_at, updated_at
       ) VALUES ($1, $2, 'Liga B', 'published', 'fc-clubs', 'fc26', 'playstation',
                 'south-america', 'UTC', 'league', 'organizer', NOW(), NOW())`,
      [CMP_B, ORG_A],
    );
  });

  contract("postgres", () => new PostgresActivityEntryRepository(isolated.pool));
});
