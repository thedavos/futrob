import type { FixtureEncounter, FixturePlan } from "@futrob/scheduling";
import { asFixtureRoundId, asFixtureStageId } from "@futrob/scheduling";
import { asEncounterId, asOfficialMatchSlotId } from "@futrob/shared-kernel";
import type { ProviderMatchRepository } from "@futrob/game-data";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { InMemoryProviderMatchRepository } from "@/adapters/game-data/persistence/in-memory.repository.ts";
import { PostgresProviderMatchRepository } from "@/adapters/game-data/persistence/postgres.repository.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import {
  AWAY,
  AWAY_CAPTAIN,
  COMPETITION,
  ENCOUNTER,
  HOME,
  HOME_CAPTAIN,
  OPERATOR,
  ORG,
  SECOND_ENCOUNTER,
  providerMatch,
  seedComposition,
  slot,
} from "./official-selection.composition.fixture.ts";

const STAGE = asFixtureStageId("bracket:stage:1");
const FINAL = asEncounterId("bracket:final");

function encounter(
  id: FixtureEncounter["id"],
  round: number,
  home: FixtureEncounter["home"],
  away: FixtureEncounter["away"],
): FixtureEncounter {
  const concrete = home.kind === "team" && away.kind === "team";
  return {
    id,
    stageId: STAGE,
    roundId: asFixtureRoundId(`${STAGE}:round:${round}`),
    order: 1,
    home,
    away,
    scheduledStartAt: new Date("2026-09-14T20:00:00.000Z"),
    officialMatchCount: 1,
    series: concrete
      ? {
          id: `${id}:series`,
          resolutionMode: "independent_matches",
          officialMatches: [{ id: asOfficialMatchSlotId(`${id}:official-match:1`), slot: 1 }],
        }
      : null,
  };
}

const bracket: FixturePlan = {
  id: "bracket",
  revision: 1,
  status: "active",
  generationKey: "bracket",
  generationFingerprint: "bracket",
  organizationId: ORG,
  competitionId: COMPETITION,
  rulesVersion: 1,
  generationVersion: 1,
  format: "knockout",
  timeZone: "America/Lima",
  homeAndAway: false,
  seed: [HOME, AWAY],
  stages: [
    {
      id: STAGE,
      kind: "knockout",
      order: 1,
      rounds: [
        {
          id: asFixtureRoundId(`${STAGE}:round:1`),
          stageId: STAGE,
          number: 1,
          scheduledStartAt: new Date("2026-09-14T20:00:00.000Z"),
          encounters: [
            encounter(ENCOUNTER, 1, { kind: "team", teamId: HOME }, { kind: "team", teamId: AWAY }),
            {
              ...encounter(
                SECOND_ENCOUNTER,
                1,
                { kind: "team", teamId: HOME },
                { kind: "team", teamId: AWAY },
              ),
              order: 2,
            },
          ],
        },
        {
          id: asFixtureRoundId(`${STAGE}:round:2`),
          stageId: STAGE,
          number: 2,
          scheduledStartAt: new Date("2026-09-21T20:00:00.000Z"),
          encounters: [
            encounter(
              FINAL,
              2,
              { kind: "winner", encounterId: SECOND_ENCOUNTER },
              { kind: "winner", encounterId: ENCOUNTER },
            ),
          ],
        },
      ],
    },
  ],
};

const stageRules = {
  officialMatchesPerEncounter: 1 as const,
  resolutionMode: "independent_matches" as const,
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  allowRescheduling: false,
  maxReschedulesPerTeam: 0,
  minimumRescheduleNoticeHours: 0,
  rescheduleProposalExpiryHours: 12,
  rescheduleRequiresOpponentApproval: false,
  rescheduleRequiresOrganizerApproval: false,
};

interface Backend {
  readonly pool: Pool | undefined;
  readonly matches: ProviderMatchRepository;
}

async function seedBracket(backend: Backend) {
  const { matches } = backend;
  await matches.upsertMany([
    { ...providerMatch("m-draw"), home: { ...providerMatch("m-draw").home, goals: 1 } },
    { ...providerMatch("m-away"), home: { ...providerMatch("m-away").home, goals: 0 } },
  ]);
  const { modules } = await seedComposition(backend);
  const draft = await modules.competitions.repository.findById(ORG, COMPETITION);
  if (!draft) throw new Error("competition draft missing");
  await modules.competitions.repository.saveDraft({
    competition: { ...draft.competition, format: "knockout", status: "published" },
    rules: { ...draft.rules, regularStage: stageRules, knockoutStage: stageRules },
  });
  await modules.scheduling.fixturePlans.save(bracket);
  const finalAway = async () => {
    const [plan] = await modules.scheduling.fixturePlans.listActive(ORG, COMPETITION);
    return plan!.stages[0]!.rounds[1]!.encounters[0]!.away;
  };
  const approve = async (externalId: string, encounterId = ENCOUNTER) => {
    const proposed = await modules.officialSelection.propose.execute({
      actorId: HOME_CAPTAIN,
      organizationId: ORG,
      encounterId,
      actingTeamId: HOME,
      selections: slot(externalId),
      expectedVersion: 0,
      commandKey: `propose-${externalId}`,
    });
    if (!proposed.isOk()) throw new Error(`propose failed: ${proposed.error.code}`);
    return modules.officialSelection.confirm.execute({
      actorId: AWAY_CAPTAIN,
      organizationId: ORG,
      encounterId,
      actingTeamId: AWAY,
      proposalId: proposed.value.proposal!.id,
      expectedVersion: 1,
      commandKey: `confirm-${externalId}`,
    });
  };
  return { modules, finalAway, approve };
}

