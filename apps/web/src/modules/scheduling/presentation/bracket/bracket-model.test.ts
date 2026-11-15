import { describe, expect, it } from "vite-plus/test";
import type { GetCurrentCompetitionFixtureResponse } from "@futrob/api-contracts";
import { competitionFixtureView } from "../competition-fixture-view.ts";
import { competitionFixturePageState } from "../competition-fixture-state.ts";
import {
  BRACKET_GEOMETRY,
  bracketTeamOptions,
  bracketView,
  matchesTeam,
  type BracketStageLayout,
} from "./bracket-model.ts";
import { bracketPageState } from "./bracket-state.ts";
import {
  eightTeamTwoLegs,
  fourTeamKnockout,
  groupsThenKnockout,
  knockoutStage,
  leagueOnly,
  leagueThenPlayoffs,
  noFixture,
  sixTeamsWithByes,
  sixteenTeamKnockout,
  twoTeamFinal,
  uncertainSources,
} from "./bracket.fixtures.ts";

function stagesOf(response: GetCurrentCompetitionFixtureResponse): readonly BracketStageLayout[] {
  const view = competitionFixtureView(response);
  if (!view) throw new Error("fixture expected");
  return bracketView(view)?.stages ?? [];
}

function onlyStage(response: GetCurrentCompetitionFixtureResponse): BracketStageLayout {
  const [stage, ...rest] = stagesOf(response);
  if (!stage || rest.length > 0) throw new Error("exactly one bracket stage expected");
  return stage;
}

const node = (stage: BracketStageLayout, column: number, position: number) => {
  const found = stage.nodes.find((n) => n.columnIndex === column && n.position === position);
  if (!found) throw new Error(`no node at ${column}/${position}`);
  return found;
};

const { nodeWidth, nodeHeight, rowGap, columnGap } = BRACKET_GEOMETRY;

describe("bracketView stage selection", () => {
  it("leaves a pure league without a bracket", () => {
    const view = competitionFixtureView(leagueOnly);
    expect(view && bracketView(view)).toBeNull();
  });

  it("keeps only the knockout stage of groups then knockout", () => {
    const stages = stagesOf(groupsThenKnockout);
    expect(stages.map((stage) => stage.kind)).toEqual(["knockout"]);
  });

  it("draws playoffs after a league", () => {
    expect(stagesOf(leagueThenPlayoffs).map((stage) => stage.kind)).toEqual(["playoffs"]);
  });
});

describe("layoutBracketStage geometry", () => {
  it.each([
    [twoTeamFinal, [1]],
    [fourTeamKnockout, [2, 1]],
    [eightTeamTwoLegs, [4, 2, 1]],
    [sixteenTeamKnockout, [8, 4, 2, 1]],
  ] as const)("lays out one column per round", (response, sizes) => {
    const stage = onlyStage(response);
    expect(stage.columns.map((column) => column.round.encounters.length)).toEqual(sizes);
    expect(stage.columns.map((column) => column.x)).toEqual(
      sizes.map((_, index) => index * (nodeWidth + columnGap)),
    );
    expect(stage.height).toBe((sizes[0] ?? 0) * (nodeHeight + rowGap));
    expect(stage.width).toBe(sizes.length * nodeWidth + (sizes.length - 1) * columnGap);
  });

  it("centres each later Encounter between the two that feed it", () => {
    const stage = onlyStage(sixteenTeamKnockout);
    for (const target of stage.nodes.filter((n) => n.columnIndex > 0)) {
      const feeders = stage.wires
        .filter((wire) => wire.targetId === target.encounter.id)
        .map((wire) => stage.nodes.find((n) => n.encounter.id === wire.sourceId)?.y ?? Number.NaN);
      expect(feeders).toHaveLength(2);
      expect(target.y).toBeCloseTo(((feeders[0] ?? 0) + (feeders[1] ?? 0)) / 2);
    }
  });

  it("marks only the last single Encounter as the final", () => {
    const stage = onlyStage(sixteenTeamKnockout);
    expect(stage.nodes.filter((n) => n.isFinal).map((n) => n.round.name.kind)).toEqual(["final"]);
  });
});

