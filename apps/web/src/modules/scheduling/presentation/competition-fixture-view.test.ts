import { describe, expect, it } from "vite-plus/test";
import { competitionFixtureView } from "./competition-fixture-view.ts";
import { groupsKnockoutFixture, noFixture, swissFixture } from "./competition-fixture.fixtures.ts";

describe("competitionFixtureView of a Swiss plan", () => {
  const view = competitionFixtureView(swissFixture);
  const rounds = view?.stages[0]?.rounds ?? [];

  it("names rounds by number, not by how many encounters they hold", () => {
    expect(rounds.map((round) => [round.name, round.encounters.length])).toEqual([
      [{ kind: "round", number: 1 }, 3],
      [{ kind: "round", number: 2 }, 2],
      [{ kind: "round", number: 3 }, 0],
      [{ kind: "round", number: 4 }, 0],
    ]);
  });

  it("tells a match, a closed encounter and a bye apart", () => {
    expect(rounds[0]?.encounters.map((encounter) => encounter.kind)).toEqual([
      "match",
      "closed",
      "bye",
    ]);
  });

  it("marks a withdrawn Team wherever the plan places it", () => {
    expect(rounds[0]?.encounters[0]?.away).toEqual({
      kind: "team",
      teamId: "team-norte",
      name: "Norte Athletic",
      withdrawn: true,
    });
    expect(rounds[0]?.encounters[0]?.home).toMatchObject({ withdrawn: false });
  });

  it("derives progress and who can still withdraw from the plan alone", () => {
    expect(view?.swiss).toEqual({
      fixturePlanId: "fixture-1",
      roundsTotal: 4,
      roundsPaired: 2,
      currentRoundNumber: 2,
      withdrawable: [
        { teamId: "team-cuervos", name: "Cuervos FC" },
        { teamId: "team-maderas", name: "Maderas FC" },
        { teamId: "team-halcones", name: "Club Atlético Halcones del Pacífico" },
        { teamId: "team-sur", name: "Sur United" },
      ],
      withdrawn: [{ teamId: "team-norte", name: "Norte Athletic" }],
    });
  });

  it("has no Swiss summary in other formats", () => {
    expect(competitionFixtureView(groupsKnockoutFixture)?.swiss).toBeNull();
  });

  it("treats a knockout bye as a bye too", () => {
    const fixture = groupsKnockoutFixture.fixture!;
    const stage = fixture.stages[1]!;
    const round = stage.rounds[0]!;
    const knockout = competitionFixtureView({
      ...groupsKnockoutFixture,
      fixture: {
        ...fixture,
        stages: [
          {
            ...stage,
            rounds: [
              { ...round, encounters: [{ ...round.encounters[0]!, away: { kind: "bye" } }] },
            ],
          },
        ],
      },
    });
    expect(knockout?.stages[0]?.rounds[0]?.encounters[0]?.kind).toBe("bye");
  });
});

describe("competitionFixtureView", () => {
  it("has nothing to list before a fixture is generated", () => {
    expect(competitionFixtureView(noFixture)).toBeNull();
  });

  it("groups Encounters by stage and round in fixture order", () => {
    const view = competitionFixtureView(groupsKnockoutFixture);

    expect(
      view?.stages.map((stage) => ({
        kind: stage.kind,
        rounds: stage.rounds.map((round) => [round.name, round.encounters.length]),
      })),
    ).toEqual([
      {
        kind: "groups",
        rounds: [
          [{ kind: "matchday", number: 1 }, 2],
          [{ kind: "matchday", number: 2 }, 2],
        ],
      },
      {
        kind: "knockout",
        rounds: [
          [{ kind: "semifinal" }, 2],
          [{ kind: "final" }, 1],
        ],
      },
    ]);
  });

  it("names each side from what the fixture knows today", () => {
    const view = competitionFixtureView(groupsKnockoutFixture);
    const [groups, knockout] = view?.stages ?? [];
    const opening = groups?.rounds[0]?.encounters;
    const final = knockout?.rounds[1]?.encounters[0];

    expect(opening?.map((encounter) => [encounter.group, encounter.home, encounter.away])).toEqual([
      [
        "A",
        { kind: "team", teamId: "team-cuervos", name: "Cuervos FC", withdrawn: false },
        { kind: "team", teamId: "team-maderas", name: "Maderas FC", withdrawn: false },
      ],
      [
        "B",
        {
          kind: "team",
          teamId: "team-halcones",
          name: "Club Atlético Halcones del Pacífico",
          withdrawn: false,
        },
        { kind: "team", teamId: "team-gone", name: null, withdrawn: false },
      ],
    ]);
    expect(knockout?.rounds[0]?.encounters[0]?.home).toEqual({
      kind: "groupRank",
      group: "A",
      rank: 1,
    });
    expect([final?.home, final?.away]).toEqual([
      { kind: "winner", from: { round: { kind: "semifinal" }, order: 1 } },
      { kind: "winner", from: { round: { kind: "semifinal" }, order: 2 } },
    ]);
  });

  it("keeps a bye and a league rank as open slots, not Teams", () => {
    const fixture = groupsKnockoutFixture.fixture!;
    const view = competitionFixtureView({
      ...groupsKnockoutFixture,
      fixture: {
        ...fixture,
        format: "league-playoffs",
        stages: [
          { ...fixture.stages[0]!, kind: "league" },
          {
            ...fixture.stages[1]!,
            kind: "playoffs",
            rounds: [
              {
                ...fixture.stages[1]!.rounds[0]!,
                encounters: [
                  {
                    ...fixture.stages[1]!.rounds[0]!.encounters[0]!,
                    home: { kind: "stage-rank", stageId: fixture.stages[0]!.id, rank: 1 },
                    away: { kind: "bye" },
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    const playoff = view?.stages[1]?.rounds[0];

    expect(playoff?.name).toEqual({ kind: "final" });
    expect([playoff?.encounters[0]?.home, playoff?.encounters[0]?.away]).toEqual([
      { kind: "stageRank", stage: "league", rank: 1 },
      { kind: "bye" },
    ]);
  });
});
