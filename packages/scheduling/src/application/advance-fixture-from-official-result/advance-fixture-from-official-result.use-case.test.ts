import {
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type EncounterId,
  type TeamId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type {
  FixtureEncounter,
  FixtureGenerationSpec,
  FixturePlan,
  SeriesResolutionMode,
} from "../../domain/entities/fixture-plan.ts";
import type { CompetitionFixtureSourceSnapshot } from "../../domain/ports/fixture-plan.repository.ts";
import type { OfficialEncounterScore } from "../../domain/ports/official-encounter-score-reader.port.ts";
import { findEncounter } from "../../domain/policies/edit-fixture-encounter.ts";
import { generateFixturePlan } from "../../domain/policies/generate-fixture-plan.ts";
import { FixturePlans, Matches, Snapshots } from "../generate-competition-fixture.test-harness.ts";
import { AdvanceFixtureFromOfficialResultUseCase } from "./advance-fixture-from-official-result.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const [teamA, teamB, teamC, teamD] = ["a", "b", "c", "d"].map((id) => asTeamId(`team-${id}`)) as [
  TeamId,
  TeamId,
  TeamId,
  TeamId,
];

function setup(options: {
  readonly format: FixtureGenerationSpec["format"];
  readonly seed: readonly TeamId[];
  readonly knockoutMatches?: 1 | 2;
  readonly knockoutMode?: SeriesResolutionMode;
  readonly groups?: FixtureGenerationSpec["groups"];
}) {
  const knockoutMode = options.knockoutMode ?? "aggregate_score";
  const generated = generateFixturePlan({
    organizationId,
    competitionId,
    generationVersion: 1,
    rulesVersion: 1,
    format: options.format,
    timeZone: "America/Lima",
    startsAt: new Date("2026-11-01T01:00:00.000Z"),
    roundIntervalDays: 7,
    officialMatchCounts: { regular: 1, knockout: options.knockoutMatches ?? 2 },
    resolutionModes: { regular: "independent_matches", knockout: knockoutMode },
    seed: options.seed,
    homeAndAway: false,
    ...(options.groups ? { groups: options.groups } : {}),
  });
  const fixtures = new FixturePlans();
  fixtures.rows.set(generated.id, generated);
  const scores = new Map<EncounterId, OfficialEncounterScore>();
  const selections = new Set<EncounterId>();
  const encounters = new Snapshots();
  const source: CompetitionFixtureSourceSnapshot = {
    organizationId,
    competitionId,
    status: "published",
    format: options.format,
    timeZone: "America/Lima",
    rulesVersion: 1,
    officialMatchCounts: { regular: 1, knockout: options.knockoutMatches ?? 2 },
    resolutionModes: { regular: "independent_matches", knockout: knockoutMode },
    standingPoints: { winPoints: 3, drawPoints: 1, lossPoints: 0 },
    approvedParticipants: [...options.seed],
  };
  const useCase = new AdvanceFixtureFromOfficialResultUseCase({
    clock: { now: () => new Date("2026-11-10T00:00:00.000Z") },
    editGuard: {
      canEdit: async ({ encounterId }) => !scores.has(encounterId) && !selections.has(encounterId),
    },
    encounters,
    fixtures,
    matches: new Matches(),
    scores: { listApproved: async () => scores },
    source: { load: async () => source },
  });
  const occupancy = {
    hasApprovedOfficialResult: async (ids: readonly EncounterId[]) =>
      ids.some((id) => scores.has(id)),
  };

  const plan = (): FixturePlan => fixtures.rows.get(generated.id)!;
  const encounter = (id: EncounterId): FixtureEncounter => findEncounter(plan(), id)!;
  const stageRounds = (stageIndex: number) => plan().stages[stageIndex]!.rounds;
  const approve = (id: EncounterId, ...slots: readonly (readonly [number, number])[]) => {
    scores.set(id, {
      officialResultId: `result:${id}`,
      revision: 1,
      slots: slots.map(([homeGoals, awayGoals], index) => ({
        officialSlot: index === 0 ? 1 : 2,
        homeGoals,
        awayGoals,
      })),
    });
  };
  const advance = (encounterId: EncounterId) =>
    useCase.execute({ organizationId, competitionId, encounterId });

  return {
    approve,
    advance,
    encounter,
    encounters,
    occupancy,
    plan,
    scores,
    selections,
    stageRounds,
  };
}