describe("layoutBracketStage connectors", () => {
  it("draws two lines into every later Encounter of a full draw", () => {
    const stage = onlyStage(sixteenTeamKnockout);
    expect(stage.wires).toHaveLength(14);
    expect(stage.unlinkedWinnerCount).toBe(0);
  });

  it("joins the source's right edge to the target's left edge through the column gap", () => {
    const stage = onlyStage(fourTeamKnockout);
    const semifinal = node(stage, 0, 2);
    const final = node(stage, 1, 1);
    const wire = stage.wires.find((w) => w.sourceId === semifinal.encounter.id);
    expect(wire).toMatchObject({ targetId: final.encounter.id, side: "away" });
    expect(wire?.path).toBe(
      `M${nodeWidth} ${semifinal.y} H${final.x - columnGap / 2} V${final.y} H${final.x}`,
    );
  });

  it("follows the fixture's sources even when they are not the adjacent pair", () => {
    const view = competitionFixtureView({
      ...fourTeamKnockout,
      fixture: fourTeamKnockout.fixture && {
        ...fourTeamKnockout.fixture,
        stages: [
          knockoutStage({
            stageId: "crossed",
            stageOrder: 1,
            opening: [
              [
                { kind: "team", teamId: "team-1" },
                { kind: "team", teamId: "team-2" },
              ],
              [
                { kind: "team", teamId: "team-3" },
                { kind: "team", teamId: "team-4" },
              ],
            ],
            override: (round, order, side) =>
              round === 2 && order === 1
                ? {
                    kind: "winner",
                    encounterId: `crossed:round:1:encounter:${side === "home" ? 2 : 1}`,
                  }
                : undefined,
          }),
        ],
      },
    });
    const stage = view && bracketView(view)?.stages[0];
    expect(stage?.wires.map((wire) => [wire.side, wire.sourceId])).toEqual([
      ["home", "crossed:round:1:encounter:2"],
      ["away", "crossed:round:1:encounter:1"],
    ]);
  });

  it("draws no line for an advanced Team or a source outside the fixture", () => {
    const stage = onlyStage(uncertainSources);
    const semifinal1 = node(stage, 1, 1);
    const semifinal2 = node(stage, 1, 2);
    expect(stage.wires.filter((w) => w.targetId === semifinal1.encounter.id)).toEqual([
      expect.objectContaining({ side: "away" }),
    ]);
    expect(stage.wires.filter((w) => w.targetId === semifinal2.encounter.id)).toEqual([
      expect.objectContaining({ side: "home" }),
    ]);
    expect(semifinal2.encounter.away).toEqual({ kind: "winner", from: null });
    expect(stage.unlinkedWinnerCount).toBe(1);
    expect(stage.wires).toHaveLength(4);
  });

  it("draws nothing into a draw that starts from group places", () => {
    const stage = onlyStage(groupsThenKnockout);
    expect(stage.wires.map((wire) => wire.targetId)).toEqual([
      stage.nodes[2]?.encounter.id,
      stage.nodes[2]?.encounter.id,
    ]);
  });
});

describe("layoutBracketStage counts", () => {
  it("counts byes without treating them as played", () => {
    const stage = onlyStage(sixTeamsWithByes);
    expect(stage.byeCount).toBe(2);
    expect(stage.encounterCount).toBe(7);
    expect(stage.wires).toHaveLength(6);
  });

  it("counts two-leg Encounters", () => {
    const stage = onlyStage(eightTeamTwoLegs);
    expect(stage.twoLegCount).toBe(6);
  });
});

describe("team filter", () => {
  const bracket = (() => {
    const view = competitionFixtureView(sixteenTeamKnockout);
    const result = view && bracketView(view);
    if (!result) throw new Error("bracket expected");
    return result;
  })();

  it("offers only named Teams the draw places", () => {
    const options = bracketTeamOptions(bracket, "es");
    expect(options).toHaveLength(16);
    expect(options[0]?.name).toBe("Atlético Brasa");
  });

  it("keeps every Encounter with no Team chosen and only the Team's otherwise", () => {
    const encounters = bracket.stages[0]?.nodes.map((n) => n.encounter) ?? [];
    expect(encounters.filter((e) => matchesTeam(e, null))).toHaveLength(15);
    expect(encounters.filter((e) => matchesTeam(e, "team-1"))).toHaveLength(1);
  });
});

describe("bracketPageState", () => {
  const retry = () => undefined;
  const fixtureState = (data: GetCurrentCompetitionFixtureResponse | undefined, failed = false) =>
    bracketPageState(competitionFixturePageState({ data, failed, refused: false, retry }));

  it("separates no fixture from a fixture without knockout", () => {
    expect(fixtureState(noFixture).kind).toBe("empty");
    expect(fixtureState(leagueOnly).kind).toBe("no_bracket");
    expect(fixtureState(sixteenTeamKnockout).kind).toBe("ready");
  });

  it("keeps the last draw when a refresh fails", () => {
    expect(fixtureState(sixteenTeamKnockout, true)).toMatchObject({
      kind: "ready",
      refreshFailed: true,
    });
  });

  it("passes loading, refusal and error through", () => {
    expect(fixtureState(undefined).kind).toBe("loading");
    expect(fixtureState(undefined, true).kind).toBe("error");
    expect(
      bracketPageState(
        competitionFixturePageState({ data: undefined, failed: true, refused: true, retry }),
      ).kind,
    ).toBe("not_found");
  });
});
