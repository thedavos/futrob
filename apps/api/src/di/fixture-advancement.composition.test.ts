import type { FixtureEncounter, FixturePlan } from "@futrob/scheduling";
import { asFixtureRoundId, asFixtureStageId } from "@futrob/scheduling";
import { asEncounterId, asOfficialMatchSlotId, asTeamId } from "@futrob/shared-kernel";
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

const NEW = asTeamId("team-new");
const BYE_SEMIFINAL = asEncounterId("bracket:bye-semifinal");
const BYE_FINAL = asEncounterId("bracket:bye-final");

/** NEW reaches the final through a bye; the final's rival comes from ENCOUNTER. */
const byeBracket: FixturePlan = {
  ...bracket,
  id: "bye-bracket",
  generationKey: "bye-bracket",
  seed: [HOME, AWAY, NEW],
  stages: [
    {
      ...bracket.stages[0]!,
      rounds: [
        {
          ...bracket.stages[0]!.rounds[0]!,
          encounters: [
            encounter(ENCOUNTER, 1, { kind: "team", teamId: HOME }, { kind: "team", teamId: AWAY }),
            {
              ...encounter(BYE_SEMIFINAL, 1, { kind: "team", teamId: NEW }, { kind: "bye" }),
              order: 2,
            },
          ],
        },
        {
          ...bracket.stages[0]!.rounds[1]!,
          encounters: [
            encounter(
              BYE_FINAL,
              2,
              { kind: "winner", encounterId: BYE_SEMIFINAL },
              { kind: "winner", encounterId: ENCOUNTER },
            ),
          ],
        },
      ],
    },
  ],
};

interface Backend {
  readonly pool: Pool | undefined;
  readonly matches: ProviderMatchRepository;
}