function bracketSuite(backend: () => Promise<Backend>, options: { readonly durable: boolean }) {
  it("advances the winner when the rival confirms and reverts it when the result is voided", async () => {
    const { modules, finalAway, approve } = await seedBracket(await backend());

    const confirmed = await approve("m-1");

    expect(confirmed.isOk() && confirmed.value.selection.status).toBe("approved");
    expect(await finalAway()).toEqual({
      kind: "team",
      teamId: HOME,
      advancedFrom: { kind: "winner", encounterId: ENCOUNTER },
    });

    const voided = await modules.voidOfficialResultAndUnproject.execute({
      actorId: OPERATOR,
      encounterId: ENCOUNTER,
      reason: "Wrong evidence",
    });

    expect(voided.isOk()).toBe(true);
    expect(await finalAway()).toEqual({ kind: "winner", encounterId: ENCOUNTER });
  });

  it("serializes two approvals that feed the same destination", async () => {
    const { modules, approve } = await seedBracket(await backend());
    const advance = modules.scheduling.advanceFixtureFromOfficialResult;
    const execute = advance.execute.bind(advance);
    let secondArrived = () => {};
    const second = new Promise<void>((resolve) => {
      secondArrived = resolve;
    });
    let calls = 0;
    // The first advance waits for the second one; under the competition lock it never arrives.
    const gate = vi.spyOn(advance, "execute").mockImplementation(async (input) => {
      calls += 1;
      if (calls === 1) {
        await Promise.race([second, new Promise((resolve) => setTimeout(resolve, 300))]);
      } else {
        secondArrived();
      }
      return execute(input);
    });
    try {
      const outcomes = await Promise.allSettled([
        approve("m-1"),
        approve("m-away", SECOND_ENCOUNTER),
      ]);

      expect(
        outcomes.map((outcome) => outcome.status === "fulfilled" && outcome.value.isOk()),
      ).toEqual([true, true]);
      expect(await modules.scheduling.encounters.findById(FINAL)).toMatchObject({
        homeTeamId: AWAY,
        awayTeamId: HOME,
      });
    } finally {
      gate.mockRestore();
    }
  });

  it("approves an elimination draw and leaves the destination for organizer review", async () => {
    const { modules, finalAway, approve } = await seedBracket(await backend());

    const confirmed = await approve("m-draw");

    expect(confirmed.isOk() && confirmed.value.selection.status).toBe("approved");
    expect(await modules.results.results.findApprovedByEncounter(ENCOUNTER)).not.toBeNull();
    expect(await finalAway()).toEqual({ kind: "winner", encounterId: ENCOUNTER });
  });

  it("keeps the result when a void would unwind a destination that already has a result", async () => {
    const { modules, approve } = await seedBracket(await backend());
    await approve("m-1");
    await approve("m-away", SECOND_ENCOUNTER);
    expect(await modules.scheduling.encounters.findById(FINAL)).toMatchObject({
      homeTeamId: AWAY,
      awayTeamId: HOME,
    });
    const semifinal = await modules.results.results.findApprovedByEncounter(ENCOUNTER);
    await modules.results.results.append({ ...semifinal!, id: "final-result", encounterId: FINAL });

    const voided = await modules.voidOfficialResultAndUnproject.execute({
      actorId: OPERATOR,
      encounterId: ENCOUNTER,
      reason: "Wrong evidence",
    });

    expect(voided.isErr() && voided.error.code).toBe("scheduling.advancement_not_reversible");
    if (options.durable) {
      expect((await modules.results.results.findApprovedByEncounter(ENCOUNTER))?.status).toBe(
        "approved",
      );
    }
  });
}

describe("fixture advancement composition (real resolver, in-memory stores)", () => {
  bracketSuite(async () => ({ pool: undefined, matches: new InMemoryProviderMatchRepository() }), {
    durable: false,
  });
});

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)("fixture advancement composition on Postgres", () => {
  let isolated: IsolatedSchema;

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "fixture_advance_composition");
    await migrateIsolatedSchema(isolated.pool);
  }, 180_000);

  afterAll(async () => {
    await isolated?.drop();
  }, 180_000);

  bracketSuite(
    async () => {
      const schema = `"${isolated.schema}"`;
      await isolated.pool.query(
        `TRUNCATE ${schema}.organizations, ${schema}.actors, ${schema}.provider_matches RESTART IDENTITY CASCADE`,
      );
      return { pool: isolated.pool, matches: new PostgresProviderMatchRepository(isolated.pool) };
    },
    { durable: true },
  );
});