function knockout(options: Omit<Parameters<typeof setup>[0], "format" | "seed"> = {}) {
  const fixture = setup({ format: "knockout", seed: [teamA, teamB, teamC, teamD], ...options });
  const [opening, final] = fixture.stageRounds(0);
  const [semiOne, semiTwo] = opening!.encounters;
  return {
    ...fixture,
    semiOne: semiOne!.id,
    semiTwo: semiTwo!.id,
    final: final!.encounters[0]!.id,
  };
}

describe("AdvanceFixtureFromOfficialResultUseCase", () => {
  it("advance-knockout-winner-slot: fills the next round slot with the aggregate winner", async () => {
    const { approve, advance, encounter, encounters, semiTwo, final } = knockout();
    expect(encounter(semiTwo).home).toEqual({ kind: "team", teamId: teamB });
    expect(encounter(final).away).toEqual({ kind: "winner", encounterId: semiTwo });

    approve(semiTwo, [2, 1], [1, 1]);
    const outcome = await advance(semiTwo);

    expect(outcome.isOk() && outcome.value.changedEncounterIds).toEqual([final]);
    expect(encounter(final).away).toEqual({
      kind: "team",
      teamId: teamB,
      advancedFrom: { kind: "winner", encounterId: semiTwo },
    });
    expect(encounter(final).home.kind).toBe("winner");
    expect(encounter(final).series).toBeNull();
    expect(await encounters.findById(final)).toBeNull();
  });

  it("projects the destination once both of its slots are advanced", async () => {
    const { approve, advance, encounter, encounters, semiOne, semiTwo, final } = knockout();
    approve(semiOne, [0, 2], [1, 0]);
    approve(semiTwo, [3, 0], [0, 0]);

    await advance(semiOne);
    await advance(semiTwo);

    const destination = encounter(final);
    expect(destination.series?.officialMatches.map((match) => match.slot)).toEqual([1, 2]);
    expect(await encounters.findById(final)).toMatchObject({
      homeTeamId: teamD,
      awayTeamId: teamB,
      officialMatchCount: 2,
    });
  });

  it("repeating the advance converges without another write", async () => {
    const { approve, advance, plan, semiTwo } = knockout();
    approve(semiTwo, [2, 0], [0, 0]);
    await advance(semiTwo);
    const afterFirst = plan();

    const repeated = await advance(semiTwo);

    expect(repeated.isOk() && repeated.value.changedEncounterIds).toEqual([]);
    expect(plan()).toEqual(afterFirst);
  });

  it("advance-league-no-bracket-write: a league approval mutates no fixture slot", async () => {
    const { approve, advance, plan, encounters } = setup({
      format: "league",
      seed: [teamA, teamB, teamC, teamD],
    });
    const before = plan();
    const played = before.stages[0]!.rounds[0]!.encounters[0]!.id;
    approve(played, [4, 0]);

    const outcome = await advance(played);

    expect(outcome.isOk() && outcome.value.changedEncounterIds).toEqual([]);
    expect(plan()).toEqual(before);
    expect(encounters.rows.size).toBe(0);
  });

  it("advance-bye-untouched: a bye stays a bye with no fabricated score", async () => {
    const { approve, advance, encounter, encounters, scores, stageRounds } = setup({
      format: "knockout",
      seed: [teamA, teamB, teamC],
    });
    const [opening, final] = stageRounds(0);
    const [byeEncounter, played] = opening!.encounters;
    expect(byeEncounter!.home).toEqual({ kind: "bye" });

    approve(played!.id, [1, 0], [1, 0]);
    await advance(played!.id);

    expect(encounter(byeEncounter!.id)).toEqual(byeEncounter);
    expect(scores.has(byeEncounter!.id)).toBe(false);
    expect(await encounters.findById(byeEncounter!.id)).toBeNull();
    expect(encounter(final!.encounters[0]!.id)).toMatchObject({
      home: { kind: "team", teamId: teamC },
      away: { kind: "team", teamId: teamA },
    });
  });

  it("advance-aggregate-not-match-wins: aggregate goals decide, not official matches won", async () => {
    const { approve, advance, encounter, semiTwo, final } = knockout();
    expect(encounter(semiTwo)).toMatchObject({
      home: { kind: "team", teamId: teamB },
      away: { kind: "team", teamId: teamC },
    });
    approve(semiTwo, [0, 1], [3, 0]);

    await advance(semiTwo);

    expect(encounter(final).away).toMatchObject({ kind: "team", teamId: teamB });
  });

  it("unadvance-after-void: restores the winner placeholder", async () => {
    const { approve, advance, encounter, occupancy, scores, semiTwo, final } = knockout();
    approve(semiTwo, [2, 0], [0, 0]);
    await advance(semiTwo);

    scores.delete(semiTwo);
    const outcome = await advance(semiTwo);

    expect(outcome.isOk()).toBe(true);
    expect(encounter(final).away).toEqual({ kind: "winner", encounterId: semiTwo });
    expect(await occupancy.hasApprovedOfficialResult([semiTwo])).toBe(false);
  });

  it("removes the destination from the schedule when a void makes it a placeholder again", async () => {
    const { approve, advance, encounters, scores, semiOne, semiTwo, final } = knockout();
    approve(semiOne, [2, 0], [0, 0]);
    approve(semiTwo, [2, 0], [0, 0]);
    await advance(semiOne);
    await advance(semiTwo);

    scores.delete(semiOne);
    await advance(semiOne);

    expect(await encounters.findById(final)).toBeNull();
  });

  it("refuses to unadvance a destination that already has a selection", async () => {
    const { approve, advance, plan, scores, selections, semiOne, semiTwo, final } = knockout();
    approve(semiOne, [2, 0], [0, 0]);
    approve(semiTwo, [2, 0], [0, 0]);
    await advance(semiOne);
    await advance(semiTwo);
    selections.add(final);
    const before = plan();

    scores.delete(semiOne);
    const outcome = await advance(semiOne);

    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.advancement_not_reversible");
    expect(plan()).toEqual(before);
  });

  it("advance-tie-organizer-review: an elimination draw writes no slot", async () => {
    const { approve, advance, plan, semiTwo } = knockout({
      knockoutMatches: 1,
      knockoutMode: "independent_matches",
    });
    const before = plan();
    approve(semiTwo, [1, 1]);

    const outcome = await advance(semiTwo);

    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.tie_requires_organizer_review");
    expect(plan()).toEqual(before);
  });

  it("fills group-rank slots only after every Encounter of the group is approved", async () => {
    const { approve, advance, encounter, stageRounds } = setup({
      format: "groups-knockout",
      seed: [teamA, teamB, teamC, teamD],
      groups: { count: 1, qualifiersPerGroup: 2 },
    });
    const strength = [teamA, teamB, teamC, teamD];
    const groupEncounters = stageRounds(0).flatMap((round) => round.encounters);
    const approveByStrength = (played: FixtureEncounter) => {
      const { home, away } = played;
      if (home.kind !== "team" || away.kind !== "team") throw new Error("group slot is not a Team");
      approve(
        played.id,
        strength.indexOf(home.teamId) < strength.indexOf(away.teamId) ? [2, 0] : [0, 2],
      );
    };
    const final = stageRounds(1)[0]!.encounters[0]!;
    const [last, ...earlier] = groupEncounters;
    earlier.forEach(approveByStrength);

    await advance(earlier[0]!.id);
    expect(encounter(final.id)).toEqual(final);

    approveByStrength(last!);
    await advance(last!.id);
    const qualified = encounter(final.id);
    expect([qualified.home, qualified.away]).toEqual([
      { kind: "team", teamId: teamA, advancedFrom: final.home },
      { kind: "team", teamId: teamB, advancedFrom: final.away },
    ]);
  });

  it("sends a group tied on points, goal difference and goals to organizer review", async () => {
    const { approve, advance, plan, stageRounds } = setup({
      format: "groups-knockout",
      seed: [teamA, teamB, teamC, teamD],
      groups: { count: 2, qualifiersPerGroup: 1 },
    });
    const groupOne = stageRounds(0)
      .flatMap((round) => round.encounters)
      .find((candidate) => candidate.groupId === "group-1")!;
    const before = plan();
    approve(groupOne.id, [1, 1]);

    const outcome = await advance(groupOne.id);

    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.tie_requires_organizer_review");
    expect(plan()).toEqual(before);
  });
});