async function seedBracket(backend: Backend, plan: FixturePlan = bracket) {
  const { matches } = backend;
  await matches.upsertMany([
    {
      ...providerMatch("m-nh"),
      home: { ...providerMatch("m-nh").home, externalClubId: "new-club", name: "New" },
      away: { ...providerMatch("m-nh").away, externalClubId: "club-home", name: "Home" },
    },
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
  await modules.teams.repositories.teams.save({
    id: NEW,
    organizationId: ORG,
    name: "New",
    createdAt: new Date("2026-09-14T00:00:00.000Z"),
    createdByActorId: OPERATOR,
    creationKey: null,
  });
  await modules.competitions.entryRepository.save({
    id: `entry-${NEW}`,
    organizationId: ORG,
    competitionId: COMPETITION,
    teamId: NEW,
    status: "approved",
    createdAt: new Date("2026-09-14T00:00:00.000Z"),
    creationKey: null,
  });
  await modules.teams.externalClubConnections.upsert({
    teamId: NEW,
    providerKey: "ea-clubs",
    externalClubId: "new-club",
    externalClubName: "New",
    gameEdition: "FC 26",
    platform: "common-gen5",
  });
  await modules.scheduling.fixturePlans.save(plan);
  const finalAway = async () => {
    const [plan] = await modules.scheduling.fixturePlans.listActive(ORG, COMPETITION);
    return plan!.stages[0]!.rounds[1]!.encounters[0]!.away;
  };
  const approve = async (externalId: string, encounterId = ENCOUNTER) => {
    const version = (await modules.results.selections.findLatestByEncounter(encounterId))?.version;
    const expectedVersion = version ?? 0;
    const proposed = await modules.officialSelection.propose.execute({
      actorId: HOME_CAPTAIN,
      organizationId: ORG,
      encounterId,
      actingTeamId: HOME,
      selections: slot(externalId),
      expectedVersion,
      commandKey: `propose-${externalId}`,
    });
    if (!proposed.isOk()) throw new Error(`propose failed: ${proposed.error.code}`);
    return modules.officialSelection.confirm.execute({
      actorId: AWAY_CAPTAIN,
      organizationId: ORG,
      encounterId,
      actingTeamId: AWAY,
      proposalId: proposed.value.proposal!.id,
      expectedVersion: proposed.value.selection.version,
      commandKey: `confirm-${externalId}`,
    });
  };
  return { modules, finalAway, approve };
}

function eligible(
  associations: readonly {
    readonly eligible: boolean;
    readonly providerMatchRef: { readonly externalId: string };
  }[],
): string[] {
  return associations.filter((row) => row.eligible).map((row) => row.providerMatchRef.externalId);
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

  it("never leaves an active selection on a destination that a void removes", async () => {
    const { modules, approve } = await seedBracket(await backend(), byeBracket);
    await approve("m-1");
    expect(await modules.scheduling.encounters.findById(BYE_FINAL)).toMatchObject({
      homeTeamId: NEW,
      awayTeamId: HOME,
    });
    expect(eligible(await modules.results.associations.listByEncounter(ORG, BYE_FINAL))).toEqual([
      "m-nh",
    ]);

    let paused = () => {};
    const removing = new Promise<void>((resolve) => {
      paused = resolve;
    });
    let resume = () => {};
    const resumed = new Promise<void>((resolve) => {
      resume = resolve;
    });
    const encounters = modules.scheduling.encounters;
    const deleteSnapshots = encounters.deleteByEncounterIds.bind(encounters);
    const gate = vi.spyOn(encounters, "deleteByEncounterIds").mockImplementation(async (ids) => {
      if (ids.includes(BYE_FINAL)) {
        paused();
        await resumed;
      }
      return deleteSnapshots(ids);
    });
    try {
      const voiding = modules.voidOfficialResultAndUnproject.execute({
        actorId: OPERATOR,
        encounterId: ENCOUNTER,
        reason: "Wrong evidence",
      });
      await removing;
      // Started from the test body, outside the void's transaction context.
      const proposing = modules.officialSelection.propose.execute({
        actorId: HOME_CAPTAIN,
        organizationId: ORG,
        encounterId: BYE_FINAL,
        actingTeamId: HOME,
        selections: slot("m-nh"),
        expectedVersion: 0,
        commandKey: "propose-during-void",
      });
      await Promise.race([proposing, new Promise((resolve) => setTimeout(resolve, 300))]);
      resume();
      const [voided, proposed] = await Promise.all([voiding, proposing]);

      expect(voided.isOk()).toBe(true);
      expect(proposed.isOk()).toBe(false);
      expect(await modules.scheduling.encounters.findById(BYE_FINAL)).toBeNull();
      expect(await modules.results.selections.findLatestByEncounter(BYE_FINAL)).toBeNull();
    } finally {
      gate.mockRestore();
    }
  });

  it("rejects a candidate of the previous rival once the destination is rebuilt", async () => {
    const { modules, approve } = await seedBracket(await backend(), byeBracket);
    await approve("m-1");
    await modules.results.associateEncounterCandidates.execute({
      organizationId: ORG,
      encounterId: BYE_FINAL,
    });
    expect(eligible(await modules.results.associations.listByEncounter(ORG, BYE_FINAL))).toEqual([
      "m-nh",
    ]);

    const voided = await modules.voidOfficialResultAndUnproject.execute({
      actorId: OPERATOR,
      encounterId: ENCOUNTER,
      reason: "Wrong evidence",
    });
    expect(voided.isOk()).toBe(true);
    const corrected = await approve("m-away");
    expect(corrected.isOk() && corrected.value.selection.status).toBe("approved");
    expect(await modules.scheduling.encounters.findById(BYE_FINAL)).toMatchObject({
      homeTeamId: NEW,
      awayTeamId: AWAY,
    });

    const stale = await modules.officialSelection.propose.execute({
      actorId: AWAY_CAPTAIN,
      organizationId: ORG,
      encounterId: BYE_FINAL,
      actingTeamId: AWAY,
      selections: slot("m-nh"),
      expectedVersion: 0,
      commandKey: "propose-stale-candidate",
    });

    expect(stale.isOk()).toBe(false);
    expect(await modules.results.selections.findLatestByEncounter(BYE_FINAL)).toBeNull();
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
